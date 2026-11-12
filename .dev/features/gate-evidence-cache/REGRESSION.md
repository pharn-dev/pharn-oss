# REGRESSION — gate-evidence-cache

- base: `356094ba83757d5d73bc35c9d1b7f8f1c767a47b` (the working tree was dirty, so `base = HEAD`: the plan and grill
  commits on top of the merge of `origin/main` 71cf56e6)
- run: the second regress of this build (iteration 2), after a review-driven fix to `entry-gate-cache-core.mjs` (gate
  ids must be ALLOWLIST members; a live tree with no HEAD is `inputs-unavailable`); the first run was also
  `no-regressions`
- inside: 30 paths — the plan's 25 `## Files` paths that changed, plus this feature's `PLAN.md`, `REGRESSION.md`,
  `VERIFY.md` and the two reports, each its own stage's artifact; `scope` exited 0, so no path escaped `## Files`
- outside: 187 test files, `validate`, and the one committed eval pair (trust-fence); no shared style config was
  touched, so the style gates were skipped on both sides (absent from both maps)
- method: the pinned Step 1–3 commands, run from a node script (this isolated worktree refuses compound shell lines that
  name git); the per-test reporter on both sides; `check-regress.mjs verdict --per-test tests`

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---: | ---: |
| `tests`                                                                                    |    0 |    0 |
| `validate`                                                                                 |    0 |    0 |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` |    0 |    0 |

Per test: base 6,241 passed / 0 failed / 7 skipped; head 6,247 passed / 0 failed / 1 skipped; `new_failures`: none.

- regressions: none
- pre_existing: none

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.** This certifies only the
comparison: it catches what the outside suite catches, nothing more (P0).
