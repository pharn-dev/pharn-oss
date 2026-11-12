# REGRESSION — entry-context-guard

The final run, after two merges of `origin/main` (CORE-105 as 7.11.0, CORE-75 as 7.12.0) and the iteration-2 review
fixes. The first run (base `61deb6b1`, before the merges) was also `no-regressions`; it is superseded by this one.

- **Base:** `f47b94e1526630c240e08a729d1ff3cc260e6856` (`git merge-base HEAD origin/main`; the tree was clean).
- **Inside (22):** the 15 declared `## Files` paths plus this feature's own stage artifacts; `check-regress.mjs scope`
  reported `escaped: []`.
- **Outside gates:** 189 tracked test files (`tests`, per-test records through the reporter), `validate`, and the one
  committed eval pair (`structural:…/expected-injection-comment.json`). Style gates skipped: no shared style config is
  inside.

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---: | ---: |
| `tests`                                                                                    |    0 |    0 |
| `validate`                                                                                 |    0 |    0 |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` |    0 |    0 |

Per test: base 6,326 passed, 0 failed, 7 skipped; head 6,332 passed, 0 failed, 1 skipped; `new_failures: []`.

- `regressions[]`: none
- `pre_existing[]`: none

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature** (`check-regress.mjs verdict`
exit 0, `regression-report.json` `.verdict` `no-regressions`).

Residual: this catches exactly what the outside suite catches, nothing more; a regression no test, rule or eval covers
is invisible here.
