# REGRESSION — reconcile-merged-paths

- Base: `052709d35cb3ce1f0e58ad18a0a5513a39d9e0bd` (`HEAD`, because the working tree carries the uncommitted
  build).
- Inside (14 paths): the 12 declared `## Files` paths plus this feature's `PLAN.md` and `GRILL.md`. `check-regress.mjs scope`
  exited 0 with no escape. Every inside path is declared or is an exempt pipeline artifact.
- Outside gates: 146 test files outside the feature, `validate`, and the one committed eval pair. The style gates
  were skipped because no shared style config is inside.

| Gate                                                                                       | base → head |
| ------------------------------------------------------------------------------------------ | ----------- |
| `tests` (146 outside test files)                                                           | 0 → 0       |
| `validate`                                                                                 | 0 → 0       |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0 → 0       |

`regressions[]`: none · `pre_existing[]`: none.

**REGRESSIONS: none.** No deterministically detectable breakage outside the feature. This stage catches exactly
what its suite catches and nothing more. The feature's own tests are inside the feature, and `/pharn-dev-verify`
runs them.

Orchestration note: the gates ran through a scratch node runner under `.pharn/c1/`, because the isolated worktree
refuses shell-variable capture. The runner ran the command's gate set unchanged. Its first attempt crashed after
the base run, on an eval-pair shape it had read wrongly. It was fixed and the whole run was repeated; the numbers
above come from the second run.
