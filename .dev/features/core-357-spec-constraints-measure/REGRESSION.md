# REGRESSION — core-357-spec-constraints-measure

This is iteration 2, run after the fix to two advisory review findings in the record (`REVIEW.md`). Iteration 1, on
the same base, was also `no-regressions`; this report replaces its report. In iteration 1 the base `tests` record was
reused from a first attempt whose runner crashed after that gate, on its own bug: it read the eval pair as a string.
Iteration 2 measured every gate fresh, on both sides.

- **Base:** `aa91a852bb8a842da97b181c6ba7e40d3adaa4d8`, which is `HEAD`. The working tree held the uncommitted build,
  so by the stage's rule the base is `HEAD`.
- **Inside (12 paths), from `check-regress.mjs scope`, exit 0, `escaped: []`:**
  - this feature's stage artifacts, all exempt: `PLAN.md`, `GRILL.md`, `REGRESSION.md`, `regression-report.json`,
    `VERIFY.md`, `verify-report.json` and `REVIEW.md`;
  - the evidence bundle;
  - the record;
  - `.prettierignore`, `.markdownlint-cli2.jsonc` and `CHANGELOG.md`.
- **Outside:**
  - 206 test files;
  - `validate`;
  - the trust-fence eval pair;
  - the three style gates. They run because inside touches `.prettierignore` and `.markdownlint-cli2.jsonc`. The base
    worktree ran `npm ci` for them.

| gate                                     | base | head |
| ---------------------------------------- | ---- | ---- |
| tests (per test: 7130 passed, 1 skipped) | 0    | 0    |
| validate                                 | 0    | 0    |
| structural:expected-injection-comment    | 0    | 0    |
| lint                                     | 0    | 0    |
| format:check                             | 0    | 0    |
| lint:md                                  | 0    | 0    |

- **Result fields:** `regressions: []`, `pre_existing: []`, `per_test.new_failures: []`, `still_failing: 0`.
- **Test wall time:** 702 s at base, 580 s at head.
- **Machine and runner:** the run held a heavy slot, and load was 2.7 at the start. The gates ran through a scratchpad
  node runner. It used argv arrays and no shell, with the pinned reporter and destination paths, because this
  isolated worktree refuses `xargs`.

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature** (`check-regress.mjs verdict`
exit 0, `"verdict": "no-regressions"`).

Residual: this catches what the suite and the gates above catch, nothing more.
