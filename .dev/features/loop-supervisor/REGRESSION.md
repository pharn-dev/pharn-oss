# REGRESSION — loop-supervisor

- **Base:** `eae5fce8793e2d0d0827ca927e68eaf5440548f5` (HEAD, the maintainer's trusted-doc commit; the working tree held
  the uncommitted build, so base = HEAD), checked out detached in a scratch worktree.
- **Inside (34):** the 32 `## Files` paths this build changed (the two declared tests `check-loop-record.test.mjs` and
  `check-loop-decision.test.mjs` needed no edit) plus this feature's `PLAN.md` and `GRILL.md` (exempted by `--feature`,
  listed in `escape_exempt`). `escaped: []`.
- **Outside:** 179 test files (every `*.test.mjs` / `*.test.cjs` not inside), `validate`, and the one committed eval pair
  (`pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` ↔
  `.dev/features/trust-fence/findings.json`). Style gates skipped: no shared style config is inside.

| gate                                    | base | head |
| --------------------------------------- | ---- | ---- |
| `tests`                                 | 0    | 0    |
| `validate`                              | 0    | 0    |
| `structural:expected-injection-comment` | 0    | 0    |

**Per-test (`tests`):** base 5,899 passed / 0 failed / 7 skipped; head 5,905 passed / 0 failed / 1 skipped;
`new_failures: []`, `still_failing: 0`. The six tests skipped at the base only sit in files this change does not touch;
why they skip in the scratch checkout was not investigated.

`regressions: []` · `pre_existing: []`

Verdict: **REGRESSIONS: none — no deterministically-detectable breakage outside the feature.**

This comparison catches what the outside suite catches and nothing more: a break no test, `validate` or eval pair covers
is invisible to it.
