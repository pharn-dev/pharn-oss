# REGRESSION — core-310-real-loop-record

- Base: `2ec930d7cb34844f9f90ada8666966b3710e127d` (`git merge-base HEAD origin/main`; clean tree after the merge
  commit `592d962f`).
- Inside (the changed scope, 9 paths): this feature's `PLAN.md` and `GRILL.md` (exempt as pipeline artifacts), the three
  evidence bundles, the record, `.prettierignore`, `.markdownlint-cli2.jsonc` and `CHANGELOG.md`. `check-regress.mjs
scope` exit 0, `escaped: []`.
- Outside: 204 test files, `validate`, the trust-fence eval pair, and the three style gates. The style gates run
  because inside touches `.prettierignore` and `.markdownlint-cli2.jsonc`; the base worktree ran `npm ci` for them.
- An earlier attempt on base `ead56ead` was stopped before its head side finished. It was replaced by this run after
  `origin/main` moved to `2ec930d7` and this worktree got its own `node_modules` (prettier 3.10.1). Its base side was
  green as well. Its results are not used.

| gate                                     | base | head |
| ---------------------------------------- | ---- | ---- |
| tests (per test: 7089 passed, 1 skipped) | 0    | 0    |
| validate                                 | 0    | 0    |
| structural:expected-injection-comment    | 0    | 0    |
| lint                                     | 0    | 0    |
| format:check                             | 0    | 0    |
| lint:md                                  | 0    | 0    |

`regressions: []`, `pre_existing: []`, `per_test.new_failures: []`. Test wall time was 619 s at base and 657 s at
head, at a 1-minute load of 4 to 9 (`uptime` at start and end).

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature** (`check-regress.mjs verdict`
exit 0, `"verdict": "no-regressions"`).

Residual: this catches what the suite and the gates above catch, nothing more.
