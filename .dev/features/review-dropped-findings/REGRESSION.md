# REGRESSION — review-dropped-findings

- base: `01b0c9ca40e0c3cbcee9325461fb8f64cd3654af` — the merge-base with `origin/main` (6.72.2). The feature was
  committed and `origin/main` merged in before this run, so the tree was clean and Step 1's second branch applies.
- inside (16): the plan's declared files plus this feature's own artifacts (see `regression-report.json` `.inside`);
  `scope` exited 0 (no escape; `escape_exempt` = this feature's `PLAN.md`, `REGRESSION.md`,
  `regression-report.json`)
- outside: 168 test files through the per-test reporter, `validate`, the one committed eval pair
  (`structural:…expected-injection-comment.json`), and the three style gates — run because `.prettierignore`, a
  shared style config, is inside. The base checkout ran `npm ci` first.

## Per-gate exit codes (base → head)

| gate                                  | base | head |
| ------------------------------------- | ---- | ---- |
| tests (per-test: 5479 → 5482 passed)  | 0    | 0    |
| validate                              | 0    | 0    |
| lint                                  | 0    | 0    |
| format:check                          | 0    | 0    |
| lint:md                               | 0    | 0    |
| structural:expected-injection-comment | 0    | 0    |

`regressions[]`: none · `pre_existing[]`: none · `per_test.new_failures`: none.

## Run history (iterations, recorded rather than overwritten)

1. **Run 1 (base `18037dd`, working tree) — `regressions: ["tests"]`, exit 1.** One new head failure outside the
   feature: `pharn/floor/check-regress.test.mjs` "★ recurrence guard: the enum covers EVERY pharn/features/<name>/
   artifact the commands declare". The command now names `pharn/features/<name>/merge-report.json`, and
   `PIPELINE_ARTIFACTS` did not hold it. A real regression; fixed by plan amendment A1 (`PLAN.md`), after reconciling
   the open epoch CLEAN and re-anchoring.
2. **Run 2 (base `18037dd`) — `regressions: ["lint"]`, exit 1, a HARNESS artifact.** `eslint .` reached this stage's
   own scratch runner `.pharn/pharn-dev-regress/run.mjs` (an unused import); no product or repo file. Fixed in the
   runner; that run's verdict, recomputed with the re-measured head `lint`, was `no-regressions`. Noted for review:
   `eslint .` does not ignore the gitignored `.pharn/` scratch tree.
3. **Run 3 (this report, base `01b0c9c`)** — after the GATE-2 review fix (`reportSafe` for `source`/`path`), the
   commit, and the merge of `origin/main` 6.72.1 + 6.72.2. A full fresh run of every gate on both sides.

## Verdict

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature** (`check-regress.mjs verdict`
exit 0, `no-regressions`).

This catches exactly what the suite above catches, nothing more: a regression no deterministic check covers is
invisible here.
