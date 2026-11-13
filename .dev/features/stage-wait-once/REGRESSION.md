# REGRESSION — stage-wait-once

- base: `0ff6552708a335e0e1cf2304e1fa7cd7d76a1509` (the first run's `base = HEAD` on a working-tree build; after the
  PR commit it is passed as `--base`, the branch's fork point from `main`)
- measured: 2026-11-13, re-run after the PR's CI round (coverage tests, three review fixes), finished 12:17 CET; base
  in a detached `git worktree`, head in the working tree. Earlier runs (09:29–09:45, before the review fixes; 10:40,
  before the CI round) are superseded; the verdict JSON is byte-identical across the last two.
- machine report: `regression-report.json` (the `check-regress.mjs verdict` output verbatim, `cmp`-checked; exit 0)

## Partition (`check-regress.mjs scope --feature stage-wait-once`, exit 0)

- **inside (20):** the 12 declared `## Files` paths, plus this feature's eight stage artifacts (`PLAN.md`,
  `GRILL.md`, `REGRESSION.md`, `regression-report.json`, `VERIFY.md`, `verify-report.json`, `REVIEW.md`, `SHIP.md`),
  listed under `escape_exempt` (each written by its own stage under its own scope).
- **escaped:** none.
- **outside gates:** `tests` (192 outside test files, through the per-test reporter), `validate` (whole repo),
  `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` (paired with
  `.dev/features/trust-fence/findings.json`; both paths checked readable on each side before running).
- **style gates:** skipped on both sides; `inside` touches no shared style config.

## Gates, base → head (exit codes)

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `tests`                                                                                    | 0    | 0    |
| `validate`                                                                                 | 0    | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |

Per-test (`per_test`): base 6369 passed / 0 failed / 7 skipped / 0 suite errors; head 6375 passed / 0 failed /
1 skipped / 0 suite errors; `new_failures`: none; `still_failing`: 0.

- `regressions[]`: none
- `pre_existing[]`: none

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.**

This covers exactly what the outside suite covers, nothing more. A regression no deterministic check covers is
invisible to this comparison, and the comparison does not certify the feature itself (that is `/pharn-dev-verify`).
