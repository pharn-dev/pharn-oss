# SHIP — core-312-reuse-and-effort-measure

Linear CORE-312 (epic CORE-293). Gated `/pharn-dev-ship`, no `--loop`.

## Stages, in order

1. `/pharn-dev-plan` → `PLAN.md`, halted at **GATE 1**.
2. **GATE 1 — decided by the batch orchestrator as a model decision under the maintainer's delegation** ("You make all
   decisions, do not ask me"), **not a human approval**: AC2 Option A (0 probe runs, CORE-112's `grill-medium` arm as
   corrected by CORE-313 cited only as a proxy, "no gain shown", keep/revert left to the maintainer); wait for
   CORE-310's evidence and build once. Recorded in `PLAN.md`, "GATE 1 — decisions".
3. `/pharn-dev-grill` → `GRILL.md` (advisory: 3 concerns, 0 blocking-severity); `check-plan-lessons.mjs` exit 0.
4. `/pharn-dev-build` → `.dev/measurements/reuse-and-effort-2026-11-23.md` and the `CHANGELOG.md` entry; the record
   was updated inside the anchored scope when CORE-310 run 2's evidence landed; `validate.mjs` exit 0.
5. `/pharn-dev-regress` → `regression-report.json` `no-regressions` (one load-timing test red at base only, filed
   `pre_existing`; no new failure at head).
6. `/pharn-dev-verify` → run 1 `FAIL` (`format:check`, a stale Prettier resolved from the main checkout); environment
   fixed with `npm ci`; run 2 `PASS`. Both runs are in `VERIFY.md`.
7. `/pharn-dev-review` → `REVIEW.md`: GREEN, 0 floor-gate findings, 2 minor advisory.
8. **GATE 2 — decided by this agent as a model decision under the maintainer's delegation, not a human approval:**
   open the pull request; the maintainer (through the orchestrator) merges.

verdict-grill: exit 0
verdict-build: exit 0
verdict-regress: no-regressions
verdict-verify: PASS
run-ended: GATE 2

changelog-entry: exit 0

lesson: none — the one surprise (a worktree without `node_modules` resolving an older Prettier) is an environment slip
fixed in the run, not a recurring mechanism failure that clears L20's bar.

deferred: none

## Pointers

- Review: `.dev/features/core-312-reuse-and-effort-measure/REVIEW.md`
- Grill (advisory): `.dev/features/core-312-reuse-and-effort-measure/GRILL.md`

Chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate.
