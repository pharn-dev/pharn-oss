# SHIP — run-performance-breakdown (6.35.0)

## Stages run, in order, and where the run ended

1. `/pharn-dev-plan` → `PLAN.md`. **GATE 1 was delegated to the orchestrating model** by the maintainer's prompt ("Do
   not stop after writing a PLAN. Complete implementation, validation and final diff review") — a delegated model
   decision, not a human approval.
2. `/pharn-dev-grill` → `GRILL.md` (advisory interrogation, inline, not independent).
   `check-plan-lessons.mjs` exit **0**.
3. `/pharn-dev-build` → `node pharn/floor/validate.mjs .` exit **0** (GREEN, 36 capabilities).
4. `/pharn-dev-regress` → `regression-report.json` `.verdict` = **`no-regressions`** (the RERUN; the first run
   was void and is recorded in `REGRESSION.md`, "A void first run").
5. `/pharn-dev-verify` → `verify-report.json` `.verdict` = **`FAIL`**, `failing_gates: ["lint:md"]` — the only
   red is `.pharn/pr-body.md`, another session's gitignored scratch file (modified before this build's anchor).
   The same map with `lint:md` measured in a clean copy of the tree → **PASS**. `VERIFY.md` carries both.
6. `/pharn-dev-review` → `REVIEW.md` (an independent opus reviewer, read-only; 9 findings, all fixed or stated
   before verify ran, plus two from the orchestrator's own read).

Ended at **GATE 2**. The maintainer asked in chat for a pull request "when all finished"; the merge decision stays
theirs.

- changelog-entry: exit 0
- lesson: promoted L66
- deferred: none

## Orchestration notes (advisory)

- Every stage ran INLINE in the orchestrator's context (opus), except the review, which ran as a separate opus agent.
  Most build edits were made through Bash (python) rather than the Edit tool; the build's reconcile epoch judged
  every change against the plan scope plus the stage amendments and read **CLEAN** (0 escapes).
- A regress/verify attempt was stopped mid-run to fold in the review fixes; both stages were then run again from
  run-private scratch directories, and every verdict above comes from those reruns.

chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate.
