---
name: ac-tests
trust: trusted
layer: pharn-contracts
purpose: "Single source of truth for a feature's Acceptance-Criteria tests written BEFORE the build: the AC-TESTS.md mapping /pharn-plan writes and /pharn-test is scoped by, the rules pharn/floor/check-ac-tests.mjs enforces over it, the red run that shows each AC's test fails before the build (pharn/floor/check-red-run.mjs), and the AC-TESTS.lock.json pharn/floor/ac-tests-lock.mjs writes to pin the tests and record that evidence — or, for a spec_kind: test-infra SPEC, a bootstrap lock. Schema only, zero behavior (P3, pharn/ARCHITECTURE.md §4)."
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
stage also RUNS the tests it writes, before the build, and requires each to fail (the red run, below). It still runs
standalone: `/pharn-ship` and `/pharn-loop` do not call it.

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
  mapping is bound to the current Approved SPEC by the same checker that binds PLAN.md.
- **`## Files`:** exactly the test files, one back-tick path per list item. It is `/pharn-test`'s writes-scope
  (`set-writes-scope.cjs --from-plan AC-TESTS.md`), read by the same `## Files` rule as a PLAN
  (`plan-files-core.mjs`, held to the setter by a parity test).
- **`## Mapping`:** one line per AC, matching

  ```text
  ^- (AC-[1-9][0-9]*) \| (unit|integration|e2e) \| `([^`\s][^`]*)` \| (\S.*)$
  ```

  The id and level come from the SPEC; the file is a `## Files` entry. The **public target** is the interface the
  test drives: a URL plus a visible role or text for `e2e`, a route plus method for `integration`, a module path,
  export and signature for `unit`. A unit test written first needs that interface decided before the build, which
  is why the target is the plan's job. The floor checks the target only for presence.

**Why a separate file:** the setter reads a file's first `## Files`, so the test files cannot live in PLAN.md
without joining the build's scope, and a second extractor would mean editing a protected hook.

## The checker — `check-ac-tests.mjs <AC-TESTS.md> <SPEC.md> <PLAN.md> [--features-dir <dir>]`

| kind                | RED when                                                                                                                   |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `legacy-spec`       | the SPEC has no `spec_template` (exit **3**, checked first)                                                                |
| `pin`               | `check-plan-spec-agree.mjs <AC-TESTS.md> <SPEC.md>` is non-zero (Draft, drifted, stale or mislabeled)                      |
| `spec-kind`         | the SPEC is `spec_kind: test-infra` (a bootstrap increment has no mapping), or its `spec_kind` is invalid                  |
| `malformed-line`    | a non-blank line under `## Mapping` does not match, or there is no `## Mapping`                                            |
| `missing-ac`        | a SPEC AC has no mapping line, or the SPEC's Acceptance Criteria section is absent or duplicated                           |
| `duplicate-ac`      | an AC has more than one mapping line                                                                                       |
| `unknown-ac`        | a mapped id is not a SPEC AC                                                                                               |
| `level-mismatch`    | a mapped level differs from the SPEC's `verify:` level                                                                     |
| `unlisted-file`     | a mapped file is not in `## Files`                                                                                         |
| `unmapped-file`     | a `## Files` entry is mapped by no line                                                                                    |
| `in-plan-files`     | a test file is in PLAN.md `## Files`, so the build would be scoped to it                                                   |
| `claimed-elsewhere` | another feature's AC-TESTS.md `## Files` already names the file                                                            |
| `no-files`          | there is no `## Files`, or it names nothing                                                                                |
| `bad-path`          | a `## Files` entry is a placeholder or glob, absolute, led by `-`, not normalized, or under `.pharn/` or `pharn/features/` |

Exit **0** GREEN · **1** RED (every kind; a `legacy-spec` here means a mapping exists for a SPEC whose
`spec_template` was removed — it sits outside the body hash, so the pin cannot see it) · **2** unusable input (a
named file absent or unreadable, a `--features-dir` that is not a directory, bad usage).

`check-ac-tests.mjs --spec <SPEC.md>` decides **before any mapping exists** what a SPEC gets: **0** templated (prints
the ids and levels), **3** legacy, **4** bootstrap (`spec_kind: test-infra`; prints the levels the bootstrap lock
records), **2** unusable. Precedence, fixed: unreadable 2 → legacy 3 → an invalid `spec_kind` 2 → an absent,
duplicated or empty Acceptance Criteria section (or, for bootstrap, a malformed level) 2 → bootstrap 4 → templated 0.
`/pharn-plan` and `/pharn-test` branch on it.

The mapping grammar — the level set, the line regex, the `## Mapping` reader, the path rule and the comparison key —
lives in `pharn/floor/ac-tests-core.mjs`, which the checker, the runner and the red-run verdict all import.

**Paths are compared as the writes-scope setter scopes them:** each `## Files` entry of AC-TESTS.md, PLAN.md and
every other feature goes through the setter's `clean` (a trailing `(…)` annotation is stripped) and `isConcrete`,
and the comparison is case-folded, because APFS is case-insensitive. A PLAN entry `tests/ac/a.test.js (gated)` or
`Tests/ac/a.test.js` is therefore `in-plan-files`. A second `## Mapping` section is `malformed-line`.
AC ids and levels are read by `specAcceptanceCriteria()` in `spec-template-core.mjs`, through the same item parser
`check-spec.mjs` checks with.

## The red run — `check-red-run.mjs` (6.18.0)

`/pharn-test` runs the AC tests it wrote **before the build** and requires each AC's test to **fail**. A test that
cannot fail, is never collected, or is skipped would otherwise pass unnoticed.

- **Preflight, before a test is written:** `check-red-run.mjs --preflight --ac-tests <AC-TESTS.md> --discover
<package.json> --root <dir>`. Each AC's level must map to a discovered gate (`unit`/`integration` → `test`,
  `e2e` → `test:e2e` / `e2e` — `LEVEL_GATES` in `gate-run-core.mjs`), and **every** discovered gate of that level
  must have per-test results configured (`test-results-record.md`). Otherwise `ac-level-unavailable: AC-<n>
(<level>)`, and the output's last line is the closed
  `blocked: no-test-runner — <AC-n (level), …>; suggested: <a /pharn-ship command for a test-infra increment>` that
  an unattended caller prints verbatim. A missing `package.json` reads as "no runner".
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
- **The convention it rests on.** A unit or integration AC test imports its target **inside the test body**
  (`await import(…)`). Before the build the module does not exist, and a top-level import makes the whole file
  fail to load, so nothing in it is collected. Measured on a real vitest 5.0.1 run
  (`pharn/floor/test-fixtures/test-results/vitest-red.json`). **Bound:** a runner that type-checks each file at load
  (ts-jest with diagnostics on) still fails the file; its transpile-only mode is the project's setup.

## `pharn/features/<name>/AC-TESTS.lock.json` — the lock

Written by `ac-tests-lock.mjs --write <name>` (test-first) or `--write-bootstrap <name>` (bootstrap), extended by
`--record-red-run <name> --out <dir>`, checked by `--check <name> [--require-red-run [--allow-bootstrap]]`. Every digest is computed by
the script.

```json
{
  "schema": "ac-tests-lock/2",
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
  "test_infra": null
}
```

- The key set is **closed at every level**, per schema and mode. A lock that breaks it is unusable (exit 2), never
  a verdict. `ac-tests-lock/1` (6.17.0: no `mode`, no `bootstrap`, `red_run` and `test_infra` null) is still read
  and checked. `test_infra` stays `null` under `/2`; the stage that fills it bumps the schema.
- **`files`** is sorted by path and names every `## Files` entry. Each must be a regular file, and so must
  AC-TESTS.md: a missing file or a symlink refuses the write. Test-file paths resolve against the current directory
  (the project root); the mapping path is compared by its real location, never as spelled.
- **`red_run`** is written only by `--record-red-run`, which re-derives the verdict itself, requires `--check` GREEN
  and the binding above, and records only when every AC is red as required: the matched test ids per AC (untrusted
  DATA from the project's reporter, sorted by AC number), each gate's results digest, the stamp's digest, and
  `files_sha256` — a digest of the lock's own `files` section, one `path\0sha256\n` per entry. `--write` resets
  `red_run` to `null`, because a rewrite means the tests changed.
- `--check` REDs, naming the path and never the content, when AC-TESTS.md changed, a test file changed, went missing
  or stopped being a regular file, a `## Files` entry was added or dropped, the spec pin changed, `red_run` is no
  longer bound to `files` (its `files_sha256` differs), or `red_run` names other ACs than the mapping.
  **`--require-red-run`** additionally REDs a test-first lock with no `red_run`, any `/1` lock, and a **bootstrap**
  lock — which has no red run at all — unless **`--allow-bootstrap`** is passed too. So exit 0 from
  `--require-red-run` alone means a recorded red run; with `--allow-bootstrap` it means a recorded red run OR a
  bootstrap lock, and the caller that passes it has said it accepts the weaker evidence. `--check` alone being GREEN
  never means a red run happened.

### Bootstrap — a `spec_kind: test-infra` SPEC

The increment that sets up the test runner cannot have failing tests first, so `/pharn-test` writes no tests, runs
nothing, and records `mode: "bootstrap"`: `mapping: null`, `files: []`, `red_run: null`, the `spec` pin read from
SPEC.md, and `bootstrap: { "spec_kind": "test-infra", "levels": [...] }` — the SPEC's criteria levels, sorted.
`--write-bootstrap` refuses a SPEC that is not Approved and un-drifted (it SHELLS `check-spec-approved.mjs` — a
bootstrap lock has no AC-TESTS.md through which `check-ac-tests.mjs` could bind the pin), is not `test-infra`, or has
an unusable level, and refuses when an AC-TESTS.md exists. `--check` of a bootstrap lock re-runs the same approval
check and REDs a SPEC no longer Approved and un-drifted, a changed pin, kind or level set, and an AC-TESTS.md that
appeared.

**This is WEAKER than test-first, and the record says so:** nothing showed a test failing before the build. What a
later verify stage will require instead: after the build, the level's gate is discovered, runs, and reports at least
one collected `passed` test with per-test results available.

`spec_kind` is covered by the SPEC's approval pin (`spec-template.md`, "`spec_kind`"), so an Approved feature SPEC
cannot become a bootstrap one without the pin moving, which every chain check reports as drift. **Bounded:** the
floor sees a re-pin, not an approver — `check-spec.mjs --hash` plus a frontmatter edit re-pins, and a self-consistent
re-pin (with a matching re-plan) passes.

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
leaves the lock stale is caught by `ac-tests-lock.mjs --check`.

## What it proves, and what it does not (P0)

- **Floor:** the mapping is complete and consistent with the current Approved SPEC (enum/regex/set membership, and
  content-hash through the shelled chain check); `/pharn-test` can write only the mapped files, and the build's
  scope excludes them (the fix #7 hook); the lock pins the files as written (content-hash); every AC's test was
  collected and `failed` in a run bound to the mapping and the tree (enum membership over the per-test record, plus
  the fingerprint), and the lock's `red_run` is bound to its `files` (content-hash).
- **Bounded:** the build exclusion holds for the PLAN.md the checker read. An edit to PLAN.md after `/pharn-test`
  reopens it until something re-checks; `/pharn-build` does not re-check in 6.17.0. A Bash write bypasses every
  write hook (`LIMITS.md §6`), and `/pharn-test` runs before the reconcile anchor, so its own Bash writes are not
  reconciled.
- **Advisory:** that the tests are right, assert the AC's Then, or drive a good public target; that `/pharn-test`
  read only SPEC, PLAN and AC-TESTS.md (`reads:` is not enforced); that a test fails **because the behaviour is
  missing** — a test failing on a typo in its own body is `failed` too, and the collected/not-collected split is the
  only reason the record can tell apart. The lock certifies that the files are the ones it recorded, never who wrote
  them: a self-consistent rewrite of tests and lock passes, and so does a self-consistent forged results file and
  stamp over the live tree. The stamp and results digests in `red_run` are recorded, not re-checkable once the next
  run wipes `<out>`; only `files_sha256` is re-checked.
- `/pharn-test` can write **only** mapped test files. A shared helper or fixture lives inside one of them or is
  written by the build.
- **A mapped test file is assumed NEW.** Nothing checks that it did not already exist: an existing project test
  mapped here would be rewritten by `/pharn-test`, and `/pharn-regress`, which declares AC-TESTS.md's files, would
  treat it as the feature's own and drop it from the regression comparison. `/pharn-plan` is told to map only new
  files. That is a stated bound, not a check (no run has failed on it — P7).
