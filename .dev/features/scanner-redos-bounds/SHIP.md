# SHIP — scanner-redos-bounds

Branch `fix/scanner-redos-bounds`, batch 2026-10-19 group C, mode SHIP. Final version **6.65.1**: planned as 6.64.3,
renumbered three times as `main` released its own 6.64.3, 6.64.4 and 6.65.0. The second and third merges
(`origin/main` 661f3470, then 6.65.0) came after the regress and verify runs recorded here. They brought only other
files and released CHANGELOG sections. Each was followed by the fast gates and this increment's five suites.

## Stages run, in order

1. `/pharn-dev-plan` → `PLAN.md`.
   - **GATE 1** was decided by the batch orchestrator, as a model decision under the maintainer's delegation, not a
     human approval: APPROVED.
   - Q1: defer `missing-error-handling` and `missing-timeout` to `scanner-redos-sweep-2`.
   - Q2: build the shared `sink-span-core.mjs`.
2. `/pharn-dev-grill` → `GRILL.md`.
   - `check-plan-lessons.mjs` exit **0**.
   - Interrogation: 4 advisory concerns, folded into the plan before the build.
3. `/pharn-dev-build` → `validate` exit **0** (GREEN), and again after every later fix.
4. `/pharn-dev-regress`, run three times; run 3 is recorded.
   - Run 1 reported `tests` 0 → 1: a load flake in an untouched file.
   - Run 2 gave `no-regressions`.
   - Run 3 ran after the review fixes and the merge, against base `94ad252b`.
   - `regression-report.json` `.verdict` = **`no-regressions`**. `tests` is red at both base and head under load
     averages of 90–216, so this gate is weak; see `REGRESSION.md`.
5. `/pharn-dev-verify`, run three times; run 3 is recorded.
   - `verify-report.json` `.verdict` = **`FAIL`**, `failing_gates: ["test"]`.
   - That is 1 of 5,591 tests: `stage-regress.test.mjs:2207`, an untouched wall-clock test. Its base install timed
     out (exit 124), and the same test is red at base `94ad252b` too.
   - Every other gate is 0, including `reconcile`. See `VERIFY.md`.
6. `/pharn-dev-review` → `REVIEW.md`.
   - 0 floor-gate findings.
   - 5 advisory findings: 3 fixed, 2 accepted as stated.
   - An independent adversarial probe ran as part of the review (`MEASUREMENTS.md` §5).

## Where the run ended

By `/pharn-dev-ship`'s rule, the verify `FAIL` is a **RED-verdict STOP**, recorded here as such. The verdict is not
reinterpreted. This agent's reading was that the failure is environmental: the red test is outside the change, red
at base too, and the machine was overloaded. That reading is advisory. The PR was opened so CI could give the clean
measurement.

**GATE 2: MERGE on green CI.** The batch orchestrator made this decision as a model decision under the maintainer's
delegation (COMMON.md), not as a human approval. Its stated reason: the verify `FAIL` is load-timing noise in files
this increment did not touch, also red at base, and CI is the measurement. The merge itself is the orchestrator's
and is conditional on CI being green; this agent merges nothing.

- review: `.dev/features/scanner-redos-bounds/REVIEW.md` (advisory)
- grill: `.dev/features/scanner-redos-bounds/GRILL.md` (advisory)

changelog-entry: exit 0

lesson: deferred — COMMON.md says not to promote canon in this batch. The candidate is recorded here for a later
`/pharn-dev-memory-promote`. A regex engine's backtrack-stack limit is part of the input domain. A rewrite that swaps
or adds a regex can move which inputs make the scanner throw, even when every input that completes gives identical
output, and a results-only differential never sees that. Exception parity has to be probed at the size where the
engine overflows. Source: `REVIEW.md`, first fixed finding; `MEASUREMENTS.md` §5.

deferred:

- `scanner-redos-sweep-2`: `scan-code-missing-error-handling.mjs` and `scan-code-missing-timeout.mjs` are super-linear
  (`MEASUREMENTS.md` §4). This is follow-up work, not a lesson.
- Wall-clock tests in `stage-regress` / `stage-verify` / `entry-*` fail under heavy machine load and can mask a
  real regression in `/pharn-dev-regress` as `pre_existing`. This is observed, not a lesson candidate yet.

_Chain ran; the named floor verdicts are as shown. This is NOT a judgment that the increment is good or wise; that
is the human's call at the post-review gate._
