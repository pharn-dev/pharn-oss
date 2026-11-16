# REGRESSION — gate-timeout-above-bash-cap

- base: `edd15ea4861785f426228414a6ae97d2a7956ed9` (`base = HEAD` on a working-tree build: nothing is committed yet)
- measured: 2026-11-16, re-run on the final tree after the review fix round, finished 11:50 CET. The base ran in a
  detached `git worktree`, the head in the working tree. The first run (finished 11:00, before the fix round) is
  superseded; it read the same verdict over 25 inside paths. A second re-run was stopped part-way (before any verdict)
  to fold in the re-review's wording fix, its base worktree removed.
- machine report: `regression-report.json` (the `check-regress.mjs verdict` output verbatim, `cmp`-checked; exit 0)

## Partition (`check-regress.mjs scope --feature gate-timeout-above-bash-cap`, exit 0)

- **inside (29):** the plan's 24 declared `## Files` paths less `.dev/floor/stage-load-budget.test.mjs` (declared
  "only if the measured totals need it"; they did not, so it is unchanged), plus this feature's `PLAN.md`, `GRILL.md`,
  `REGRESSION.md`, `regression-report.json`, `VERIFY.md` and `verify-report.json`, listed under `escape_exempt` (each
  written by its own stage under its own scope).
- **escaped:** none.
- **outside gates:** `tests` (189 outside test files, through the per-test reporter), `validate` (whole repo),
  `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` (paired with
  `.dev/features/trust-fence/findings.json`; both paths checked readable on each side before running).
- **style gates:** skipped on both sides; `inside` touches no shared style config.

## Gates, base → head (exit codes)

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `tests`                                                                                    | 0    | 0    |
| `validate`                                                                                 | 0    | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |

Per-test (`per_test`): base 6207 passed / 0 failed / 7 skipped / 0 suite errors; head 6208 passed / 0 failed /
6 skipped / 0 suite errors; `new_failures`: none; `still_failing`: 0.

- `regressions[]`: none
- `pre_existing[]`: none

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.**

This covers exactly what the outside suite covers, nothing more. A regression no deterministic check covers is
invisible to this comparison, and the comparison does not certify the feature itself (that is `/pharn-dev-verify`).

## Orchestration notes (advisory)

- The pinned shell forms (`cat outside-tests.txt | xargs node --test …; T=$?`, the `printf` capture) are refused in
  this worktree-isolated session, so the same gate runs were made by a node runner with argv arrays
  (`pharn/.run/pharn-dev-regress/run.mjs`): the pinned reporter by absolute path, `--test-reporter-destination` per
  side, the earlier record removed first, exit codes only. Its first run stopped before measuring anything (a bug in the
  runner's reading of `outside_eval_pairs`, which are objects); the base worktree was removed and the run repeated.
