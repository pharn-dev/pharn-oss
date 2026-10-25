# REGRESSION — entry-timeout-unmeasured

- **Base:** `60d713a9ec05249264f7e314996746a45b9b5a81` (`HEAD`: the working tree was dirty, a working-tree build).
- **Inside (13 paths):** the 11 tracked paths changed since base plus the untracked `BUILD.md` and `GRILL.md`. `scope`
  exited 0: `escaped` `[]`, `escape_exempt` `[]` (every inside path is declared in the plan's `## Files`).
- **Outside gates:** the 169 outside test files, `validate`, and the one committed eval pair. Style gates skipped (no
  shared style config is inside).
- **How it ran:** the base side in a detached worktree at `.pharn/pharn-dev-regress/base` (removed after), the head side
  in the working tree, one after the other. Each side ran the pinned per-test reporter
  (`.dev/floor/node-test-results-reporter.mjs`, from the working tree on both sides) through a node runner with an argv
  array instead of the pinned `xargs` line: this isolated worktree refuses that shell form. Base 673 s, head 710 s.

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---: | ---: |
| `tests`                                                                                    |    0 |    0 |
| `validate`                                                                                 |    0 |    0 |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` |    0 |    0 |

Per test (`tests`): base 5,608 passed, 0 failed, 4 skipped; head 5,611 passed, 0 failed, 1 skipped; `new_failures` none.

`regressions`: none · `pre_existing`: none · `check-regress.mjs verdict` exit 0, `"no-regressions"`.

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.** This catches what the outside suite,
the floor and the eval pair catch, nothing more; the feature's own tests (`entry-gates.test.mjs`,
`command-hygiene.test.mjs`) are inside and run at verify.
