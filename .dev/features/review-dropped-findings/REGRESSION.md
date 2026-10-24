# REGRESSION — review-dropped-findings

- base: `18037dd423b8339815d6944226213883f9a8151c` (`HEAD`; a working-tree build, so `base = HEAD`)
- inside (14): the plan's declared files plus this feature's own `PLAN.md` / `GRILL.md` (see
  `regression-report.json` `.inside`); `scope` exited 0 (no escape; `escape_exempt` = this feature's `PLAN.md`)
- outside: 168 test files through the per-test reporter, `validate`, the one committed eval pair
  (`structural:…expected-injection-comment.json`), and the three style gates — run because `.prettierignore`, a
  shared style config, is inside. The base checkout ran `npm ci` first.

## Per-gate exit codes (base → head)

| gate                                  | base | head |
| ------------------------------------- | ---- | ---- |
| tests (per-test: 5472 → 5475 passed)  | 0    | 0    |
| validate                              | 0    | 0    |
| lint                                  | 0    | 0    |
| format:check                          | 0    | 0    |
| lint:md                               | 0    | 0    |
| structural:expected-injection-comment | 0    | 0    |

`regressions[]`: none · `pre_existing[]`: none · `per_test.new_failures`: none.

## Run history (iterations, recorded rather than overwritten)

1. **Run 1 — `regressions: ["tests"]`, exit 1.** One new head failure outside the feature:
   `pharn/floor/check-regress.test.mjs` "★ recurrence guard: the enum covers EVERY pharn/features/<name>/ artifact the
   commands declare". The command now names `pharn/features/<name>/merge-report.json`, and `PIPELINE_ARTIFACTS` did
   not hold it. A real regression; fixed by plan amendment A1 (`PLAN.md`), after reconciling the open epoch CLEAN
   and re-anchoring.
2. **Run 2 — `regressions: ["lint"]`, exit 1, a HARNESS artifact.** `eslint .` reached this stage's own scratch
   runner `.pharn/pharn-dev-regress/run.mjs` (an unused import); no product or repo file. The import was removed and
   ONLY the head `lint` gate was re-measured (exit 0) over an otherwise unchanged tree; the verdict was recomputed
   from the same base/head maps and per-test records. Noted for review: `eslint .` does not ignore the gitignored
   `.pharn/` scratch tree.
3. **Verdict (below)** — the run-2 maps with the re-measured head `lint`.

## Verdict

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature** (`check-regress.mjs verdict`
exit 0, `no-regressions`).

This catches exactly what the suite above catches, nothing more: a regression no deterministic check covers is
invisible here.
