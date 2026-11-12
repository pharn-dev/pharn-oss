# REGRESSION — amend-wording-7102

Base: `f1a7a84e` (HEAD, the maintainer's trusted-doc commit; the tree was dirty, so base = HEAD). Inside: the six declared
`## Files` paths plus this feature's `PLAN.md` / `GRILL.md` (exempt by `--feature`). Escaped: none. Outside: 188 test
files and the one committed eval pair.

| outside gate                            | base | head |
| --------------------------------------- | ---- | ---- |
| `tests`                                 | 0    | 0    |
| `validate`                              | 0    | 0    |
| `structural:expected-injection-comment` | 0    | 0    |

Per-test (`tests`): base 6,616 passed / 0 failed / 9 skipped; head 6,624 passed / 0 failed / 1 skipped;
`new_failures: []`.

Verdict (`check-regress.mjs verdict`, exit 0): **no-regressions**.

Bound: the comparison covers the outside gates listed, at base and head; a defect no outside gate checks is invisible
to it.
