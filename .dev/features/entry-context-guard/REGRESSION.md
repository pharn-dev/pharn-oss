# REGRESSION — entry-context-guard

- **Base:** `61deb6b168c90bfd163a58d3c04e638ad873f516` (the working tree was dirty, so `base = HEAD`; origin/main 7.10.3).
- **Inside (17):** the 15 declared `## Files` paths plus this feature's `PLAN.md` and `GRILL.md`; `check-regress.mjs
scope` reported `escaped: []` and exempted only `PLAN.md` / `GRILL.md` (`escape_exempt`).
- **Outside gates:** 188 tracked test files (`tests`, per-test records through the reporter), `validate`, and the one
  committed eval pair (`structural:…/expected-injection-comment.json`). Style gates skipped: no shared style config is
  inside.

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---: | ---: |
| `tests`                                                                                    |    0 |    0 |
| `validate`                                                                                 |    0 |    0 |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` |    0 |    0 |

Per test: base 6,298 passed, 0 failed, 7 skipped; head 6,304 passed, 0 failed, 1 skipped; `new_failures: []`.

- `regressions[]`: none
- `pre_existing[]`: none

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature** (`check-regress.mjs verdict`
exit 0, `regression-report.json` `.verdict` `no-regressions`).

Residual: this catches exactly what the outside suite catches, nothing more; a regression no test, rule or eval covers
is invisible here.
