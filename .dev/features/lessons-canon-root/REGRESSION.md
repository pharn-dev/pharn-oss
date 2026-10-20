# REGRESSION — lessons-canon-root

Two runs. Run 2 is the standing verdict (`regression-report.json`); run 1 is kept for the record.

## Run 2 — after the GATE-2 fixes and the `origin/main` merge (standing)

- base: `dcf7b43d9928342ef74bcde3e4cf13cc258a2198`. `origin/main` at 6.67.0 is the merge-base of the clean,
  committed branch.
- inside: the 31 paths in `regression-report.json` `.inside`. `scope` exited 0, so no changed path falls outside the
  PLAN's `## Files`. `escape_exempt` lists this feature's own stage artifacts.
- outside gates: 159 test files, `validate`, and one structural eval pair. The style gates were skipped because no
  shared style config was touched.

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `tests` (159 outside test files)                                                           | 1    | 0    |
| `validate`                                                                                 | 0    | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |

- regressions: none
- pre_existing: `tests`. At base, 5199 tests passed and 1 failed. The failure is
  `render-run-report.test.mjs`'s CTX-14 case, which is environment-dependent: the base tree has no `.git`. Head passed
  all 159 files.

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.** `check-regress.mjs verdict`
exited 0. This stage catches what its suite catches, nothing more.

## Run 1 — at build, before the fixes and the merge

- base: `6b49cafdb6c98da52e01fafd72b93b1335021e44`, the HEAD of the dirty working tree.
- Result: `tests` 1 → 1 (pre_existing); `validate` 0 → 0; `structural` 0 → 0. The verdict was `no-regressions`.
- Every red test in run 1 was a timing- or git-dependent case in `stage-regress`, `stage-verify`,
  `entry-base-evidence` or `render-run-report`. Each took over 19 s, on a machine running several parallel agents'
  suites. None of those files is inside the feature. Run 2's head and `/pharn-dev-verify`'s whole-suite `npm test`
  both passed.

## How the runs deviated from the pinned procedure (advisory orchestration, recorded)

- The pinned shell forms are refused in this worktree-isolated session: `git worktree add` into `$TMP`,
  `cat … | xargs node --test` and `$?` capture. The same steps ran from `.pharn/pharn-dev-regress/run.mjs`, which uses
  argv arrays through `spawnSync` and records exit codes only.
- Each baseline was a `git archive` of the base SHA, extracted outside the repo into the session scratchpad, with
  `node_modules` symlinked in and no `.git`. That is why the base `tests` gate is red, and a red base gate counts as
  pre-existing. **In both runs the `tests` gate could therefore not have reported a regression.** The backstop is
  `/pharn-dev-verify`'s whole-suite `npm test` at HEAD, which passed.
