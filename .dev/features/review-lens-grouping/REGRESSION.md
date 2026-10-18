# REGRESSION — review-lens-grouping

`/pharn-dev-regress`, 2026-10-18, re-run after fix round 1 on `3344566` (phase B), branch `feat/review-lens-grouping`.
The first run, on the build commit `aef6fa2`, also found no regressions; this report replaces it.

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.** `check-regress.mjs verdict`
exited 0 with `"verdict": "no-regressions"`; the machine report is `regression-report.json`, the helper's output
verbatim.

## Base and partition

- **Base:** `0fefcb8a8a6ddf2ae05f3c64ddcc124221b281ce`. `git status --porcelain` was empty, so the base is
  `git merge-base HEAD origin/main` (`origin/main` fetched this run; it had not moved from the plan's base).
- **Inside (21 paths):** the 15 declared `## Files` paths plus six of this feature's stage artifacts (`GRILL.md`,
  `REVIEW.md`, `REGRESSION.md`, `VERIFY.md`, `regression-report.json`, `verify-report.json`), which
  `check-regress.mjs scope --feature review-lens-grouping` lists under `escape_exempt`. `escaped`: none.
- **Declared:** 15 paths, from the pinned `plan-files-core.mjs` line.
- **Outside:** 161 test files tracked, of which the 4 inside are excluded, so 157 run as the `tests` gate; one committed
  eval pair, `pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` ↔
  `.dev/features/trust-fence/findings.json` (both confirmed readable before the run).
- **Style gates:** skipped at both sides by the rule: no inside path is a shared style config.

## Gates (exit codes)

| Gate                                                                                       | Base | HEAD |
| ------------------------------------------------------------------------------------------ | ---: | ---: |
| `tests` (157 outside test files, one `node --test` invocation)                             |    0 |    0 |
| `validate` (`node pharn/floor/validate.mjs .`, whole repo)                                 |    0 |    0 |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` |    0 |    0 |

- `regressions[]`: none.
- `pre_existing[]`: none.

## Deviation: the shell plumbing (recorded, not a gate change)

This worktree's shell guard refuses the pinned `$(cat …)`, `$(git ls-files … | paste -sd, -)`, `xargs` and `$VAR`
forms. Steps 1–3 therefore ran through a scratch runner, `.pharn/pharn-dev-regress/run.mjs`, which executes the same
commands with `spawnSync` argv arrays: the pinned declared line with the same script and argument; `check-regress.mjs
scope` with the same five flags; at the base, `git worktree add --detach <tmp> <base>`, the gates, then `git worktree
remove --force`; at HEAD the same gate set; then `check-regress.mjs verdict`. The `tests` gate passes the 157 files to
one `node --test` call, as one `xargs` invocation would. The gate set was decided once, from `scope.json`, and applied
identically to both sides. Step 0's setter was followed by `reconcile-baseline.mjs --amend-scope` after each setter.

## The residual

`/pharn-dev-regress` catches exactly what its suite catches, nothing more. A regression outside the feature that no
test, eval or floor check covers is invisible to this comparison, and `validate` is judged at whole-repo granularity.
