# REGRESSION — loop-replan-rounds

- **Base:** `8839760e8b35dcabac1589fea0847a1fd017d86d` (HEAD, the human trusted-doc commit; the working tree held the
  uncommitted build, so base = HEAD), checked out detached in a scratch worktree.
- **Inside (26):** the 24 `## Files` paths this build changed (the 25th, `.dev/floor/stage-load-budget.test.mjs`, was declared but needed no edit) plus this feature's `PLAN.md` and `GRILL.md` (exempted by
  `--feature`, listed in `escape_exempt`). `escaped: []`.
- **Outside:** 183 test files (every `*.test.mjs` / `*.test.cjs` but the three inside: `command-hygiene.test.mjs`,
  `check-regress.test.mjs`, `loop-closeout.test.mjs`; the new `grill-round.test.mjs` exists at head only and is inside),
  `validate`, and the one committed eval pair
  (`pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` ↔
  `.dev/features/trust-fence/findings.json`). Style gates skipped: no shared style config is inside.

| gate                                    | base | head |
| --------------------------------------- | ---- | ---- |
| `tests`                                 | 0    | 0    |
| `validate`                              | 0    | 0    |
| `structural:expected-injection-comment` | 0    | 0    |

**Per-test (`tests`):** base 6,104 passed / 0 failed / 7 skipped; head 6,110 passed / 0 failed / 1 skipped;
`new_failures: []`, `still_failing: 0`.

**Run note.** The first `check-regress.mjs verdict` call was passed a stale `--inside` list (a file left in
`pharn/.run/pharn-dev-regress/` by the 7.7.0 run); the gate runs themselves used this feature's fresh scope. The
verdict was recomputed over the same base and head results with this feature's 26 inside paths read from `scope.json`;
both calls returned `no-regressions`, and `regression-report.json` is the second call's output verbatim.

`regressions: []` · `pre_existing: []`

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.**

This comparison catches what the outside suite catches and nothing more: a break no test, `validate` or eval pair covers
is invisible to it.
