# REGRESSION — loop-record-honesty

- Base: `70b48904b00a5b1e6e01e176689c56e8446afd4d` (HEAD; the working tree was dirty, so base = HEAD per Step 1.1).
  It holds the batch base plus this feature's PLAN and GRILL; the build's changes are uncommitted on top of it.
- Partition (`check-regress.mjs scope --feature loop-record-honesty`): exit 0, 21 inside paths, all declared;
  `escaped: []`, `escape_exempt: []`. 174 outside test files, 1 outside eval pair.
- Style gates were skipped: no inside path touches a shared style config.
- How it ran: a node runner in the session scratchpad executed the command's pinned steps as argument vectors. This
  isolated worktree's shell guard refuses compound git lines. The steps were the same: a detached base worktree, the
  per-test reporter at its absolute path on both sides, `validate`, and `check-structural`. A first runner attempt
  crashed before any gate result was recorded, because it read the eval-pair entry with the wrong shape. That was
  fixed and the whole run repeated.

## Outside gates, base → head

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `tests` (174 outside files, per-test record)                                               | 0    | 0    |
| `validate`                                                                                 | 0    | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |

Per test: base 5794 passed, 0 failed, 6 skipped; head 5799 passed, 0 failed, 1 skipped. `new_failures: []`.

`regressions: []` · `pre_existing: []`

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.** This verdict is
`check-regress.mjs verdict`, exit 0, `no-regressions`. It catches what the outside suite, the floor and the eval pair
catch, and nothing more.
