# REGRESSION — core-310-real-loop-record

This is iteration 2, run after the GATE 2 "fix" (`REVIEW.md`'s CORE-105 AC4 overclaim, fixed in commit `0726c006`).

- Base: `2ec930d7cb34844f9f90ada8666966b3710e127d` (`git merge-base HEAD origin/main`; clean tree at `0726c006`).
- Inside (the changed scope, 14 paths): this feature's pipeline artifacts (`PLAN.md`, `GRILL.md`, `REGRESSION.md`,
  `regression-report.json`, `VERIFY.md`, `verify-report.json`, `REVIEW.md`, all exempt), the three evidence bundles,
  the record, `.prettierignore`, `.markdownlint-cli2.jsonc` and `CHANGELOG.md`. `check-regress.mjs scope` exit 0,
  `escaped: []`.
- Outside: 204 test files, `validate`, the trust-fence eval pair, and the three style gates. The style gates run
  because inside touches `.prettierignore` and `.markdownlint-cli2.jsonc`; the base worktree ran `npm ci` for them.
- Earlier runs, not used:
  - iteration 1 on the same base, also `no-regressions` (619 s base and 657 s head for tests);
  - an attempt on base `ead56ead`, stopped before its head side finished, when `origin/main` moved and this worktree
    got its own `node_modules` (prettier 3.10.1).

| gate                                     | base | head |
| ---------------------------------------- | ---- | ---- |
| tests (per test: 7089 passed, 1 skipped) | 0    | 0    |
| validate                                 | 0    | 0    |
| structural:expected-injection-comment    | 0    | 0    |
| lint                                     | 0    | 0    |
| format:check                             | 0    | 0    |
| lint:md                                  | 0    | 0    |

`regressions: []`, `pre_existing: []`, `per_test.new_failures: []`. Test wall time was 602 s at base and 1,067 s at
head. Load was 6.8 at the start, and the 15-minute average reached 41 by the end, from other sessions.

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature** (`check-regress.mjs verdict`
exit 0, `"verdict": "no-regressions"`).

Residual: this catches what the suite and the gates above catch, nothing more.
