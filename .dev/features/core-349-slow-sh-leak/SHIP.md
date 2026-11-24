# SHIP — core-349-slow-sh-leak

Linear CORE-349. Stages ran in order: `/pharn-dev-plan` → GATE 1 → `/pharn-dev-grill` → `/pharn-dev-build` →
`/pharn-dev-regress` → `/pharn-dev-verify` → `/pharn-dev-review` → GATE 2.

- **GATE 1** — model decision under delegation (orchestrator), not a human approval. The orchestrator approved the plan
  with two conditions: run the L60 negative control once and record it here, and keep the reap's 5 s poll bounded so a
  stuck reap fails the test rather than hanging. Both conditions are met (below).
- **GATE 2** — model decision under delegation (orchestrator → this agent), not a human approval. There are no floor
  findings and one minor advisory finding (`REVIEW.md`, recorded as a follow-up), so the decision is to proceed to the
  PR.

verdict-grill: exit 0
verdict-build: exit 0
verdict-regress: no-regressions
verdict-verify: PASS
run-ended: GATE 2

## Conditions from GATE 1

- **L60 negative control (run once at build).** A temporary copy of the test was made with the pre-release
  `await reapSlowGates(fx.dir)` replaced by a plain liveness read (`slowGatePids(fx.dir).filter(isSlowGate)`). Running
  `node --test --test-name-pattern=Kill` on it gave `fail 1` with
  `a killed run's gate outlived the reap …` / `actual: [ 8436 ]`. The `finally` reap still removed the gate, so no
  orphan was left. The copy was deleted. The real test gave `pass 1` with no new `sh slow.sh` process.
- **Bounded poll.** `reapSlowGates` polls at most 5 s (`Date.now() - t0 < 5000`). It then returns the survivors, and
  the `deepEqual(orphans, [])` assertion fails on them. It never waits unbounded.

## Pointers

- Plan: `PLAN.md`; grill log (advisory, 2 concerns, both folded into the plan): `GRILL.md`.
- Regress: `REGRESSION.md` / `regression-report.json`. The base had two load-timing failures in untouched files, and
  head had none.
- Verify: `VERIFY.md` / `verify-report.json`.
- Review: `REVIEW.md`.

changelog-entry: exit 0
lesson: none — a one-off race in one fixture, fixed directly; the sweep found no second member, so L20's bar is not met
deferred: none

Follow-up (from `REVIEW.md`, advisory): assert that the first reap found at least one live gate, so a degraded `ps`
fails loudly instead of the reap silently doing nothing.

Chain ran; the named floor verdicts are as shown. This is NOT a judgment that the increment is good or wise. That is
the human's call at the post-review gate.
