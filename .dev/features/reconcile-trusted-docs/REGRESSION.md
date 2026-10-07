# REGRESSION — reconcile-trusted-docs

- Base: `dc0212b72b3e42d0b79d0e3285ea6857e7a153ba` (`HEAD`, the stack top #330, because the working tree carries
  the uncommitted build).
- Inside: 12 paths, the 10 declared `## Files` paths plus this feature's `PLAN.md` and `GRILL.md`.
  `check-regress.mjs scope` exited 0 with no escape.
- Outside gates: 150 test files, `validate`, and the one committed eval pair. The style gates were skipped because
  no shared style config is inside.

| Gate                                                                                       | base → head |
| ------------------------------------------------------------------------------------------ | ----------- |
| `tests` (150 outside test files)                                                           | 0 → 0       |
| `validate`                                                                                 | 0 → 0       |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0 → 0       |

`regressions[]`: none · `pre_existing[]`: none.

**REGRESSIONS: none.** No deterministically detectable breakage outside the feature. This stage catches exactly
what its suite catches and nothing more. The feature's own tests are inside the feature, and `/pharn-dev-verify`
runs them.

The gates ran through the scratch node runner under `.pharn/c1/`, with the command's gate set unchanged.
