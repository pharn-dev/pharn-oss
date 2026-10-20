# SHIP — ship-step2-part

Batch 2026-10-19, group K, `/pharn-dev-ship`. Both human gates were DELEGATED to the batch orchestrator by the
maintainer. Each gate decision below was made by a model under that delegation, never by a human.

## Stages run, in order

1. `/pharn-dev-plan` → `PLAN.md`. `check-plan-lessons.mjs` exit 0.
2. **GATE 1 (delegated):** the orchestrator approved the plan. Q1: `## Running a stage` moves too. Q2: list the tests
   that read moved text in `## Files` before build Step 0. Q3: name both follow-ups. Q4: minor bump. It also asked
   that the grant's bound be stated in the CHANGELOG and the claims. The plan was amended before the anchor
   (`## Resolved at GATE 1`).
3. `/pharn-dev-grill` → `GRILL.md`. Lessons re-verification `check-plan-lessons.mjs` exit **0**; 5 advisory concerns,
   which gate nothing.
4. `/pharn-dev-build` → `BUILD.md`. `node pharn/floor/validate.mjs .` exit **0** (GREEN); `npm run check` exit 0.
5. `/pharn-dev-regress` → `regression-report.json` `.verdict`: **`no-regressions`**. This is the second run, against
   base `499f1f26` after the merge of origin/main. The first run, against `dcf7b43d`, was also `no-regressions`, after
   a re-run of one load flake (REGRESSION.md).
6. `/pharn-dev-verify` → `verify-report.json` `.verdict`: **`PASS`**. All 7 gates were exit 0, including `reconcile`
   CLEAN.
7. `/pharn-dev-review` → `REVIEW.md`. GREEN: 0 floor-gate findings, 4 advisory. The important one (P5: the stages
   part's load condition skipped the backstop that detects a Draft SPEC) was fixed before the final regress and verify.
8. **GATE 2 (delegated):** this record and the PR; the orchestrator decides merge, fix or abandon.

Where the run ended: GATE 2.

## Verdicts, verbatim

- build: `validate` exit `0`
- regress: `"verdict": "no-regressions"`
- verify: `"verdict": "PASS"`
- grill: `GRILL.md` (advisory). Review: `REVIEW.md` (advisory, cited, not restated).

changelog-entry: exit 0

lesson: none — batch rule: lessons are deferred, never promoted in this batch. The candidate is below and in
`REVIEW.md` § Proposed lesson candidate.

deferred:

- "A load condition must not name a verdict that a step INSIDE the loaded text computes." Source: `REVIEW.md` P5
  finding at `.claude/commands/pharn-ship.md:194`. First occurrence (L20 bar not met).

## Before the PR (recorded after this file was first written)

origin/main moved again while the stages ran: #371, #372 (6.69.0) and #370. The PR step merges it, renumbers this
increment to 6.70.0, and re-runs `npm run check` and `validate` on the merged tree (see the final report).

chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate (here delegated to the orchestrator).
