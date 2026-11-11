# REGRESSION — triage-model-key

- **Base:** `43e08663a596872bc06991d34e995836a8240241` (HEAD, the 7.8.0 merge; the working tree held the uncommitted
  build, so base = HEAD), checked out detached in a scratch worktree.
- **Inside (5):** the three `## Files` paths plus this feature's `PLAN.md` and `GRILL.md` (exempted by `--feature`,
  listed in `escape_exempt`). `escaped: []`.
- **Outside:** 186 test files (every `*.test.mjs` / `*.test.cjs` but `pharn/floor/check-model-config.test.mjs`, which is
  inside), `validate`, and the one committed eval pair
  (`pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` ↔
  `.dev/features/trust-fence/findings.json`). Style gates skipped: no shared style config is inside.

| gate                                    | base | head |
| --------------------------------------- | ---- | ---- |
| `tests`                                 | 0    | 0    |
| `validate`                              | 0    | 0    |
| `structural:expected-injection-comment` | 0    | 0    |

**Per-test (`tests`):** base 6,544 passed / 0 failed / 9 skipped; head 6,552 passed / 0 failed / 1 skipped;
`new_failures: []`, `still_failing: 0`. No outside file changed between the two sides; the eight tests skipped at the
base only sit in files this change does not touch, and why they skip in the scratch checkout was not investigated.

`regressions: []` · `pre_existing: []`

Verdict: **REGRESSIONS: none — no deterministically-detectable breakage outside the feature.**

This comparison catches what the outside suite catches and nothing more: a break no test, `validate` or eval pair covers
is invisible to it.
