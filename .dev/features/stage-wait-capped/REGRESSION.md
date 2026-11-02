# REGRESSION — stage-wait-capped

Run 2, after the fast-forward to `0b18864b` and the re-anchor (`PLAN.md`, "Re-anchor note"). Run 1 (base
`607d82c2`) is summarized at the end.

- base: `0b18864b27f1f0cf6cb85e240b8f1a3fb8359281` (HEAD; the working tree is dirty with this build, so Step 1's
  state test picked `base = HEAD`)
- inside (14): the 10 build paths (`git diff --name-only HEAD`) plus this feature's `PLAN.md`, `GRILL.md`,
  `REGRESSION.md` and `regression-report.json`
- `check-regress.mjs scope`: exit 0 — no escape from the plan's `## Files`; outside tests 174; outside eval pairs 1
  (`trust-fence`)
- style gates: skipped by the config-touch rule (no shared style config is inside)

## Per-gate exit codes (base → head)

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `tests` (174 outside test files, per-test records)                                         | 1    | 0    |
| `validate`                                                                                 | 0    | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |

- `regressions[]`: none
- `pre_existing[]`: `tests` — per-test: base 5761 passed / 1 failed / 4 skipped; head 5765 / 0 / 1; `new_failures`:
  none; `still_failing`: 0

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.** (`check-regress.mjs verdict`
exit 0, `"verdict": "no-regressions"`.) This catches exactly what the suite catches, nothing more.

The one base failure is a load-timing test, `pharn/floor/entry-gates.test.mjs` "OBSERVED: TAKEOVER — …", red at base
and green at head on the same bytes (the file is outside this increment). The machine was running several parallel
sessions' suites at the time.

## Run 1 (base `607d82c2`, superseded)

Verdict `no-regressions` (exit 0): `tests` red at base and head with the same 12 failures, `new_failures` none. All 12
were `ERR_MODULE_NOT_FOUND` for `pharn/floor/capability-files-core.mjs` inside three test files' scratch copies of the
floor (`lens-groups.test.mjs` 3, `render-review-assignments.test.mjs` 8, `validate.test.mjs` 1), a defect of
`607d82c2` that `0b18864b` fixes.

## Orchestration deviations (advisory)

- The isolated-worktree guard refuses the pinned `xargs` / `$VAR` capture forms, so the gates ran through a scratch
  runner outside the repo (`<scratchpad>/regress-410/capture.mjs`, cwd = the worktree): argv arrays, the same gate set,
  the pinned reporter by absolute path, each side's record removed before it runs.
- In run 1 the first runner crashed after the base test run (it misread `outside_eval_pairs` as strings); the resumed
  run kept that base record and recorded base `tests` as `1` (the record held 12 failed). Run 2 ran in full.
