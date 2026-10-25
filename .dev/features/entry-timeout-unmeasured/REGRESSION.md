# REGRESSION — entry-timeout-unmeasured

## Run 2 — the GATE 2 fix iteration (current; `regression-report.json` is this run's verdict)

- **Base:** `a9e437ba44efa37857c8a3b02a508106eedf272c` (`HEAD`, the merge of `origin/main` `30968218`; the working tree
  was dirty, a working-tree build).
- **Inside (16 paths):** the tracked paths changed since base (the review fixes and the 6.75.0 renumber). `scope` exited
  0: `escaped` `[]`, `escape_exempt` `[]` (every inside path is declared in the amended plan's `## Files`).
- **Outside gates:** the 168 outside test files, `validate`, and the one committed eval pair. Style gates skipped (no
  shared style config is inside).
- **How it ran:** as run 1 (base checkout at `.pharn/pharn-dev-regress/base`, removed after; the per-test reporter from
  the working tree on both sides, through a node runner with an argv array). Base 755 s, head 567 s.

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---: | ---: |
| `tests`                                                                                    |    0 |    0 |
| `validate`                                                                                 |    0 |    0 |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` |    0 |    0 |

Per test (`tests`): base 5,606 passed, 0 failed, 4 skipped; head 5,609 passed, 0 failed, 1 skipped; `new_failures` none.

`regressions`: none · `pre_existing`: none · `check-regress.mjs verdict` exit 0, `"no-regressions"`.

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.** This catches what the outside suite,
the floor and the eval pair catch, nothing more; the feature's own tests are inside and run at verify.

## Run 1 — the first build

- **Base:** `60d713a9ec05249264f7e314996746a45b9b5a81` (`HEAD`: the working tree was dirty, a working-tree build).
- **Inside (13 paths):** the 11 tracked paths changed since base plus the untracked `BUILD.md` and `GRILL.md`. `scope`
  exited 0: `escaped` `[]`, `escape_exempt` `[]`.
- **Outside gates:** the 169 outside test files, `validate`, and the one committed eval pair; style gates skipped. The
  pinned `xargs` line was replaced by a node runner with an argv array: this isolated worktree refuses that shell form.
  Base 673 s, head 710 s.
- All three gates 0 → 0. Per test: base 5,608 passed, 0 failed, 4 skipped; head 5,611 passed, 0 failed, 1 skipped.
  Verdict `"no-regressions"`.
