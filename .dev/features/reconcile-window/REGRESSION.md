# REGRESSION — reconcile-window

- Base: `fb997e4b` (the tip of `origin/batch/audit-2026-11-03` this branch forked from, passed as `--base` by the
  orchestrating run: the tree was clean, and the default `merge-base HEAD origin/main` would have counted group S's
  batch commits as this feature's changes).
- Inside (18 paths): the plan's 16 declared files plus this feature's `PLAN.md` and `GRILL.md`. `check-regress.mjs
scope` exited 0 (no path outside the declared writes).
- Outside gates: 176 test files, `validate`, and the one committed eval pair. The style gates were skipped: inside
  touches no shared style config (`eslint.config.mjs`, `.prettierrc.json`, `.prettierignore`,
  `.markdownlint-cli2.jsonc`).

| gate                                                                                                 | base | head |
| ---------------------------------------------------------------------------------------------------- | ---- | ---- |
| `tests` (per-test: base 5967 passed / 0 failed / 6 skipped; head 5972 passed / 0 failed / 1 skipped) | 0    | 0    |
| `validate`                                                                                           | 0    | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json`           | 0    | 0    |

`regressions[]`: none. `pre_existing[]`: none. `per_test.new_failures`: none.

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature** (`check-regress.mjs verdict` exit
0, `"verdict": "no-regressions"`; machine report `regression-report.json`, verbatim).

This certifies only the comparison: it catches what the outside suite catches, nothing more.
