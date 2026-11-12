# REGRESSION — gate-evidence-cache

- run: iteration 3, after the pull request's first CI run. pharn-ci's diff-coverage gate failed at 97.75% (608 of 622
  added lines); its uncovered lines were four catch blocks no input can reach and two failure notes. The fix removed
  the four unreachable catches (each callee already returns its failure) and added tests for the two notes. Iterations
  1 and 2 were `no-regressions` as well; iteration 2's base was `356094ba`, over the whole build.
- base: `ae310f3e147307a3c21927b572fd7f085d214698` (the working tree was dirty, so `base = HEAD`: the pull request's
  first commit, which holds the whole build)
- inside: the 4 paths the fix changed (`entry-gate-cache.mjs`, `entry-gates.mjs` and their tests), all in `## Files`;
  `scope` exited 0, so no path escaped `## Files`
- outside: 192 test files, `validate`, and the one committed eval pair (trust-fence); no shared style config was
  touched, so the style gates were skipped on both sides (absent from both maps)
- method: the pinned Step 1–3 commands, run from a node script (this isolated worktree refuses compound shell lines that
  name git); the per-test reporter on both sides; `check-regress.mjs verdict --per-test tests`

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---: | ---: |
| `tests`                                                                                    |    0 |    0 |
| `validate`                                                                                 |    0 |    0 |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` |    0 |    0 |

Per test: base 6,665 passed / 0 failed / 9 skipped; head 6,673 passed / 0 failed / 1 skipped; `new_failures`: none.

- regressions: none
- pre_existing: none

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.** This certifies only the
comparison: it catches what the outside suite catches, nothing more (P0).
