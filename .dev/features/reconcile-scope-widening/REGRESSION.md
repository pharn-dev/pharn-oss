# REGRESSION — reconcile-scope-widening

- Base: `2a2e5a10272e419dd7a1f745c185a83714631469`. This is `HEAD` on main (6.53.0); the working tree carries the
  uncommitted build.
- Inside: 13 paths — the 11 declared `## Files` paths plus this feature's `PLAN.md` and `GRILL.md`.
  `check-regress.mjs scope` exited 0 with no escape.
- Outside gates:
  - 151 test files;
  - `validate`;
  - the one committed eval pair.

  The style gates were skipped because no shared style config is inside.

| Gate                                                                                       | base → head |
| ------------------------------------------------------------------------------------------ | ----------- |
| `tests` (151 outside test files)                                                           | 0 → 0       |
| `validate`                                                                                 | 0 → 0       |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0 → 0       |

`regressions[]`: none · `pre_existing[]`: none.

**REGRESSIONS: none.** No deterministically detectable breakage outside the feature. This stage catches exactly what
its suite catches, and nothing more.
