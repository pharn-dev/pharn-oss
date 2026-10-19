# SHIP — review-lens-grouping

`/pharn-dev-ship` roll-up (advisory). It records that the chain ran and the floor verdicts it read. It is not an
approval, a "shipped" claim or a seal.

Increment: the undelivered half (b) of review finding CTX-3 (2026-10-12 review), the lens-subagent fan-out of
`/pharn-review`. The maintainer invoked it as `/pharn-dev-ship deliver CTX-3` on 2026-10-18. Every stage ran in its
own opus subagent in an isolated worktree, with `feat/review-lens-grouping` as the handoff pointer; the orchestrator
held both gates and put each to the human.

## Gates

- **GATE 1 — plan acceptance: the human decided it, in two rounds.**
  - Round 1: the first plan (`review-lens-agent`) recommended a narrowed `pharn-review-lens` subagent alone, with
    grouping deferred. The human chose to re-plan, clarified as "grouping on top of B" in one increment, and answered
    the open questions: probe before build, lens evals at N=1 with `trust-fence` ×5, `omitClaudeMd: true`.
  - Round 2: the human approved the `review-lens-grouping` plan: the six security lenses each alone, the three
    scanner-less lenses as one family, contamination reported only. The planner's defaults for a failed probe (back
    to GATE 1), `LIMITS.md §3a` (left) and the measurement route were stated and not objected to.
- **The probe (before build), run by the human** (`claude -p … --permission-mode acceptEdits` in a scratch checkout
  of main holding the definition): `pharn-review-lens` first request 8,200 tokens against 46,764 for
  `general-purpose` in the same session (17.5%, under the 50% go/no-go); an out-of-scope `Write` inside the custom
  subagent was denied by `enforce-writes-scope.cjs`. GO. Recorded in `MEASUREMENTS.md` §2.
- **GATE 2 — post-review decision: the human chose FIX FIRST**, plus: fix the stale-output gap now, run the
  confirmation round for the error-handling group, and promote the review's lesson candidate. The fix round ran in
  two phases in the build worktree, on a fresh build Step 0 anchor.
- **Promotion gate: the human accepted L75** as rendered, after being shown its tension with L49.
- **The merge decision is the human's**, asked after this roll-up.

## Stages and verdicts (verbatim)

1. `/pharn-dev-plan` → `PLAN.md`; `check-plan-lessons.mjs` exit 0 in each round.
2. `/pharn-dev-grill` → `GRILL.md`; `check-plan-lessons.mjs` exit **0** (re-run by the orchestrator: GREEN, 22
   cited ids). 11 advisory concerns; the build addressed all but 7 (`pharn/ARCHITECTURE.md §4`, human-only) and
   partly 8.
3. `/pharn-dev-build` → `node pharn/floor/validate.mjs .` exit **0** (GREEN, 37 capabilities), in the build and both
   fix-round phases.
4. `/pharn-dev-regress` → `regression-report.json` `.verdict`: **`no-regressions`** (base `0fefcb8`), first pass and
   fix round.
5. `/pharn-dev-verify` → `verify-report.json` `.verdict`: **`PASS`**, `failing_gates: []`, first pass and fix round
   (reconcile CLEAN on each epoch, and CLEAN again after the L75 promotion).
6. Grouped lens eval (after build, before GATE 2), human-launched, plus one confirmation round the orchestrator typed
   into the human's terminal at their "continue". `MEASUREMENTS.md` §3 holds the numbers. The only RED from a
   written lens is the pre-existing self-contradictory `swallowed-exception` expected file. One grouped run wrote no
   `findings.json` after its compound Bash calls were refused: 1 of 3 runs, not confirmed.
7. `/pharn-dev-review` → `REVIEW.md`: GREEN, 0 floor-gate findings, 9 advisory (4 important). A2–A7 were fixed in the
   fix round; A1, A8 and A9 are named follow-ups.

The run ended at **GATE 2**.

- Artifacts: [PLAN.md](PLAN.md), [GRILL.md](GRILL.md), [REGRESSION.md](REGRESSION.md), [VERIFY.md](VERIFY.md),
  [REVIEW.md](REVIEW.md), [MEASUREMENTS.md](MEASUREMENTS.md). Their findings are not restated here.
- changelog-entry: exit 0
- lesson: promoted L75
- deferred: none

## Orchestrator correction, recorded

The orchestrator first told the human that run 2's error-handling group claimed writes it never made. Its final
message says the opposite: it stopped before writing because its scanner calls were refused. The build agent caught
this in phase B and corrected the wording, and the orchestrator corrected it to the human.

---

_Chain ran; the named floor verdicts are as shown. This is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate._
