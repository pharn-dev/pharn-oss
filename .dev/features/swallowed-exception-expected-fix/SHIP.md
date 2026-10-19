# SHIP — swallowed-exception-expected-fix

An advisory roll-up of one `/pharn-dev-ship` run. The increment is the follow-up `swallowed-exception-expected-fix` named
in CHANGELOG [6.64.0] (#356). It ships as SKILLS_VERSION 6.64.1.

## How the run was set up

- The plan was drafted in desktop worktree session `funny-diffie-2a16d0`, whose write hooks could not write in-repo.
- GATE 1, the human, in that session: "Approve as written", "Witness sweep", "Main-checkout session builds". In the
  orchestrator's own conversation, the human then confirmed that the orchestrator should run the stages after #356
  merged.
- Every stage then ran in an isolated opus worktree agent of the orchestrator session. The approved text and the GATE 1
  and GATE 2 records are in `PLAN.md`.

## Stages, in order, with each structural verdict verbatim

1. `/pharn-dev-grill` — `check-plan-lessons.mjs` exit 0. Its interrogation is advisory: 5 minor concerns
   (`GRILL.md`).
2. `/pharn-dev-build` — `validate` exit 0 (build commit `ea09d57`).
3. `/pharn-dev-regress` — `regression-report.json` `.verdict`: `no-regressions`, base `5bc02bb`.
4. `/pharn-dev-verify` — `verify-report.json` `.verdict`: `PASS`, `failing_gates: []`.
5. `/pharn-dev-review` — `REVIEW.md`: GREEN, 0 floor-gate findings, 3 minor advisory findings.
6. GATE 2 fix round (A1–A3, commit `2d91080`), then `/pharn-dev-regress` `.verdict`: `no-regressions` (base `5bc02bb`)
   and `/pharn-dev-verify` `.verdict`: `PASS`, `failing_gates: []` (commit `7b0d95b`).

**Where the run ended: GATE 2.** The human chose "Fix A1–A3, then PR" and authorized a squash `--admin` merge once CI
is green. That merge is the human-authorized next step. This roll-up does not decide it.

changelog-entry: exit 0

lesson: none — the reviewer found no candidate that clears L20's bar (`REVIEW.md`, "Lesson candidate").

deferred: none

## Pointers (cited, not restated)

- `.dev/features/swallowed-exception-expected-fix/PLAN.md` — the approved plan; GATE 1 and GATE 2 records.
- `.dev/features/swallowed-exception-expected-fix/GRILL.md` — advisory grill log.
- `.dev/features/swallowed-exception-expected-fix/REGRESSION.md` and `regression-report.json`
- `.dev/features/swallowed-exception-expected-fix/VERIFY.md` and `verify-report.json`
- `.dev/features/swallowed-exception-expected-fix/REVIEW.md` — the review's findings and recommendation.

chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate.
