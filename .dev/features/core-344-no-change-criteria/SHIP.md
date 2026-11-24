# SHIP — core-344-no-change-criteria

Linear CORE-344. Run by a delegated agent for the CORE-293 follow-up batch. GATE 1 and GATE 2 were each a **model
decision under delegation (orchestrator)**, never a human approval.

## Stages, in order

1. `/pharn-dev-plan`: `PLAN.md` (check-plan-lessons GREEN: L83, L76, L64).
2. `/pharn-dev-grill`: `GRILL.md`, check-plan-lessons exit 0. Four advisory concerns; G1–G3 were folded into the plan
   before GATE 1, and G4 is filed as CORE-357.
3. **GATE 1**: the plan was approved by the orchestrator, a model decision under delegation. It confirmed decision
   (a), an advisory spec-time rule with the existing test-stage floor behind it; decision (b), the precondition guard
   ruled out; and a patch bump.
4. `/pharn-dev-build` iteration 1: 9 files written; `validate.mjs` exit 0.
5. `/pharn-dev-regress` iteration 1: **`regressions` (RED-verdict STOP).** Three outside tests failed at HEAD only.
   The README badge and `pharn-install.json` were stale after the bump, and neither file was in `## Files`. The
   records are kept as `REGRESSION.iteration-1.md` and `regression-report.iteration-1.json`.
6. **Re-plan after the STOP**: approved by the orchestrator, a model decision under delegation. `## Files` was widened
   by the badge, `pharn-install.json` and the two iteration-1 records (`PLAN.md`, "Re-plan after regress STOP").
   - The 9 files' diff was parked as a scratch patch, and the files were restored to HEAD.
   - Build Step 0 re-ran (setter, then a fresh anchor). The patch was re-applied, the badge set to 7.23.1, and
     `npm run docs:generate` run.
7. `/pharn-dev-build` iteration 2: `validate.mjs` exit 0.
8. `/pharn-dev-regress` iteration 2: `no-regressions` (`regression-report.json`).
9. `/pharn-dev-verify` run 1: **`FAIL`**, `failing_gates: ["format:check"]`. The cause was the hand-written
   `regression-report.iteration-1.json`, which was never formatted. It was formatted, and the stage re-ran from
   `init`.
10. `/pharn-dev-verify` run 2: `PASS`, with all 7 gates at 0 and reconcile CLEAN (12 reconciled, 0 escapes)
    (`verify-report.json`, `VERIFY.md`).
11. `/pharn-dev-review`: `REVIEW.md`, GREEN, with 0 floor findings and 2 minor advisory findings, recorded and not
    fixed.
12. **GATE 2**: delegated to the agent (fix blockers, otherwise proceed). There were no blockers, so it went on to the
    PR.

## Verdict block (the final iteration)

verdict-grill: exit 0
verdict-build: exit 0
verdict-regress: no-regressions
verdict-verify: PASS
run-ended: GATE 2

Pointers: `REVIEW.md` (findings, not restated here) and `GRILL.md` (advisory).

changelog-entry: exit 0

lesson: none — the one candidate (a version bump must declare the README badge and `pharn-install.json`) fails L20's
bar: `check-version-badge` and `check-install-manifest` already catch it deterministically. The 2b.3 question could
not be asked from a delegated subagent; under the batch brief no candidate is promoted without the human.

deferred: none

_chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate._
