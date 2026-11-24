# REGRESSION — core-342-grill-effort-e1

This is iteration 2. It was run after the GATE 2 fix to three advisory review findings in the record (`REVIEW.md`).
Iteration 1, on the same base, was also `no-regressions` (tests 812 s at base, 591 s at head); its report is replaced
by this one.

- **Base:** `08d7f63e693a1cdb1e0269ee552357ce77408313`, which is `HEAD`. The working tree held the uncommitted build,
  so the base is `HEAD` by the stage's rule.
- **Inside (13 paths), from `check-regress.mjs scope`, exit 0, `escaped: []`:**
  - this feature's stage artifacts (`PLAN.md`, `GRILL.md`, `REGRESSION.md`, `regression-report.json`, `VERIFY.md`,
    `verify-report.json`, `REVIEW.md`), all exempt;
  - the two evidence bundles;
  - the record;
  - `.prettierignore`, `.markdownlint-cli2.jsonc` and `CHANGELOG.md`.
- **Outside:**
  - 204 test files;
  - `validate`;
  - the trust-fence eval pair;
  - the three style gates. They run because inside touches `.prettierignore` and `.markdownlint-cli2.jsonc`, and the
    base worktree ran `npm ci` for them.

| gate                                     | base | head |
| ---------------------------------------- | ---- | ---- |
| tests (per test: 7089 passed, 1 skipped) | 0    | 0    |
| validate                                 | 0    | 0    |
| structural:expected-injection-comment    | 0    | 0    |
| lint                                     | 0    | 0    |
| format:check                             | 0    | 0    |
| lint:md                                  | 0    | 0    |

- **Result fields:** `regressions: []`, `pre_existing: []`, `per_test.new_failures: []`.
- **Test wall time:** 828 s at base, 795 s at head.
- **Machine and runner:** the run held a heavy slot. Load was 2.9 at the start and reached about 80 from other
  sessions. The gates ran through a scratchpad node runner with argv arrays and no shell, using the pinned reporter and
  destination paths, because this isolated worktree refuses `xargs`.

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature** (`check-regress.mjs verdict`
exit 0, `"verdict": "no-regressions"`).

Residual: this catches what the suite and the gates above catch, nothing more.
