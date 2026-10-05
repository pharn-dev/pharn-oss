---
name: ac-tests
trust: trusted
layer: pharn-contracts
purpose: "Single source of truth for a feature's Acceptance-Criteria tests written BEFORE the build: the AC-TESTS.md mapping /pharn-plan writes and /pharn-test is scoped by, the rules pharn/floor/check-ac-tests.mjs enforces over it, the red run that shows each AC's test fails before the build (pharn/floor/check-red-run.mjs), the AC-TESTS.lock.json pharn/floor/ac-tests-lock.mjs writes to pin the tests and record that evidence — or, for a spec_kind: test-infra SPEC, a bootstrap lock — and the test-stage gate (pharn/floor/check-test-stage.mjs) /pharn-build, /pharn-ship, /pharn-loop and check-loop-fresh.mjs read. Schema only, zero behavior (P3, pharn/ARCHITECTURE.md §4)."
---

# Contract — ac-tests

> A `pharn-contracts` schema (zero behavior, no `role:` — it is not a Capability). Enforcers **cite** it and
> **conform** to it; they do not restate its semantics (P4).

## Why it exists

Acceptance Criteria are phrased testably (`spec-template.md`, the AC grammar), but if the build writes their tests
it can write tests that fit its own implementation. So the tests are written **before** the build, by `/pharn-test`,
from the Approved SPEC, the PLAN and a mapping, and the build may not modify them. This contract defines that
mapping and the lock that pins the result.

**Honest trigger (P7):** the maintainer's decision (the AC-delivery queue), not a dogfood failure. Since 6.18.0 the
stage also RUNS the tests it writes, before the build, and requires each to fail (the red run, below). Since 6.19.0
`/pharn-ship` and `/pharn-loop` run it between `/pharn-grill` and `/pharn-build`, and the build refuses without it
(the test-stage gate, below).

## `pharn/features/<name>/AC-TESTS.md` — the mapping

Written by `/pharn-plan` (Step 4c) for a SPEC that carries `spec_template`. A legacy SPEC has no AC ids and gets no
mapping, and neither does a `spec_kind: test-infra` SPEC (bootstrap, below).

```markdown
---
spec_id: <name>
spec_content_hash: <the SPEC's pinned hash — the same value PLAN.md carries>
---

## Files

- `tests/ac/reset.unit.test.ts` — the tests for AC-1

## Mapping

- AC-1 | unit | `tests/ac/reset.unit.test.ts` | src/reset.ts#resetPassword(token: string): Promise<void>
```

- **Frontmatter:** `spec_id` and `spec_content_hash`, exactly the fields `check-plan-spec-agree.mjs` reads, so the
  mapping is bound to the current Approved SPEC by the same checker that binds PLAN.md. Every reader — the chain
  check, `check-spec.mjs`, the lock — reads a field with `readField` in `frontmatter-core.mjs` (6.20.5): the
  **last** copy of a duplicated key wins, and a quote is resolved before an inline comment (a whitespace-preceded
  `#`) is stripped.
  Nothing refuses the duplicate itself; what changed is that no reader takes a different copy.
- **`## Files`:** exactly the test files, one back-tick path per list item. It is `/pharn-test`'s writes-scope
  (`set-writes-scope.cjs --from-plan AC-TESTS.md`), read by the same `## Files` rule as a PLAN
  (`plan-files-core.mjs`, held to the setter by a parity test).
- **`## Mapping`:** one line per AC, matching

  ```text
  ^- (AC-[1-9][0-9]*) \| (unit|integration|e2e) \| `([^`\s](?:[^`]*[^`\s])?)` \| (\S.*)$
  ```

  The id and level come from the SPEC; the file is a `## Files` entry, spelled **byte-for-byte** as that entry is
  scoped (after the setter's `clean`) — no whitespace at either edge of the cell (6.20.5), and no difference in letter
  case or Unicode form, because the runner, the red run and the AC gate use the cell verbatim. A cell that matched
  only after folding was never collected; it is now `unlisted-file`, whose detail names the entry to copy. The **public target** is the interface the
  test drives: a URL plus a visible role or text for `e2e`, a route plus method for `integration`, a module path,
  export and signature for `unit`. A unit test written first needs that interface decided before the build, which
  is why the target is the plan's job. The floor checks the target only for presence.

**Why a separate file:** the setter reads a file's first `## Files`, so the test files cannot live in PLAN.md
without joining the build's scope, and a second extractor would mean editing a protected hook.

## The checker — `check-ac-tests.mjs <AC-TESTS.md> <SPEC.md> <PLAN.md> [--features-dir <dir>]`

| kind                | RED when                                                                                                                                                                                |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `legacy-spec`       | the SPEC has no `spec_template` (checked first; exits **1** like every kind here — exit **3** is `--spec` mode's)                                                                       |
| `pin`               | `check-plan-spec-agree.mjs <AC-TESTS.md> <SPEC.md>` REDs: exit 1 with its `RED —` line (Draft, drifted, stale or mislabeled); a crash is no verdict (below)                             |
| `spec-kind`         | the SPEC's `spec_kind` is outside `TEST_FIRST_KINDS` — e.g. `test-infra` (a bootstrap increment has no mapping) — or it is invalid, or its body opens with a `spec_kind:` line (6.20.7) |
| `malformed-line`    | a non-blank line under `## Mapping` does not match, or there is no `## Mapping`                                                                                                         |
| `missing-ac`        | a SPEC AC has no mapping line, or the SPEC's Acceptance Criteria section is absent or duplicated                                                                                        |
| `duplicate-ac`      | an AC has more than one mapping line                                                                                                                                                    |
| `unknown-ac`        | a mapped id is not a SPEC AC                                                                                                                                                            |
| `level-mismatch`    | a mapped level differs from the SPEC's `verify:` level                                                                                                                                  |
| `unlisted-file`     | a mapped file is not in `## Files`                                                                                                                                                      |
| `unmapped-file`     | a `## Files` entry is mapped by no line                                                                                                                                                 |
| `in-plan-files`     | a test file is in PLAN.md `## Files`, so the build would be scoped to it                                                                                                                |
| `claimed-elsewhere` | another feature's AC-TESTS.md `## Files` already names the file                                                                                                                         |
| `no-files`          | there is no `## Files`, or it names nothing                                                                                                                                             |
| `bad-path`          | a `## Files` entry is a placeholder or glob, absolute, led by `-`, not normalized, or under `.pharn/` or `pharn/features/`                                                              |

**One more kind, since 6.36.0 — `level-excluded`:** a mapping row whose level's gates the project's
`pharn.config.json` `gates.exclude` leaves nothing of. The rule is `gate-run-core.mjs` `levelExcludedGates`, which the
red-run preflight also applies, read against the invoking directory's `package.json`, or every gate of the level when
there is none. The row is RED here, at `/pharn-plan`, instead of at `/pharn-test`'s preflight after the tests are
written (an independent review's R5). A declaration that cannot be read prints an advisory `NOTE —`, because the
preflight and the lock refuse it.

**One more kind, since 6.21.0 — `test-infra-in-plan`:** a PLAN.md `## Files` entry that, as the setter scopes it, is a
ROOT runner config the test-infrastructure pin covers (below) — since 6.31.0 also a root package-manager config it
covers (`.npmrc`, `.yarnrc`, `.yarnrc.yml`), or a file a level gate's script NAMES (the token pass, below: the
`pharn-json` reporter a `test` script loads, say). Every write the build could make there changes the pin, so the plan
could never reach green: `/pharn-verify` would read `test-infra-changed`. The remedy is to split the change into a
`spec_kind: test-infra` increment first. The name test is `test-infra-core.mjs`'s own predicate and the named files
are its own `scriptNamedFiles()` over the tree at the invoking directory — every named file that is not an existing
directory, absent ones included, since a file the build creates there is one the pin reads at verify — imported,
never a second rule. A tree the pin cannot read (an unparseable `package.json`, a chain past the hop bound) prints an
advisory `NOTE —` instead of checking the named files (the GREEN line then says they were NOT checked);
`/pharn-test`'s lock refuses that same tree, so no build that reads the test-stage gate starts over it. **`package.json` and `pharn.config.json` in PLAN.md are NOT a RED:** the checker prints one
**advisory** `NOTE —` line per such entry and **never changes its exit code**. It can see that the plan names the
file, but not WHICH part of it the build will change, and a dependency is an ordinary build change. Every part the
pin reads there — the level gates' scripts and the scripts they chain to, the `jest` key, the `testResults` formats —
is still compared at `/pharn-verify`, late; and since 6.31.0 the build's write scope cannot re-pin what it changed
there, because the lock is kept out of it (next paragraph) — a Bash rewrite of the lock is detected by reconcile, never
prevented. A test executes that composition: a GREEN plan naming
`package.json` gets a build scope that allows it and denies the lock, and the build's script edit reads
`test-infra changed` at `--check`. The classification is FLOOR (enum/regex over the folded name); what the build then
does to a named manifest is not.

**And one more, since 6.31.0 — `ac-artifact-in-plan`:** a PLAN.md `## Files` entry that, as the setter scopes it
(folded), names THIS feature's `AC-TESTS.md` or `AC-TESTS.lock.json` — the mapping path on argv and the lock beside
it, spelled relative to the invoking directory (the project root the setter resolves scope entries against). The lock
is what the AC gate compares the tree with, and it pins AC-TESTS.md's bytes: a build scoped to the lock could re-pin
whatever it changed — a reporter, a script, a test — with every floor check green (the review that found it measured
exactly that). Only this feature's pair (another feature's lock decides nothing in this feature's verdict); the fold
over-reports a case variant the write guard would deny anyway (measured: only the exact and the annotated spellings
open the existing file), and a `./`-led or glob entry opens nothing and is not RED. The lock's file name is a literal
in the checker, held equal to `ac-tests-lock.mjs`'s by a parity test.

Exit **0** GREEN · **1** RED (every kind; a `legacy-spec` here means a mapping exists for a SPEC whose
`spec_template` was removed — it sits outside the body hash, so the pin cannot see it) · **2** unusable input (a
named file absent or unreadable, a `--features-dir` that is not a directory, bad usage).

**A crash of the chain check is no verdict on the pin (6.21.1).** The checker reads `check-plan-spec-agree.mjs`'s
result with `shelled-verdict-core.mjs`: exit 1 with its `RED —` line is the `pin` RED, and anything else non-zero (exit
1 without the line, another code, a signal, a spawn error) is a CRASH. With no RED kind, the checker then exits **2**
and its FIRST line is `UNUSABLE child-crashed — …`, which the test-stage gate (below) reads as unusable. Beside a RED
kind the exit stays **1** — a definite RED is a verdict whatever the pin would have said — and the crash is named on a
line before the closing `RED — N … failed`.

`check-ac-tests.mjs --spec <SPEC.md>` decides **before any mapping exists** what a SPEC gets: **0** templated (prints
the ids and levels), **3** legacy, **4** bootstrap (`spec_kind: test-infra`; prints the levels the bootstrap lock
records), **2** unusable. Precedence, fixed: unreadable 2 → legacy 3 → an invalid `spec_kind`, or a body that opens with a `spec_kind:` line
(6.20.7; `spec-template.md`, "`spec_kind`"), 2 → an absent,
duplicated or empty Acceptance Criteria section (or, for bootstrap, a malformed level) 2 → bootstrap 4 → templated 0.
`/pharn-plan` and `/pharn-test` branch on it. **A `spec_kind: quick` SPEC (6.25.0, `/pharn-ship --quick`) is
TEMPLATED (0) and treated as `feature` throughout this contract** — the same mapping check, red run,
test-stage gate and AC gate, reached through `TEST_FIRST_KINDS` (`spec-template-core.mjs`) rather than a
literal `=== "feature"` test — a quick SPEC just carries fewer, narrower-leveled criteria (`spec-template.md`
rule 9).

The mapping grammar — the level set, the line regex, the `## Mapping` reader, the path rule and the comparison key —
lives in `pharn/floor/ac-tests-core.mjs`, which the checker, the runner and the red-run verdict all import.

**Paths are compared as the writes-scope setter scopes them:** each `## Files` entry of AC-TESTS.md, PLAN.md and
every other feature goes through the setter's `clean` (a trailing `(…)` annotation is stripped) and `isConcrete`,
and the comparison is folded — NFC, then full case folding (`toUpperCase().toLowerCase()`, the write guard's fold
without its Windows trailing dot/space strip; 6.20.5, before which it only lowercased) — because APFS is case- and
normalization-insensitive. A PLAN entry `tests/ac/a.test.js (gated)`, `Tests/ac/a.test.js`, an NFD spelling of a
non-ASCII name, or `ſ` for `s` is therefore `in-plan-files`. **Bounds:** the fold is the modelled equivalence; one a
filesystem applies beyond it is not caught (fail-open), one it applies beyond the filesystem over-reports (fail-closed),
and it was never measured against APFS's own folding table. Two `## Files` entries of ONE AC-TESTS.md that differ only
by fold name one file on APFS, and nothing REDs the pair. A second `## Mapping` section is `malformed-line`.
AC ids and levels are read by `specAcceptanceCriteria()` in `spec-template-core.mjs`, through the same item parser
`check-spec.mjs` checks with.

## The red run — `check-red-run.mjs` (6.18.0)

`/pharn-test` runs the AC tests it wrote **before the build** and requires each AC's test to **fail**. A test that
cannot fail, is never collected, or is skipped would otherwise pass unnoticed.

- **Preflight, before a test is written:** `check-red-run.mjs --preflight --ac-tests <AC-TESTS.md> --discover
<package.json> --root <dir>`. Each AC's level must map to a discovered gate (`unit`/`integration` → `test`,
  `e2e` → `test:e2e` / `e2e` — `LEVEL_GATES` in `gate-run-core.mjs`), and **every** discovered gate of that level
  must have per-test results configured (`test-results-record.md`). Otherwise `ac-level-unavailable: AC-<n>
(<level>)`, and the output's last line is the closed `blocked: no-test-runner — <AC-n (level), …>; suggested: <remedy>`
  that an unattended caller prints verbatim. The `<remedy>` is a `/pharn-ship` command for a test-infra increment, except
  as below. A missing `package.json` reads as "no runner".

  **Since 6.36.0**, a gate the project EXCLUDES (`pharn.config.json` `gates.exclude`, `gate-run-record.md`) is not
  discovered here either. So an AC whose level's discovered gates are all excluded is `ac-level-unavailable`, and its
  line names the exclusion.

  - When every unavailable AC is exclusion-caused, the `<remedy>` is not a command. It names the ids to remove from
    `gates.exclude`, or the ACs to re-specify at a level whose gate is not excluded.
  - In a mixed case, that text follows the `/pharn-ship` command, joined by "and".
  - `check-ac-tests.mjs` REDs the same mapping row earlier, at `/pharn-plan`, as `level-excluded`. It uses the same
    rule: `gate-run-core.mjs` `levelExcludedGates`, read against the root's `package.json`, or every gate of the level
    when there is none.
  - A declaration that cannot be read makes the preflight unusable (exit 2), and the run's `init` refuses it
    (`bad-gate-exclusion`).

- **The run:** `run-gates.mjs init --stage ac-test --ac-tests <AC-TESTS.md> --discover <package.json> …`. The gate
  set is selected **by id** from the mapping's levels, never named by a caller (`--gates`, `--extra`,
  `--skip-style`, `--scope-json`, `--spec-from` and `--side` are refused), and each gate is handed exactly the mapped
  files of its levels after `--`. There is no `reconcile` and no `build`: an e2e runner that needs a built or served
  app builds or serves it itself (Playwright's `webServer`).
- **The verdict:** `check-red-run.mjs --verdict --ac-tests <AC-TESTS.md> --out <dir> --root <dir>`, per AC, over
  the per-test record of every gate its level maps to. A test **matches** an AC when its `file` EQUALS the mapped
  file (exactly, not case-folded) and its **leaf** title starts `AC-<n>:` — never a title anywhere in the suite,
  because other features' AC tests share it and reuse the ids. Matches are unioned across the level's gates.

  | reason                        | RED when                                                                                                                   |
  | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
  | `ac-level-unavailable`        | the run has no gate for the AC's level                                                                                     |
  | a per-test record reason      | a gate's record is refused (`not-configured`, `results-unavailable`, …) — by its name                                      |
  | `ac-test-not-collected`       | no matching test: the file failed to load (a syntax error, a top-level import of the missing target) or the title is wrong |
  | `ac-test-passes-before-build` | a matching test PASSED — vacuous, or the behaviour already exists; there is no escape hatch                                |
  | `ac-test-skipped`             | a matching test is skipped                                                                                                 |

  The gates' exits are expected non-zero and are not the verdict.

- **The binding.** A verdict is only about THIS mapping's run over THIS tree: the stamp validates as `ac-test` for
  the feature, each run's files equal the mapping's for that gate, and the live worktree fingerprint equals the
  stamp's final one (the lock and the test files are in it), so a test edited after the run, or a lock rewritten,
  is refused.
- **The convention it rests on.** A unit or integration AC test imports its target **inside the test body**.
  Before the build the module does not exist, and a top-level import makes the whole file fail to load, so nothing
  in it is collected. Measured on a real vitest 5.0.1 run
  (`pharn/floor/test-fixtures/test-results/vitest-red.json`) and a real Jest 30.5.2 run (`jest-red.json`).
  **The in-body form must be one the runner's module mode can run**, because a form it cannot run fails before
  the build AND after it. The red run cannot tell that failure from the right one, so such a test passes the red
  run and then fails verify. Measured 2026-09-25 (Jest 30.5.2):
  - `await import(…)` works under vitest; under Jest's ESM mode; and under a Jest setup that rewrites
    `import()` (babel-jest with `@babel/preset-env`, and `next/jest` from Next.js 16.3.6).
  - Under **plain Jest in its default CommonJS mode**, `await import(…)` fails with "A dynamic import callback was
    invoked without --experimental-vm-modules" even once the target exists (`jest-after.json`). There, use
    `require(…)` inside the body.
  - `require(…)` is not defined in an ES module, so it fails the same way under Jest's ESM mode.

  **Bound:** a runner that type-checks each file at load (ts-jest with diagnostics on) still fails the file; its
  transpile-only mode is the project's setup.

## `pharn/features/<name>/AC-TESTS.lock.json` — the lock

Written by `ac-tests-lock.mjs --write <name>` (test-first) or `--write-bootstrap <name>` (bootstrap), extended by
`--record-red-run <name> --out <dir>`, checked by `--check <name> [--require-red-run [--allow-bootstrap]]`. Every digest is computed by
the script.

```json
{
  "schema": "ac-tests-lock/5",
  "feature": "<name>",
  "mode": "test-first",
  "spec": { "spec_id": "<name>", "spec_content_hash": "<sha256>" },
  "mapping": { "path": "pharn/features/<name>/AC-TESTS.md", "sha256": "<sha256>" },
  "files": [{ "path": "tests/ac/reset.unit.test.ts", "sha256": "<sha256>" }],
  "bootstrap": null,
  "red_run": {
    "stamp_sha256": "<sha256>",
    "files_sha256": "<sha256>",
    "gates": [{ "gate": "test", "results_sha256": "<sha256>" }],
    "acs": [{ "id": "AC-1", "tests": ["tests/ac/reset.unit.test.ts::reset › AC-1: resets the password"] }]
  },
  "test_infra": {
    "levels": ["unit"],
    "gates": [
      {
        "id": "test",
        "script": "npm run test:unit -- --reporter=./tools/pharn-reporter.mjs",
        "pre": null,
        "post": null,
        "results": "pharn-json"
      }
    ],
    "chained": [{ "id": "test:unit", "script": "vitest run", "pre": null, "post": null }],
    "configs": [
      { "path": ".npmrc", "sha256": "<sha256>" },
      { "path": "vitest.config.ts", "sha256": "<sha256>" }
    ],
    "script_files": [{ "path": "tools/pharn-reporter.mjs", "sha256": "<sha256>" }],
    "jest": null,
    "exclude": ["e2e"]
  }
}
```

- The key set is **closed at every level**, per schema and mode. A lock that breaks it is unusable (exit 2), never
  a verdict.
  - `ac-tests-lock/5` (6.36.0) is what `--write` and `--write-bootstrap` write. `/4` (6.31.0), `/3` (6.20.0), `/2`
    (6.18.0) and `/1` (6.17.0: no `mode`, no `bootstrap`) are still read and checked.
  - `test_infra` is REQUIRED on a `/5`, `/4` or `/3` test-first lock, in THAT schema's shape:
    - `/5`: `{levels, gates, chained, configs, script_files, jest, exclude}`;
    - `/4`: the same without `exclude`;
    - `/3`: `{levels, gates, configs}`.
  - `test_infra` is `null` everywhere else: a bootstrap lock, and every `/2` and `/1` lock.
  - The mode is read from `mode` (`/1`: test-first), never from the schema, so a `/2` bootstrap lock stays a bootstrap
    lock.
  - `--record-red-run` writes only on a `/5` test-first lock. A red run recorded on a lock with no pin could never pass
    the AC gate, and one on a `/4` or `/3` pin would be judged by less than this floor pins. Re-running `--write` is
    cheap there.
- **Rolling back, stated (6.31.0, again at 6.36.0):** a floor older than 6.36.0 reads a `/5` lock as unusable (and one
  older than 6.31.0 a `/4` lock): `lock-unusable` at the test-stage gate, `ac-tests-modified` at the AC gate (verify
  FAIL), never GREEN. `--write` writes `/5` for every project, whether or not it declares an exclusion, so this cost
  applies to every project. A feature pinned under `/5` returns to an older floor only by re-running `/pharn-test`
  there, which writes that floor's schema.
- **`files`** is sorted by path and names every `## Files` entry **as the setter scopes it** — `clean`, then
  `isConcrete` (6.20.5; before, the raw entry was pinned, so `tests/a.test.js (new)` refused the write). An entry the
  setter would drop (a placeholder or glob) refuses the write and is a `--check` RED. Each must be a regular file, and so must
  AC-TESTS.md: a missing file or a symlink refuses the write. Test-file paths resolve against the current directory
  (the project root); the mapping path is compared by its real location, never as spelled.
- **`red_run`** is written only by `--record-red-run`, which re-derives the verdict itself, requires `--check` GREEN
  and the binding above, and records only when every AC is red as required: the matched test ids per AC (untrusted
  DATA from the project's reporter, sorted by AC number), each gate's results digest, the stamp's digest, and
  `files_sha256` — a digest of the lock's own `files` section, one `path\0sha256\n` per entry. `--write` resets
  `red_run` to `null`, because a rewrite means the tests changed.
- `--check` REDs, naming the path and never the content, when AC-TESTS.md changed, a test file changed, went missing
  or stopped being a regular file, a `## Files` entry was added or dropped, the spec pin changed, `red_run` is no
  longer bound to `files` (its `files_sha256` differs), `red_run` names other ACs than the mapping, (`/5`, `/4`,
  `/3`) the test-infrastructure pin no longer holds, or (`/4`, `/3`) the live tree has test infrastructure only a newer
  pin covers ("test infrastructure unpinned — …", below).
  **`--require-red-run`** additionally REDs a test-first lock with no `red_run`, any `/1` lock, and a **bootstrap**
  lock — which has no red run at all — unless **`--allow-bootstrap`** is passed too. So exit 0 from
  `--require-red-run` alone means a recorded red run; with `--allow-bootstrap` it means a recorded red run OR a
  bootstrap lock, and the caller that passes it has said it accepts the weaker evidence. `--check` alone being GREEN
  never means a red run happened.

### The test-infrastructure pin — `test_infra` (6.20.0; `/4` since 6.31.0; `/5` since 6.36.0)

The lock pins the test FILES; this pins the parts of what RUNS them listed below, so a change to one of THOSE parts
is a `--check` RED ("test infrastructure changed — …", which the test-stage gate reads as `lock-red`) and reads
`test-infra-changed` at the AC gate, and the test's pass no longer counts. It is not the whole runner: what the pin
does not see is stated after the list. `--write` takes it (before the red run, which therefore runs under it) and `--check` and the AC gate recompute it from
the live tree and compare EXACTLY. Computed by `pharn/floor/test-infra-core.mjs`:

- **`levels`** — the mapped levels the pin was taken for, so a recompute ranges over the same candidate gates.
- **`gates`** — for each gate its levels map to (`test` for unit/integration, `test:e2e`/`e2e` for e2e) that
  `package.json` `scripts` HAS: the script's value, its `pre<id>` / `post<id>` values (npm runs them implicitly;
  `null` when absent), and the `testResults` format read for it — or `not-configured` / `config-invalid` in its place.
  Not the whole `package.json`: dependencies legitimately change in a build.
- **`chained`** (`/4`) — every script a pinned value CHAINS to, transitively, with its own `pre`/`post`: `{ id,
script, pre, post }`, sorted by id, the level gates' own ids not repeated. `"test": "npm run test:unit"` used to pin
  the one line and not what `test:unit` runs.
- **`configs`** — every entry at the project ROOT named `vitest.config`, `vitest.workspace`, `vite.config`,
  `playwright.config` or `jest.config` with a js/mjs/cjs/ts/mts/cts/json extension, and (`/4`) the package-manager
  configs `.npmrc`, `.yarnrc`, `.yarnrc.yml` — the gate itself is `npm run <id>`, whose `script-shell` and
  `node-options` live in `.npmrc`, and yarn runs its `yarnPath` on every call. Hashed without following a link, never
  read into the lock. A symlinked or non-regular one cannot be pinned: `--write` refuses it, and a recompute reads it
  as a change. Since 6.21.0 the name is matched **folded** (NFC + full case folding, the fold `scopeKey` and the write
  guard use): vite and vitest look their config up by the lowercase name, so on a case-insensitive volume
  `Vitest.config.mjs` IS the runner's config. Before 6.21.0 it was loaded and never pinned. The recorded `path` is the
  on-disk spelling.
- **`script_files`** (`/4`) — `{ path, sha256 }` for every REGULAR file the token pass (below) finds named in a pinned
  value, sorted: the `pharn-json` reporter a `test` script loads, a runner a script starts. A named path that is absent
  or a directory is skipped (its later creation is `was added`); a symlink or an unreadable file refuses the pin.
- **`jest`** (`/4`) — the sha256 of `package.json`'s `jest` key in canonical JSON (object keys sorted at every level,
  array order kept), or `null` when the key is absent: Jest reads its config there when no `jest.config.*` exists,
  and a `testResultsProcessor` there rewrites the results before `--json` writes them. A digest, never the value.
- **`exclude`** (`/5`, 6.36.0) — the project's DECLARED gate exclusion (`pharn.config.json` `gates.exclude`,
  `gate-run-record.md` "Excluding a discovered gate"), in ALLOWLIST order, `[]` when none. It is the WHOLE list, not
  only level gates: an excluded `typecheck` or `build` changes what `/pharn-verify` runs as surely as an excluded
  `test`. So adding or removing an id after `/pharn-test` is `test-infra-changed`, named by the id. A declaration that
  cannot be read refuses the pin, so `--write` exits 2. The exclusion does NOT filter the other sections: an excluded
  level gate's script stays pinned in `gates`, and `scriptNamedFiles` (the plan-time `test-infra-in-plan` check) still
  reads it.
  **Declare it and commit it before the run.** An uncommitted declaration is a change since base: regress's scope
  partition, and `--quick`'s `check-quick-scope.mjs`, read it `scope-escaped` unless the PLAN declares
  `pharn.config.json`.
  **Two windows, stated:**
  - `/pharn-test` runs before the reconcile anchor (`LIMITS.md §9`), so an exclusion written DURING it is pinned as if
    it were legitimate. The backstop holds only CONDITIONALLY. It is regress's scope partition (under `--quick`,
    `check-quick-scope.mjs`), which has no exemption for `pharn.config.json`, so a change since base reads
    `scope-escaped`. It does NOT hold in three cases:
    - when PLAN.md `## Files` names `pharn.config.json`, for which `check-ac-tests.mjs` prints only a NOTE;
    - when git ignores the file;
    - in a standalone `/pharn-verify`, which has no scope check.
  - A bootstrap or legacy SPEC pins nothing (no lock, or `test_infra: null`). There, a build whose PLAN declares
    `pharn.config.json` can add an exclusion, and regress still reads no-regressions, because the base side runs the
    head's set. Deleting the script has the same effect today. Only the disclosure line in `REGRESSION.md` and
    `VERIFY.md` shows it. `BRIEFING.md` does not carry the line (`gate-exclusion-summary-disclosure`).
    **Not closed here:** regress has the base commit, so it could compare the declaration at base and HEAD. That is
    the named follow-up `gate-exclusion-base-compare`: report a widened exclusion as a closed finding.

**The token pass — ONE closed, literal rule, never a shell parse** (`test-infra-core.mjs`'s header is its spec):
`scriptTokens()` splits a value on whitespace and `; & | ( )` and strips one pair of matching quotes. A FILE is a
token (split on `=`, a leading `./` stripped) that is a clean relative path — not led by `-` or `/`, no `.`/`..`/empty
segment, no whitespace, quote, shell or glob character, first segment not `node_modules` or `.pharn` — with an
extension a gate executes (`.bash .cjs .cts .js .jsx .mjs .mts .sh .ts .tsx .zsh`); the token after an OUTPUT redirect (`>`,
`>>`, `2>`), `-o` or an `--out…` flag (and an `--out…=` value) is an OUTPUT and is skipped, while an input redirect's
target is not (`node < tools/x.mjs` executes it). A CHAIN is `npm`/`pnpm`/`yarn`, its flags skipped, then
`run`/`run-script`/`rum`/`urn` and the next non-flag token; `test`/`t`/`tst` (the `test` script — and for pnpm/yarn a
script of that name too); `start`/`stop`/`restart`; for pnpm and yarn any other word (their `<pm> <script>`
shorthand); and `node --run <id>`. A chained id pins only when it is an OWN property of `scripts`; the walk stops at an
id already pinned and REFUSES past 8 hops (real chains are one or two), or at a chained name over 1024 characters.

A difference names the gate id, the chained script's id (quoted and bounded), the config path or the script-named
path, never a script's text or a file's content. **What it does NOT catch, stated** — restated from
`test-infra-core.mjs`'s header, the one copy:

- **The in-process bound, the widest:** code the build writes runs INSIDE the test process, so it can switch off the
  assertion library or the reporter there — `assert.equal = () => {}` in the only in-scope file made verify PASS with
  the AC counted delivered while the function was wrong. No pin reaches it; a green pin never means the build could
  not forge the AC gate.
- any file a pinned file imports — a setup or helper file a config imports, the named reporter's own imports;
- configuration read from the environment (`NODE_OPTIONS`, `npm_config_*`), and npm configuration outside the
  project root (the user and the global npmrc);
- `package.json` fields other than the level gates' scripts, the scripts they chain to and `jest` — a `mocha` or
  `ava` key, `config` (a script reads it as `$npm_package_config_*`), `type`, `imports`, `exports`, `workspaces`,
  `overrides`, and dependencies (the runner's own version);
- a chain the token pass does not read — through another runner (`npm-run-all`, `run-s`, `concurrently`, `turbo`),
  into another package (`--prefix`, `-w`, `yarn workspace`), after a flag whose value is a separate token, or through
  `bun`;
- a named file the rule does not read — with whitespace, a quote or a shell or glob character (so one built from a
  variable), absolute or outside the root, under `node_modules`, over 1024 characters, with an extension outside the
  set (so a JSON or YAML config a script names — `jest --config jest.ci.json`), an output redirect's or output flag's
  target — and a named path that is a directory (its contents are never read);
- a config outside the root, or under a name outside the closed sets (the fold is the modelled equivalence: a name a
  filesystem folds beyond it is not caught, and one it folds beyond the filesystem is pinned anyway — so on a
  case-SENSITIVE filesystem a `Vitest.config.mjs` the runner does not load is still pinned, fail-closed); `tsconfig`;
  package-manager configuration other than the three root files (`.pnpmfile.cjs`, `bunfig.toml`).

**The `.npmrc` digest is committed with the lock:** a digest of a file that holds a low-entropy credential lets anyone
who reads the lock test guesses offline — keep registry credentials in an environment variable or the user-level
npmrc. **Costs, stated:** a SOURCE file a test-reachable script names literally is pinned too — a bundler's entry
(`tsup src/index.ts` reached through `"pretest": "npm run build"`), a runner script — so a feature that edits it reads
`test-infra-changed`; so does one that edits a chained build script, or a file a chained step writes under a literal
name (a `cp` destination, which the red run itself can change — `--record-red-run` then refuses). Name a directory, a
glob or a config file there instead, as its own `spec_kind: test-infra` increment.

A change it catches reads `test-infra-changed` whether or not it was legitimate. **The remedy is
a person, and it costs the build:** once the build exists, `/pharn-test`'s red run reads
`ac-test-passes-before-build` and has no escape hatch, so re-running it means setting the build aside first (revert
or stash it), or re-planning. **When the change IS the feature's intent** — the build had to change the runner, its
config or a test script — re-running `/pharn-test` cannot help: the rebuild makes the same change and the gate reads it
again. Re-plan instead: the change goes into a `spec_kind: test-infra` increment first (through `/pharn-ship`), and the
feature is planned after it. `check-ac-tests.mjs` refuses that plan up front for a root runner config (6.21.0), a
package-manager config and a script-named file (6.31.0) — `test-infra-in-plan`, above; for `package.json`'s scripts
and `jest` key and for `testResults` it can only print an advisory NOTE, and the lock, out of the build's scope
(`ac-artifact-in-plan`), is what makes that NOTE's late catch hold.
**Migration, stated:** a feature whose lock is `/2` (written by 6.18 or 6.19) carries no pin, so 6.20's verify reports
`test-infra-unpinned` for it until that is done. Since 6.21.0 a `/3` lock written while a case-variant runner config
already sat at the root did not pin it, and a recompute now reads `<path>: a runner config was added` (`lock-red`,
`test-infra-changed`) — fail-closed, with the same remedy; a 6.21 lock that records such a path is `lock-unusable` to a
6.20.x floor, whose shape check does not fold. **Since 6.31.0 a `/3` lock is judged by what it pinned** (its runner
configs, not the package-manager configs it never recorded), and whatever the live tree has that only `/4` pins — a
chained script, a script-named file, a package-manager config, a `jest` key — is reported `unpinned`, never `changed`:
a `--check` RED ("test infrastructure unpinned — …", `lock-red`) and `test-infra-unpinned` at the AC gate, with the
same remedy. A `/3` lock over a tree with none of them stays GREEN. A `/3` lock over a tree the `/4` pin cannot be taken on at all (a symlinked `.npmrc` or script-named file, a chain past 8 hops) reads `changed`, not `unpinned`: the refusal cannot tell a `/3`-covered change from a `/4`-only one, so it keeps the stricter reading.
**Since 6.36.0 a `/4` lock is judged by what it pinned.**

- A NON-EMPTY live gate exclusion, which only `/5` pins, reads `unpinned` against a `/4` or `/3` lock: a `--check`
  RED and `test-infra-unpinned` at the AC gate. The remedy is the same: set the build aside and re-run `/pharn-test`.
- With no declaration, or an empty one, a `/4` lock reads exactly as before.
- Because the pin now reads the declaration, a `/4` or `/3` lock over a `pharn.config.json` that is not valid JSON
  reads `changed`. Before, such a file recorded `results: config-invalid` and could stay GREEN.

### Bootstrap — a `spec_kind: test-infra` SPEC

The increment that sets up the test runner cannot have failing tests first, so `/pharn-test` writes no tests, runs
nothing, and records `mode: "bootstrap"`: `mapping: null`, `files: []`, `red_run: null`, the `spec` pin read from
SPEC.md, and `bootstrap: { "spec_kind": "test-infra", "levels": [...] }` — the SPEC's criteria levels, sorted.
`--write-bootstrap` refuses a SPEC that is not Approved and un-drifted (it SHELLS `check-spec-approved.mjs` — a
bootstrap lock has no AC-TESTS.md through which `check-ac-tests.mjs` could bind the pin), is not `test-infra`, or has
an unusable level, and refuses when an AC-TESTS.md exists. `--check` of a bootstrap lock re-runs the same approval
check and REDs a SPEC no longer Approved and un-drifted, a changed pin, kind or level set, and an AC-TESTS.md that
appeared. Since 6.21.1 the approval check's result is read as a verdict (`shelled-verdict-core.mjs`): a crash of it is
no verdict, never "not Approved". `--write-bootstrap` then refuses with `UNUSABLE child-crashed — …` (exit 2), and
`--check` exits 2 with that FIRST line unless another RED holds, which keeps exit 1 and names the crash.

**This is WEAKER than test-first, and the record says so:** nothing showed a test failing before the build. What a
later verify stage will require instead: after the build, the level's gate is discovered, runs, and reports at least
one collected `passed` test with per-test results available.

`spec_kind` is covered by the SPEC's approval pin (`spec-template.md`, "`spec_kind`"), so an Approved feature SPEC
that passes `check-spec.mjs` cannot become a bootstrap one without the pin moving, which every chain check reports as
drift. Before 6.20.7, moving the key between the frontmatter and the body's first line kept the pin; that layout is
now RED at `check-spec.mjs` and unusable (2) at `--spec`. **Bounded:** the
floor sees a re-pin, not an approver — `check-spec.mjs --hash` plus a frontmatter edit re-pins, and a self-consistent
re-pin (with a matching re-plan) passes.

## The test-stage gate — `check-test-stage.mjs <name> [--base <dir>]` (6.19.0)

Did the test stage complete for this feature's CURRENT SPEC and PLAN? One checker answers it, and `/pharn-build`
(first thing, before its scope and anchor), `/pharn-ship`, `/pharn-loop` and `check-loop-fresh.mjs` (check I, after
every build and at the commit gate) all read it. It SHELLS the checkers above and owns only the branch:

| SPEC (`check-ac-tests.mjs --spec`) | the gate requires                                                                                                                                                                                  | token (exit 0)               |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| templated (0)                      | AC-TESTS.md present, the full mapping check GREEN, a `test-first` lock, `--check --require-red-run`, and (6.20.0) the lock carries the test-infrastructure pin — a `/2` or `/1` lock is `lock-red` | `READY test-first`           |
| bootstrap (4)                      | a `bootstrap` lock, `--check --require-red-run --allow-bootstrap`                                                                                                                                  | `READY bootstrap`            |
| legacy (3)                         | no AC-TESTS.md and no lock                                                                                                                                                                         | `NOT-APPLICABLE legacy-spec` |

Otherwise the first line is `RED <reason>` (exit 1), `<reason>` ∈ {`spec-unusable`, `no-mapping`, `mapping-red`,
`no-lock`, `lock-red`, `lock-unusable`, `lock-mode-mismatch`, `legacy-with-mapping`, `mode-not-allowed`}; exit 2 is
unusable input — including, since 6.20.6, a child checker that CRASHED: it exited 1 (node's code for an uncaught
throw or a module that failed to load) without its closing `RED —` line, which both children print before every
exit-1 return. Before 6.20.6 a crash read as that child's RED, which `/pharn-loop` stops on as S13. **Since 6.21.1 the
same holds one level further down:** each child reads the checker IT shells (`check-plan-spec-agree.mjs` for the
mapping's pin, `check-spec-approved.mjs` for a bootstrap lock) as a verdict, and reports its crash as exit 2 with
`UNUSABLE child-crashed — …` FIRST when it has no RED of its own (above). The gate reads exit 2 with that line as
unusable; every other exit 2 keeps its RED (`mapping-red` for an unreadable input, `lock-unusable` for a malformed
lock). **The bound, one level further:** a crash below THOSE checkers is read by its parent as that parent's own RED
(`check-plan-spec-agree.mjs` over `check-spec-approved.mjs` or `check-spec.mjs`; `check-spec-approved.mjs` over
`check-spec.mjs`), so it still arrives as `mapping-red` or `lock-red`. Under `/pharn-loop`, `check-loop-fresh.mjs` check I
runs `check-spec-approved.mjs` and `check-plan-spec-agree.mjs` over the same SPEC.md first, and every deeper call has an
identical twin there, so only a crash those runs do not reproduce (resource exhaustion, a race) reaches the gate as a
RED. Outside the loop the gate runs first, and such a crash is still a refusal, with the wrong remedy named. `--require-test-first` makes any pass other than `READY test-first` a `RED mode-not-allowed`:
`/pharn-loop` and `check-loop-fresh.mjs` pass it, because the loop never writes a legacy SPEC or approves a
`test-infra` one, so its policy is in the checker rather than in its prose. The
child checker's own lines follow, indented. `lock-mode-mismatch` exists because a `test-first` lock's `--check` never
reads SPEC.md: without it, a SPEC re-approved as `test-infra` beside an old test-first lock read `READY bootstrap`. An
`ac-tests-lock/1` lock counts as test-first and fails the red-run requirement.

- **It passes on a rebuild that left what the lock pins alone.** The mapping check reads SPEC, PLAN and AC-TESTS.md,
  none of which the build may write. The lock pins the AC tests and the test infrastructure; "The
  test-infrastructure pin" (above) is the list. The mapping check keeps the AC tests (`in-plan-files`), every root
  runner config (`test-infra-in-plan`, 6.21.0), every root package-manager config and every file a level gate's
  script names (6.31.0), and this feature's own AC-TESTS.md and lock (`ac-artifact-in-plan`, 6.31.0) out of the
  build's scope. It cannot keep out the level gates' `package.json` scripts, the scripts they chain to, the `jest` key,
  the `testResults` formats or (6.36.0) the `gates.exclude` list when the plan names `package.json` or
  `pharn.config.json` for another reason, so a
  build that changes those turns the gate RED — and cannot re-pin them through its write scope, since the lock is out
  of it (a Bash rewrite is reconcile's, detected, never prevented). So does a
  gate that rewrites a pinned file — a test (an inline snapshot, a `--fix` linter), a runner config (a formatter or
  `--fix` linter run over the root), or a file a chained step writes under a literal name.
  `/pharn-test` cannot be re-run after the build — its red run would read `ac-test-passes-before-build`. So
  `/pharn-loop` treats stale test evidence as a STOP, never a re-run.
- **`NOT-APPLICABLE` is decided by `spec_template`, which the approval pin does not cover** (`spec-template.md`,
  "Opt-in"). Removing that key and deleting AC-TESTS.md and the lock makes a templated SPEC read legacy. A legacy SPEC
  beside either file is RED; `/pharn-loop`, whose `/pharn-spec` always fills the template, refuses `NOT-APPLICABLE`.
- **Tree identity, not recency:** a lock from an earlier run over the same files passes; the gate never proves
  `/pharn-test` ran in THIS run.
- **Features planned before 6.17.0, or tested under it, are refused** until `/pharn-plan` writes a mapping and
  `/pharn-test` records a red run. One already partly built without them must first revert that implementation.
- **An abandoned `/pharn-loop` run** leaves its AC-TESTS.md and tests behind; a retry in `<slug>-2` then REDs
  `claimed-elsewhere` at `/pharn-plan` until a person removes them.

## The AC gate — `/pharn-verify`'s delivery check (6.20.0)

`pharn/floor/ac-gate-core.mjs`, run by `check-verify.mjs --stamp … --ac-gate` (`/pharn-verify`'s verdict call, made
by `pharn/floor/stage-verify.mjs` since 6.26.0), answers the
question this whole contract exists for: **was every Acceptance Criterion delivered on the head verify run?** An AC is
delivered = **a locked, once-red test titled `AC-<n>:`, in a file mapped to AC-n, passed on the head run.** PHARN does
not judge whether that test fully captures the AC's intent. The ACs are the SPEC's: one the mapping does not cover
has no locked test at all.

Matching is FILE-SCOPED, by the red run's own rule (`red-run-core.mjs` `observeAc`, one copy): for AC-n, only entries
whose `file` EQUALS a file mapped to AC-n and whose LEAF title starts `AC-<n>:` — never a suite-wide title match,
because every earlier feature's AC tests are in the same suite and reuse the ids.

| SPEC       | reason                | when                                                                                                                                                         | class      |
| ---------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| feature    | `ac-untested`         | no matching entry, or a test the red run recorded red for AC-n is not reported at all                                                                        | delivery   |
| feature    | `ac-not-passed`       | a matching entry `failed`                                                                                                                                    | delivery   |
| feature    | `ac-skipped`          | a matching entry `skipped` (none failed)                                                                                                                     | delivery   |
| feature    | `ac-tests-modified`   | the lock is missing, unusable or not test-first; its files, mapping or spec pin do not hold; or the SPEC's pin is not the lock's, or cannot be read (6.20.5) | evidence   |
| feature    | `ac-never-red`        | no `red_run`, or one no longer bound to the lock; a matched test the red run never recorded red for that AC; an AC with no mapping row                       | evidence   |
| feature    | `test-infra-changed`  | the pin does not hold; or a level gate did not run as the pinned `npm run <id>` (`source: discover`, no shell)                                               | evidence   |
| feature    | `test-infra-unpinned` | the lock carries no pin (`/2`, `/1`); or a `/3` or `/4` pin, and the tree has what only a newer pin covers (6.31.0, 6.36.0)                                  | evidence   |
| feature    | item 01's reason      | a level gate is absent from the head run, its per-test record is refused, or (6.31.0) a per-test anomaly sits in a file mapped to AC-n                       | unmeasured |
| test-infra | `ac-untested`         | the level's gate did not run as discovered, its results are `not-configured`, or it reported no passed test                                                  | delivery   |
| test-infra | `ac-tests-modified`   | the lock is not a bootstrap lock whose SPEC half holds                                                                                                       | evidence   |
| legacy     | `ac-tests-modified`   | an AC-TESTS.md or a lock exists beside it (`spec_template` was removed after the tests were pinned)                                                          | evidence   |
| legacy     | —                     | otherwise: **not-applicable (legacy spec)**, stated in the report, never silently green                                                                      | —          |

The three classes are a partition (closure-tested). **Evidence** adds `ac-evidence` to verify's `failing_gates` —
FAIL, and `/pharn-loop` stops (`check-loop.mjs` `terminal_cause: ac-evidence`, stuck point S13): a rebuild cannot
restore evidence taken before it. **Delivery** adds `ac-delivery` — FAIL, which the loop iterates on. **Unmeasured**
over otherwise-green gates is INCONCLUSIVE, never a PASS; a red gate beats it. **Over an incomplete build** (6.20.4)
delivery and unmeasured readings yield to INCOMPLETE — the retryable verdict, never green — while a red gate and
evidence still read FAIL (`verify-report.md`, "Over an incomplete build"). `test-infra-changed` for a level gate that
"did not run as the pinned `npm run <id>`" is, when the stamp's source is explicit, `/pharn-verify`'s own `--gates`:
its detail says so, and the remedy is to re-run `/pharn-verify` without `--gates` (`pharn-verify.md`'s reference
section, and `stage-exit-core.mjs`'s verify `no-gates` question, both say so). `spec_kind: test-infra` evidence is
**BOOTSTRAP** — each level's gate ran as discovered and reported at least one passed test — and the report says it is
weaker than test-first. The report's `ac_gate` block carries the per-AC table (`verify-report.md`); its test ids and
titles are untrusted DATA: the report names them, and no stage follows them.

**A per-test anomaly decides an AC only where that AC's tests live (6.31.0).** A test whose status the report does
not give plainly — a flaky test or an expected failure the report marks, any other status outside the closed map —
and every test whose id another test shares are the record's `anomalies`, never its `tests`
(`test-results-record.md`). The red run and the AC gate read them per AC, by the same `observeAc`: an anomaly in a
file mapped to AC-n, in the record of a gate AC-n's level reads, makes AC-n unmeasured by the anomaly's own reason
(`duplicate-test-id`, `unknown-status`) — fail-closed exactly where it could hide the AC's own test — and every other
anomaly of a record the stage read is REPORTED, grouped by gate and reason with a count and up to three example ids
(`unmapped_anomalies`; the red run prints it as `NOTE —` lines), and read by no verdict. Before 6.31.0 one anomaly ANYWHERE refused the whole record, so a parametrized duplicate in an
unrelated file made every AC unmeasured and `/pharn-loop` stopped on every iteration. **Bounded:** the file an entry
names is the reporter's word, so a report that puts an AC's own flaky test under another file's name moves its
anomaly out of the verdict — as a report that calls it `passed` already could.

**Bounded, and stated (P0):** "passed" is the reporter's word, and the tests, the reporter config and
`pharn.config.json` are agent-editable — the lock and the pin NARROW that and never close it; AGREEMENT, never
provenance (a self-consistent forged lock + stamp + results set over the live tree passes); code the build writes runs
inside the test process and can switch off the assertions or the reporter there, which no pin reaches (the pin's
list, above, states it first); the pin's own gaps (above). A flaky test or expected failure the report does not mark
(vitest `test.fails` or pass on retry, Jest 29's `test.failing`) reads as its raw status
(`test-results-record.md`). The gate reads the SPEC's pin, never its
`state`: a SPEC whose pin cannot be read is `ac-tests-modified` (6.20.5 — before, the comparison was skipped), but a
SPEC reverted to Draft that still carries a readable pin equal to the lock's passes here; `/pharn-verify`'s chain
check and `/pharn-loop`'s freshness check I refuse it.

## Artifacts, regress and reconcile

`AC-TESTS.md` and `AC-TESTS.lock.json` are pipeline artifacts (`check-regress.mjs` `PIPELINE_ARTIFACTS`), so
`/pharn-regress` does not report them as build escapes; `/pharn-regress` also declares AC-TESTS.md's `## Files`
alongside PLAN.md's, because those test files are `/pharn-test`'s writes.

The red run's scratch, `.pharn/pharn-test/gates`, is git-ignored runtime state that the next run wipes; the evidence
lives in the lock.

For **reconcile** the two differ, deliberately. `AC-TESTS.md` is exempt, like `PLAN.md`: it is a plan file, and a
re-plan after `/pharn-build`'s anchor legitimately rewrites it. The **lock** is not exempt
(`reconcile-ignore.json` `pre_anchor_artifacts`): it pins the tests, and nothing changes it after the anchor, so a
build-window change to it, or to an AC test file, stays visible to `/pharn-verify`'s reconcile gate. A re-plan that
leaves the lock stale is caught by `ac-tests-lock.mjs --check`. **Since 6.31.0 neither can be in the build's scope**
(`ac-artifact-in-plan`), so a Write-tool rewrite of either is DENIED by the write guard, and a Bash rewrite of the lock
is DETECTED by reconcile — before, a PLAN naming the lock scoped the build to it, reconcile read that write as
in-scope, and a rewritten lock passed every check. Detected, never prevented, as for every Bash write
(`LIMITS.md §6`); the AC-TESTS.md half rests on the lock pinning its bytes.

## What it proves, and what it does not (P0)

- **Floor:** the mapping is complete and consistent with the current Approved SPEC (enum/regex/set membership, and
  content-hash through the shelled chain check); `/pharn-test` can write only the mapped files, and the build's
  scope excludes them (the fix #7 hook); the lock pins the files as written (content-hash); every AC's test was
  collected and `failed` in a run bound to the mapping and the tree (enum membership over the per-test record, plus
  the fingerprint), and the lock's `red_run` is bound to its `files` (content-hash); the test-stage gate's verdict
  over all of these (enum membership over the SPEC's mode, the rest shelled). Obeying that gate is command
  discipline; `/pharn-loop` re-reads it after every build. Since 6.20.0: the test infrastructure is pinned
  (content-hash + exact comparison), and `/pharn-verify`'s AC gate decides delivery on the head run (enum membership
  over the per-test record, plus the content-hash checks above). Since 6.21.0: no root runner config the pin covers
  is in the build's scope when the mapping check is GREEN (`test-infra-in-plan`, enum/regex over the folded name,
  composed with the fix #7 hook, which scopes only concrete `## Files` entries). Since 6.31.0, composed the same way
  and probed through the real setter and write guard over the measured spellings: neither this feature's AC-TESTS.md
  nor its lock (`ac-artifact-in-plan`), no root package-manager config, and — when the tree can be read (else a NOTE,
  and the GREEN line says so) — no file a level gate's script names under the closed token rule is in the build's scope; the pin also covers the scripts the level gates chain to, those
  files, and `package.json`'s `jest` key (content-hash + exact comparison); and a per-test anomaly decides only the ACs
  whose files it sits in (enum membership over the record's `anomalies`).
- **Bounded:** the build exclusion holds for the PLAN.md the checker read. An edit to PLAN.md after `/pharn-test`
  reopens it until something re-checks; since 6.19.0 `/pharn-build` does, first thing (the test-stage gate, below). A Bash write bypasses every
  write hook (`LIMITS.md §6`), and `/pharn-test` runs before the reconcile anchor, so its own Bash writes are not
  reconciled. **`/pharn-verify` does not re-run the mapping check** (its chain phase is `check-plan-spec-agree.mjs`
  alone), so a run that ignores the plan check and the test-stage gate — both RED for a PLAN naming the lock — and
  sets the build's scope itself still reaches a verify PASS over a build that re-pinned the lock (measured, 6.31.0).
  Every shipped route reads the test-stage gate before the build, and `/pharn-loop` re-reads it after each one;
  obeying it is command discipline. Named follow-up: `verify-rechecks-test-stage`.
- **Advisory:** that the tests are right, assert the AC's Then, or drive a good public target; that `/pharn-test`
  read only SPEC, PLAN and AC-TESTS.md (`reads:` is not enforced); that a test fails **because the behaviour is
  missing** — a test failing on a typo in its own body is `failed` too, and the collected/not-collected split is the
  only reason the record can tell apart. The lock certifies that the files are the ones it recorded, never who wrote
  them: a self-consistent rewrite of tests and lock passes, and so does a self-consistent forged results file and
  stamp over the live tree. The stamp and results digests in `red_run` are recorded, not re-checkable once the next
  run wipes `<out>`; only `files_sha256` is re-checked.
- **Struck, and why (6.31.0):** "the build can no longer forge the AC gate" and "every script a gate runs is
  pinned". Code the build writes runs inside the test process and can switch off the assertions or the reporter
  there (the in-process bound, first in the pin's NOT-caught list), and the token pass reads a closed literal rule,
  not every way a script can run another.
- `/pharn-test` can write **only** mapped test files. A shared helper or fixture lives inside one of them or is
  written by the build.
- **A mapped test file is assumed NEW.** Nothing checks that it did not already exist: an existing project test
  mapped here would be rewritten by `/pharn-test`, and `/pharn-regress`, which declares AC-TESTS.md's files, would
  treat it as the feature's own and drop it from the regression comparison. `/pharn-plan` is told to map only new
  files. That is a stated bound, not a check (no run has failed on it — P7).
