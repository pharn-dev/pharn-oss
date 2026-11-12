# SHIP — gate-durations

An advisory roll-up of the `/pharn-dev-ship` chain for this increment (Linear CORE-75): each gate's wall time is
recorded in the gate-run stamp, in the cost ledger's work rows (`pharn-stage-work/2`) and as entry `gate` facts. It
records that the chain ran and its floor verdicts. It is not a "shipped" claim, an approval or a seal.

- where the run ended: **GATE 2**, after a second regress/verify iteration that followed the review's one fix

## Stages run, in order

1. `/pharn-dev-plan` → `PLAN.md`; `check-plan-lessons` exit 0, `set-writes-scope --check --from-plan` exit 0.
2. **GATE 1** — approved as written, with Q1–Q4 resolved as recommended (`PLAN.md`, "Resolved questions (GATE 1)").
3. `/pharn-dev-grill` → `GRILL.md`: lessons declaration GREEN; 5 advisory concerns (2 important, 3 minor), all
   applied in the build (the ledger gate id became a membership test; two labels were corrected from floor to tested
   behaviour; three contract sentences were added).
4. `/pharn-dev-build` → the 25 declared paths; `validate.mjs` GREEN; whole-repo `format:check`, `lint`, `lint:md`
   clean.
5. `/pharn-dev-regress` (iteration 1) → `no-regressions`.
6. `/pharn-dev-verify` (iteration 1) → `PASS`.
7. `/pharn-dev-review` → `REVIEW.md`: 0 floor-gate findings, 3 advisory (1 important: the CHANGELOG did not disclose
   that a `/1` work row's `head`/`gates` key sets are now closed).
8. Fix inside `## Files` under the plan's re-set scope: the CHANGELOG `[7.11.0]` entry names the tightening.
9. `/pharn-dev-regress` (iteration 2) → `no-regressions` (base 5984 / head 5992 tests passed, `new_failures: []`).
10. `/pharn-dev-verify` (iteration 2) → `PASS` (7 gates, each exit 0).
11. Re-review of the change → GREEN, 0 floor-gate findings.

## Decisions, and whose

These were made by **the orchestrating model under the maintainer's delegation** for epic CORE-13. They are model
decisions, not human approvals:

- GATE 1: plan approved as written; Q1 per-side `durations` list (length `executed`, null for unknown); Q2 facts only,
  the entry view stays `entry-observations/1` and the display is a follow-up; Q3 `gate` under
  `pharn-entry-observation/1`, with the older-reader sentence in the contract; Q4 the kill-timer guard is included and
  AC-4 keeps its wording.
- GATE 2 (delegated, under the rule: verify PASS, regress clean, zero floor-gate review findings): met after iteration
  2 — proceed to the pull request, not merged.

## Verdicts (the last iteration's)

verdict-grill: exit 0
verdict-build: exit 0
verdict-regress: no-regressions
verdict-verify: PASS
run-ended: GATE 2

- Review: `REVIEW.md` (advisory). Grill: `GRILL.md` (advisory).

changelog-entry: exit 0

lesson: none — no mechanism failed in a way that would recur; the one notable defect class (a `--gates` id defaults to
its command line) was caught by the grill before the build and is now a tested membership test.

deferred: none

## Follow-ups (named, not built)

- Show the per-gate durations on the cost ledger's screen table and in `RUN-REPORT.md` (GATE-1 Q2).
- The contracts and the CHANGELOG name 7.11.0; if a sibling PR takes that version first, renumber them (REVIEW minor).
- `identityKey`'s `gate` branch is reached only by a direct call (REVIEW minor).

chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate.
