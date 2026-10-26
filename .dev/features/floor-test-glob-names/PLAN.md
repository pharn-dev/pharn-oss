# PLAN — floor-test-glob-names

- spec_content_hash: d5a974303fd0b9568945c60423ae5a89c57d7b65f5baa03657e317fbe64f33a5
- applied_lessons: [L1, L26, L41, L50, L68, L75, L78]
- increment: rename the three product-floor modules whose `test-*` names Node's default `node --test` patterns match, so a bare `node --test` in an install runs only the project's own tests, and pin that with a suite that asks Node itself.
- layer(s): product floor (`pharn/floor/`), pharn-contracts (two cites), dev guides
- constitution_refs: [P0, P3, P4, P5, P6, P7]
- base: `origin/main` @ `bc63759f` (SKILLS_VERSION 7.0.0)

## Why (P7 — the recorded failure)

Measured 2026-10-25 by the post-merge `/pharn-loop` acceptance run on a scratch project installed with pharn-cli 0.14.1
from 7.0.0: the entry gate's `test` (a bare `node --test`) counted 4 tests, 3 of them `pharn/floor/test-infra-core.mjs`,
`test-results-core.mjs` and `test-results-formats.mjs`. Re-measured here on Node 24.13.1 with stubs: a bare
`node --test` runs `test-infra-core`, `test-results-core`, `test-results-formats` (and would run `test-infra-pin-core`),
and does NOT run `ac-test-infra-core`, `per-test-results-core`, `per-test-results-formats` or `results-record-core`. It
searches `test/` directories, but not `test-fixtures/` and not dot-directories (`.claude/` is never reached).

Survey of the rest of the shipped surface (`git ls-files pharn .claude`, minus `*.test.*`, which never ships): no
other shipped file matches `*.test.*`, `*-test.*`, `*_test.*`, `test-*`, `test.*` or a `test/` directory. The only
other `test`-prefixed shipped path is `.claude/commands/pharn-test.md`, which is not JavaScript.

## Decisions

- **New names:** `ac-test-infra-core.mjs` (joins the `ac-*` family it serves: `ac-gate-core`, `ac-tests-core`,
  `ac-tests-lock`), `per-test-results-core.mjs` and `per-test-results-formats.mjs` (the contract's own term, "the
  per-test record"; `test-results` stays greppable). The two paired suites move with them
  (`ac-test-infra-core.test.mjs`, `per-test-results-core.test.mjs`). No export, behaviour or contract shape changes.
- **Version: 7.0.1 (patch).** A correction to shipped bytes. Nothing a user's project reads changes shape: nothing in
  an install imports these modules except the floor itself, and the contracts' schemas are untouched.
- **`MIN_CLI` stays 0.14.0.** pharn-cli (`origin/main` @ `33d0ec9`, `src/lib/install-capabilities.ts:85,371` and
  `src/lib/install-manifest.ts`) copies the floor by walking the directory, minus `*.test.(mjs|cjs)` and
  `test-fixtures/`, so every CLI at or above the gate installs the new names. No older CLI installs a broken tree.
- **No pharn-cli move entry in this increment.** pharn-cli has a retire-at-matching-hash path only for the two old
  root docs (`src/lib/root-migration.ts`). For a floor file upstream stops shipping, `pharn update` lists it under
  ORPHANED and never deletes it (`src/lib/orphans.ts`). So an existing install keeps the three old files, which still
  load (they import only each other and floor siblings that still exist) and still run under a bare `node --test`
  until deleted. The CHANGELOG tells the user to delete them by hand. Teaching pharn-cli to retire them is a separate
  change in another repository, named as follow-up `pharn-cli-retire-renamed-floor`.
- **`pharn/LIMITS.md` §9 (line 632) cites `pharn/floor/test-infra-core.mjs`.** It is a trusted doc, so the edit is a
  HUMAN-PATCH (`.dev/features/floor-test-glob-names/HUMAN-PATCH.md`), applied by the maintainer **after
  `/pharn-dev-verify`** (L68), as its own commit on this branch, or later in its own patch release.

## Applied lessons

- L1 — the meta-docs this changes are named in `## Files`: `CHANGELOG.md` (the 7.0.1 section), `SKILLS_VERSION`, and
  `README.md`'s version badge (found by the dry run's `check:badge` RED: the badge states the version, not the file
  names, so the referent sweep could not see it). `CLAUDE.md`, `CONTRIBUTING.md`, `docs/**` and the product commands
  name none of the three files (`git grep`, zero hits), so none is edited.
- L26 — the LIMITS.md edit is verified at a real path: the whole build, the LIMITS edit included, is first replayed in
  a throwaway copy of HEAD (`git archive` + `git init`, `node_modules` linked) and `npm run check` runs there, so
  prettier, markdownlint and eslint resolve their configs exactly as in the repo.
- L41 — a relocation splits paired constants: every spelled-out path or basename (`check-loop-fresh.test.mjs:1550`'s
  module list and `:1739`, `check-test-stage.test.mjs:600`'s fixture path, `gate-run-core.test.mjs:614`,
  `test-infra-core.test.mjs:659,813,818-824,1256`, `test-results-core.test.mjs:230,236`) is in `## Files` and
  rewritten by the same rule. No parameter default names these files; they are reached only by static import.
- L50 — swept by REFERENT: every cite of the three basenames, with or without `.mjs`, possessive or bare
  (`test-infra-core's`, `test-infra-core scriptNamedFiles`), on every surface (`git grep` over the whole tree), plus a
  wrap-tolerant pass for a name split at a hyphen across lines (zero hits). The claim axis is empty: no shipped text
  states the defect.
- L68 — the one human-only edit (LIMITS.md §9) lands after `/pharn-dev-verify`, never inside the anchor→verify window,
  and the maintainer is told so at GATE 1 (this plan) and at GATE 2.
- L75 — every hit is recorded below with a disposition, so `/pharn-dev-grill` can re-run the grep.
- L78 — two lines record past state and keep the old name with a `7.0.1` label on the same line
  (`quote-core.mjs:9`, "born in test-results-formats.mjs (6.22.0)"; `check-loop-fresh.mjs:8`, the 6.21.1 crash
  narrative). The build's rewrite skips every line that carries `7.0.1`, and each renamed module gains one header line
  recording its old name. Released CHANGELOG sections, `.dev/features/**` and canon keep their old names whole.

## Files

- `pharn/floor/test-infra-core.mjs` (delete)
- `pharn/floor/ac-test-infra-core.mjs` — renamed from test-infra-core.mjs (git mv), self-cites + one header line — product floor
- `pharn/floor/test-results-core.mjs` (delete)
- `pharn/floor/per-test-results-core.mjs` — renamed from test-results-core.mjs, self-cites + header line — product floor
- `pharn/floor/test-results-formats.mjs` (delete)
- `pharn/floor/per-test-results-formats.mjs` — renamed from test-results-formats.mjs, self-cites + header line — product floor
- `pharn/floor/test-infra-core.test.mjs` (delete)
- `pharn/floor/ac-test-infra-core.test.mjs` — renamed suite, cites — floor test
- `pharn/floor/test-results-core.test.mjs` (delete)
- `pharn/floor/per-test-results-core.test.mjs` — renamed suite, cites — floor test
- `pharn/floor/default-test-glob.test.mjs` — NEW: Node-as-oracle probe that no shipped floor/hook file is a default test file — floor test
- `pharn/floor/ac-gate-core.mjs` — import + cites — product floor
- `pharn/floor/ac-tests-lock.mjs` — imports + cites — product floor
- `pharn/floor/build-gate.mjs` — import + cite — product floor
- `pharn/floor/check-ac-tests.mjs` — import + cites — product floor
- `pharn/floor/check-loop-fresh.mjs` — dated-record label (L78) — product floor
- `pharn/floor/check-regress.mjs` — imports + cites — product floor
- `pharn/floor/gate-exclusion-core.mjs` — import + cites — product floor
- `pharn/floor/gate-run-core.mjs` — cite — product floor
- `pharn/floor/loop-fresh-core.mjs` — import + cite — product floor
- `pharn/floor/quote-core.mjs` — cite + dated-record label (L78) — product floor
- `pharn/floor/red-run-core.mjs` — import + cites — product floor
- `pharn/floor/regress-install-config-core.mjs` — import + cite — product floor
- `pharn/floor/run-gates.mjs` — cite — product floor
- `pharn/floor/ac-gate-core.test.mjs` — import — floor test
- `pharn/floor/build-gate-core.test.mjs` — import — floor test
- `pharn/floor/check-loop-fresh.test.mjs` — module list + paths — floor test
- `pharn/floor/check-red-run.test.mjs` — import + cite — floor test
- `pharn/floor/check-test-stage.test.mjs` — fixture path + cites — floor test
- `pharn/floor/cost-hostile-input.test.mjs` — import + message — floor test
- `pharn/floor/gate-exclusion-core.test.mjs` — import — floor test
- `pharn/floor/gate-run-core.test.mjs` — path list — floor test
- `pharn/floor/regress-install-config-core.test.mjs` — import — floor test
- `pharn/floor/run-gates.test.mjs` — import — floor test
- `pharn/pharn-contracts/ac-tests.md` — four cites — pharn-contracts
- `pharn/pharn-contracts/test-results-record.md` — two cites (one in `purpose:`) — pharn-contracts
- `.dev/floor/node-test-results-reporter.test.mjs` — imports + cite — dev floor test
- `.dev/guides/floor-ac-tests.md` — four cites — dev guide
- `.dev/guides/floor-gates.md` — four cites — dev guide
- `SKILLS_VERSION` — 7.0.0 → 7.0.1
- `README.md` — the version badge only (7.0.0 → 7.0.1; `check:badge`)
- `CHANGELOG.md` — new `## [7.0.1]` section, `### Fixed`
- `.dev/features/floor-test-glob-names/HUMAN-PATCH.md` — the proposed LIMITS.md §9 edit
- `.dev/features/floor-test-glob-names/BUILD.md` — build note

### Not touched

- `pharn/LIMITS.md` — trusted, human-only: HUMAN-PATCH, after verify (L68).
- `.dev/memory-bank/lessons-learned.md` — canon; L62's two mentions are a dated record (L78).
- `CHANGELOG.md` released sections, `.dev/features/**` — frozen / dated audit trails (L78's file-level class).

## Sweep record (L50, L75)

Referent axis: `git grep -n -E 'test-(infra-core|results-core|results-formats)'` over the whole tree at `bc63759f`.
Every hit outside `.dev/features/**` and `CHANGELOG.md`, by file (line numbers at `bc63759f`), with its disposition:

| file                                               | lines                                     | disposition                                |
| -------------------------------------------------- | ----------------------------------------- | ------------------------------------------ |
| `.dev/floor/node-test-results-reporter.test.mjs`   | 3, 14, 15                                 | rewritten                                  |
| `.dev/guides/floor-ac-tests.md`                    | 23, 25, 133, 141                          | rewritten                                  |
| `.dev/guides/floor-gates.md`                       | 112, 117, 122, 183                        | rewritten                                  |
| `.dev/memory-bank/lessons-learned.md`              | 2188, 2196                                | kept: canon, dated record (L62, 6.22.0)    |
| `pharn/LIMITS.md`                                  | 632                                       | HUMAN-PATCH, after verify                  |
| `pharn/floor/ac-gate-core.mjs`                     | 9, 10, 51, 55, 87                         | rewritten                                  |
| `pharn/floor/ac-gate-core.test.mjs`                | 28                                        | rewritten                                  |
| `pharn/floor/ac-tests-lock.mjs`                    | 29, 78, 109, 111, 225, 545                | rewritten                                  |
| `pharn/floor/build-gate-core.test.mjs`             | 22                                        | rewritten                                  |
| `pharn/floor/build-gate.mjs`                       | 30, 63                                    | rewritten                                  |
| `pharn/floor/check-ac-tests.mjs`                   | 32, 34, 36, 66, 96, 142                   | rewritten                                  |
| `pharn/floor/check-loop-fresh.mjs`                 | 8                                         | kept + `7.0.1` label (L78)                 |
| `pharn/floor/check-loop-fresh.test.mjs`            | 1380, 1550, 1739                          | rewritten                                  |
| `pharn/floor/check-red-run.test.mjs`               | 21, 248                                   | rewritten                                  |
| `pharn/floor/check-regress.mjs`                    | 99, 125, 126, 593                         | rewritten                                  |
| `pharn/floor/check-test-stage.test.mjs`            | 577, 598, 600                             | rewritten                                  |
| `pharn/floor/cost-hostile-input.test.mjs`          | 1142, 1151                                | rewritten                                  |
| `pharn/floor/gate-exclusion-core.mjs`              | 11, 26, 42                                | rewritten                                  |
| `pharn/floor/gate-exclusion-core.test.mjs`         | 12                                        | rewritten                                  |
| `pharn/floor/gate-run-core.mjs`                    | 272                                       | rewritten                                  |
| `pharn/floor/gate-run-core.test.mjs`               | 614                                       | rewritten                                  |
| `pharn/floor/loop-fresh-core.mjs`                  | 161, 569                                  | rewritten                                  |
| `pharn/floor/quote-core.mjs`                       | 9; 26                                     | 9 kept + `7.0.1` label (L78); 26 rewritten |
| `pharn/floor/red-run-core.mjs`                     | 14, 50, 211, 218                          | rewritten                                  |
| `pharn/floor/regress-install-config-core.mjs`      | 12, 46                                    | rewritten                                  |
| `pharn/floor/regress-install-config-core.test.mjs` | 12                                        | rewritten                                  |
| `pharn/floor/run-gates.mjs`                        | 83                                        | rewritten                                  |
| `pharn/floor/run-gates.test.mjs`                   | 33                                        | rewritten                                  |
| `pharn/floor/test-infra-core.mjs` (renamed)        | 2, 25, 153, 154                           | rewritten                                  |
| `pharn/floor/test-infra-core.test.mjs` (renamed)   | 1, 47, 659, 813, 818, 819, 820, 824, 1256 | rewritten                                  |
| `pharn/floor/test-results-core.mjs` (renamed)      | 1, 5, 37, 61                              | rewritten                                  |
| `pharn/floor/test-results-core.test.mjs` (renamed) | 1, 2, 39, 52, 230, 236, 1259              | rewritten                                  |
| `pharn/floor/test-results-formats.mjs` (renamed)   | 1, 7, 49, 79, 102, 106                    | rewritten                                  |
| `pharn/pharn-contracts/ac-tests.md`                | 102, 335, 401, 415                        | rewritten                                  |
| `pharn/pharn-contracts/test-results-record.md`     | 5, 106                                    | rewritten                                  |

`.dev/features/**` (69 files) and `CHANGELOG.md`'s released sections: kept whole (dated records, frozen). Wrap pass
(a name split at a hyphen across lines, every tracked `.mjs/.cjs/.js/.md/.json` outside those two): zero hits.
Grill re-run: the same grep after the build must show, outside the kept classes, only lines that carry `7.0.1`.

## How the build writes (this session runs in a desktop worktree)

The write hooks this session's Write/Edit calls reach judge from the main checkout, so every Write in the worktree is
denied as `.claude/worktrees/…` (memory note `worktree-session-hook-root`, measured again in this run). If the human
approves the route at GATE 1, the build runs one scratchpad script that, before every write or rename, spawns this
worktree's own `protect-trusted-paths.cjs` and `enforce-writes-scope.cjs` with cwd and `CLAUDE_PROJECT_DIR` set to
the worktree and a synthesized PreToolUse Write payload, and writes only when both exit 0. The scope is this plan's
`## Files`, set by the setter and anchored before any write, so `/pharn-dev-verify`'s reconcile judges every change.
The renames are `git mv` after both ends pass the hooks.

## Contracts satisfied

- `pharn/pharn-contracts/ac-tests.md` "The test-infrastructure pin" and `test-results-record.md` — only their cites of
  the computing module change; no field, schema or reason changes.
- `pharn/pharn-contracts/reconciliation-record.md` — every write is in the anchored scope; renames are judged by path.

## Evals to write (P1)

- No capability changes, so no eval. The new suite `default-test-glob.test.mjs`:
  - every shipped floor/hook file stubbed at its installed path + a `test-*` control → a bare `node --test` runs exactly
    the control (non-vacuity, L60);
  - the three retired names → all three run (the probe would have caught the recorded failure);
  - the shipped set is non-empty, holds known members, and excludes `*.test.*`, `test-fixtures/` and the control (L34).

## Guarantee audit (P0)

- "A bare `node --test` in a fresh install runs only the project's tests" → advisory, backed by a deterministic test in
  `npm test` whose oracle is the Node running the suite (not one of the three floor primitives; bounded to that Node
  version and to the CLI copy rule as restated in the test).
- "Every live cite was updated" → advisory; the sweep record above is re-checkable by grep (L75).
- "`MIN_CLI` need not move" → advisory, from reading pharn-cli `origin/main` @ `33d0ec9`.
- "The build wrote only `## Files`" → floor: hook (both real hooks judge each write) + content-hash (reconcile at verify).
- "Existing installs are fixed" → NOT claimed: they keep the old files until a human deletes them.

## Trust audit (P2)

No new untrusted input. The new suite reads only this repo's own file names and Node's TAP output of stubs it wrote.

## Determinism audit (P5)

The rewrite is three fixed regexes over a fixed file list, skipping lines that carry `7.0.1`; the suite's verdict is
set equality over TAP case names.

## Open questions (HALT)

- None from live state. GATE 1 asks the human to approve the plan and the hook-checked script write route.
