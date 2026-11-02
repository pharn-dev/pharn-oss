# SHIP — stage-wait-capped (issue #410)

## Stages run, in order

1. `/pharn-dev-plan` → `PLAN.md`; GATE 1 approved by the human maintainer, relayed by the orchestrator (the plan's
   `approval:` line records it, with its three defaults).
2. `/pharn-dev-grill` → `GRILL.md`. `check-plan-lessons.mjs` exit **0** (GREEN). Advisory: 3 concerns (0 blocking, 1
   important, 2 minor), all folded into the build (the exit-6 mapping names its CLI next to `entry-gates.mjs`'s exit 6;
   the S9b row says a reported result may be on disk; the cost-ledger sentence says the orchestrator's own requests
   bill to the open stage too).
3. `/pharn-dev-build` → the plan's 10 written paths (`stage-agent-core.test.mjs` included; `stage-load-budget.test.mjs`
   needed no change). `validate` exit **0** (`FLOOR: GREEN — 37 capabilities`).
4. Mid-chain, at the orchestrator's request: fast-forward `607d82c2..0b18864b` (the upstream fix for 12 pre-existing
   test failures), then build Step 0 re-run (setter, then re-anchor). Evidence is in `PLAN.md`, "Re-anchor note": pre-ff
   reconcile `CLEAN`; post-ff `ESCAPE` with exactly the four paths `git diff --name-only 607d82c2 0b18864b` lists;
   reason "orchestrator chose a re-anchor; §2a merged covers only upstream commits".
5. `/pharn-dev-regress` (run 2, base `0b18864b`) → `regression-report.json` `.verdict`: **`no-regressions`**.
6. `/pharn-dev-verify` → `verify-report.json` `.verdict`: **`PASS`** (test, validate, lint, format:check, lint:md,
   structural, reconcile — all exit 0; reconcile `CLEAN`).
7. `/pharn-dev-review` → `REVIEW.md`: GREEN, 0 floor-gate findings, 4 advisory (minor) findings, and a proposed
   `pharn/LIMITS.md §8` human patch.

Where the run ended: **GATE 2** (the human's merge / fix / abandon decision, via the orchestrator).

## Verdicts, verbatim

- `/pharn-dev-build` → `validate` exit `0`
- `/pharn-dev-regress` → `regression-report.json` `.verdict` `"no-regressions"`
- `/pharn-dev-verify` → `verify-report.json` `.verdict` `"PASS"`

changelog-entry: exit 0

## Pointers

- Findings: `.dev/features/stage-wait-capped/REVIEW.md` (advisory); `.dev/features/stage-wait-capped/GRILL.md`
  (advisory).
- Orchestration deviations (scratch runners for the refused shell forms; run 1 of regress superseded):
  `REGRESSION.md` and `VERIFY.md`.

lesson: skipped

deferred: none

chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate.
