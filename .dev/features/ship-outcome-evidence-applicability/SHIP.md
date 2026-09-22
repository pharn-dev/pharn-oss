# SHIP — ship-outcome-evidence-applicability

## Stages that ran, in order

1. `/pharn-dev-plan` wrote `PLAN.md`, including the Phase 1 reachability findings. `check-plan-lessons`
   was GREEN.
   - **GATE 1** was approved by the model under the user's written delegation ("zaakceptuj jeśli uważasz
     że jest dobry… bez mojej ingerencji"). It is recorded as such, not as a human approval.
2. `/pharn-dev-grill`: Step 1b `check-plan-lessons.mjs` exit `0`. It raised 4 advisory concerns. The
   blocking-severity one (a stage that starts and then refuses leaves the old report) was resolved as a
   named, test-pinned residual, because closing it needs a report contract change or an orchestration
   change, and the intent excludes both.
3. `/pharn-dev-build`: `validate` exit `0`.
4. `/pharn-dev-regress`: `"no-regressions"`.
5. `/pharn-dev-verify`: `"PASS"` (`reconcile` CLEAN).
6. `/pharn-dev-review`: 0 floor-gate findings and 1 important advisory finding: a historical `gate2` and
   the new label disagreed.
7. **GATE 2:** the decision was **fix**, taken under the same delegation. The finding was fixed within
   the planned files. Iteration 2 then ran:
   - `regress`: `"no-regressions"`.
   - `verify`: `"PASS"`, with `reconcile` CLEAN.
   - `docs:check`: 0.

## Build note

**Reachability.** `/pharn-spec` Step 1.1 resumes an existing `<name>` (an instruction), so a second
`/pharn-ship` on a feature is supported. The previous run's green reports stay on disk. The two defects
below are not execution-gate bypasses.

**Before/after, advisory evidence produced at build time against `git archive 9d866ed`.** In the R1
scenario (a new run that stopped at grill, with the previous run's green reports on disk), the outcome
was `{"decision":"gate2","iterations":1}` pre-fix and is `{"decision":"stop:pharn-grill","iterations":null}`
post-fix. In R2 (source selection), a `/pharn-ship` ledger over a feature directory holding a loop's
`LOOP.md` used to copy `STOP_CAP`. It now derives from the current run. Both are pinned by committed
tests.

**Applicability rule and strength.** Both `pharn-regress` and `pharn-verify` must have a `stage-start`
in the current run, at its latest iteration. The current run is `run-window-core.currentRunMarkers`.
The rule is floor relative to the recorded markers, and the markers are advisory. An unknown boundary
gives `undetermined`.

**Residual (pinned by a test).** When a stage starts and then refuses, the previous report remains and
is accepted.

## Pointers

- `REVIEW.md` — not restated here.
- `GRILL.md` — advisory.

lesson: none — every finding is a first occurrence, so the L20 bar is not met. Step 2b was delegated by
the user.

deferred: none

Chain ran; the named floor verdicts are as shown. This is NOT a judgment that the increment is good or
wise; that is the human's call at the post-review gate.
