# SHIP — loop-honest-stop

Batch group D, branch `fix/loop-honest-stop`. Both human gates were **delegated** by the maintainer to the batch
orchestrator (`.pharn/batch-2026-10-19/COMMON.md`). Each gate below records a model decision made under that
delegation, not a human approval.

## Stages, in order, and where the run ended

1. `/pharn-dev-plan` → `PLAN.md`. `check-plan-lessons.mjs` exit 0.
2. **GATE 1 (delegated):** the orchestrator APPROVED it.
   - Q1: fail-closed `CAP_UNWITNESSED`, on the condition that every path is verified and tested.
   - Q2: minor.
   - Q3: `/pharn-ship` left out.

   This is recorded in `PLAN.md`, "GATE 1 — decided under delegation", together with how the condition was verified.

3. `/pharn-dev-grill` → `GRILL.md`. Step 1b `check-plan-lessons.mjs` exit **0** (GREEN). The grill raised 4 advisory
   concerns (2 important, 2 minor), all adopted before build Step 0 (`PLAN.md`, "Post-grill amendments"):
   - `ITER_OVER_CAP`;
   - `excludedFacts` moved to `gate-run-core.mjs`;
   - the crashed-reconcile bound;
   - the placement of test (b).
4. `/pharn-dev-build` → `validate` exit **0** (`FLOOR: GREEN — 37 capabilities`).
5. `/pharn-dev-regress` → `regression-report.json` `.verdict` **`no-regressions`** (run 1, base `d5453a17`). After the
   review fixes and the merge, run 2 against base `94ad252b` (the merge-base) was **`no-regressions`** too. That second
   run is the file on disk.
6. `/pharn-dev-verify` → `verify-report.json` `.verdict` **`FAIL`**, `failing_gates: ["test"]`, in all three runs.
   The single red each time is the pre-existing timing test `pharn/floor/stage-regress.test.mjs:2207`.
   - It also failed on `main` at both regress bases, under the same load, and it passes in isolation.
   - Every gate this increment owns is green: `validate`, `lint`, `format:check`, `lint:md`, `structural:*` and
     `reconcile` (CLEAN).
   - Under `/pharn-dev-ship`'s rule, this FAIL is a STOP. Under the batch delegation the orchestrator asked for a pull
     request, so the chain continued to review and the PR. This verdict is presented unchanged, not reinterpreted.
     CI's run of the suite is the next measurement.
7. `/pharn-dev-review` → `REVIEW.md`: floor GREEN, 0 floor-gate findings, 4 advisory (all minor).
8. **GATE 2 (delegated):** all 4 advisory findings fixed. They were cheap and clearly right:
   - the `unlisted` doc matches the code;
   - the RUN-REPORT instruction-set text is hedged as a model;
   - the Step 1a `n/a` sentence names the quick run;
   - a comment line was wrapped.

   `origin/main` (6.64.3) was merged; the version stays 6.65.0. Regress and verify were re-run (the runs above), and the
   PR was opened for the orchestrator to decide.

## Verdicts read, verbatim

- `/pharn-dev-build`: `validate` exit `0`.
- `/pharn-dev-regress`: `.verdict` `"no-regressions"`.
- `/pharn-dev-verify`: `.verdict` `"FAIL"` (`failing_gates`: `test`).

Advisory: `GRILL.md`, and `REVIEW.md` for the findings (cited, not restated).

changelog-entry: exit 0

lesson: none — Step 2b's candidate (a fixed few-second budget in a test is a load-dependent verdict) is recorded as
`lesson: deferred` per the batch brief, which forbids promoting canon in this batch. No promotion was asked or made.

deferred: the timing-budget candidate above (its source: `REGRESSION.md` runs 1–2 and `VERIFY.md` runs 1–3).

Follow-ups named, not built:

- `loop-iterations-markers`
- `ship-instruction-set`
- `exclusion-lines-one-renderer`

The chain ran, and the floor verdicts it produced are as shown above. This is not a judgment that the increment is
good or wise; that is the human's call at the post-review gate.
