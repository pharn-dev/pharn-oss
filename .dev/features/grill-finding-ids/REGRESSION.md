# REGRESSION — grill-finding-ids

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.**

This certifies only the comparison: `/pharn-dev-regress` catches exactly what its suite catches, nothing more. A
regression no test, `validate` rule or eval covers is invisible here.

- **Base:** `d5bdab0326b6e9f41e88a732db0831f6840ce6e0` (`HEAD`; the working tree held the uncommitted build, so the
  base is `HEAD` by the stage's rule).
- **Verdict:** `pharn/floor/check-regress.mjs verdict` exit `0`, `no-regressions` (machine report:
  `regression-report.json`, verbatim).
- **Run:** second run, after the review A1 fix (repair hints in `grill-findings-core.mjs` / `grill-findings.mjs`, the
  shape sentence in `pharn-grill.md`). The first run, before the fix, gave the same verdict and the same per-test
  counts.

## Partition

- **Inside (23 paths):** the build's changes (all declared in the plan's `## Files`; `scope` exit `0`, `escaped: []`)
  plus this feature's own stage artifacts, listed in `escape_exempt` because each is written by its own stage:
  `PLAN.md`, `REGRESSION.md`, `REVIEW.md`, `VERIFY.md`, `regression-report.json`, `verify-report.json`.
- **Outside:** 181 test files; 1 committed eval pair
  (`pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` ↔
  `.dev/features/trust-fence/findings.json`).
- **Style gates skipped on both sides:** the inside set touches no shared style config (`eslint.config.mjs`,
  `.prettierrc.json`, `.prettierignore`, `.markdownlint-cli2.jsonc`), so an outside style result cannot flip.

## Outside gates, base → head (exit codes)

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `tests` (181 files, per-test reporter)                                                     | 0    | 0    |
| `validate` (whole repo)                                                                    | 0    | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |

Per-test records: base 6,110 passed / 0 failed / 7 skipped; head 6,116 passed / 0 failed / 1 skipped; no suite
errors. `new_failures`: none. `still_failing`: 0.

- `regressions[]`: none.
- `pre_existing[]`: none.

Head passed 6 more tests and skipped 6 fewer than base, over the same 181 paths. The cause was not investigated (the
base side runs in a fresh worktree without `node_modules`, which may skip tests that need a dev dependency); no test
failed on either side, so it does not change the verdict.
