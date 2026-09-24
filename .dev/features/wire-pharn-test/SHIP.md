# SHIP — wire-pharn-test

Queue item 5 of 7 (the AC-delivery queue), run through `/pharn-dev-ship`.

## Where the run ended

**GATE 2**, after two review iterations. Stages: `/pharn-dev-plan` → GATE 1 → `/pharn-dev-grill` (inline, 3 concerns;
an independent agent — relaunched once after a rate-limit failure, at the user's "Try again" — found 11, two blocking;
the plan was amended as G1–G11 before the dependent code was written) → `/pharn-dev-build` → `/pharn-dev-regress` →
`/pharn-dev-verify` → `/pharn-dev-review` (iteration 1: 0 blocking, 4 important, 7 minor, one of them found by
executing the Step 6c builder) → fix pass → `/pharn-dev-regress` → `/pharn-dev-verify` → `/pharn-dev-review`
(iteration 2: GREEN).

**Both human gates were DELEGATED and are recorded as model decisions, never human approvals.** The user wrote in
chat on 2026-09-23: "you have to approve everything I want to see all 7 things merged to the main branch when I
wake up tomorrow. before you merge make sure all checks are green." GATE 1 (plan decisions a–g and the G1–G11
amendment) and GATE 2 (merge once CI is green) were decided by the model under that delegation.

## Structural verdicts, verbatim

- `/pharn-dev-grill` → `check-plan-lessons.mjs` exit **0**.
- `/pharn-dev-build` → `validate.mjs` exit **0**.
- `/pharn-dev-regress` → `regression-report.json` `.verdict` **`"no-regressions"`**.
- `/pharn-dev-verify` → `verify-report.json` `.verdict` **`"PASS"`** over the clean-copy map (raw: `format:check`
  only, every flagged file inside `.claude/worktrees/`; `VERIFY.md` records both).

Advisory: `GRILL.md` (14 concerns, all adopted), `REVIEW.md` (two iterations, every finding's outcome listed).

changelog-entry: exit 0

lesson: none — the builder defect recurs L45 and the policy-in-prose finding recurs L35/L22 (see `REVIEW.md`).

deferred: none

## Protected edits left for a human

`pharn/ARCHITECTURE.md` §6 — the spine string is now STALE (every product surface says `… grill → test → build …`),
not merely incomplete; `PROTECTED-FOLLOWUPS.md` carries the edit with item 04's table row. Item 03's `ARCHITECTURE.md`
§4 and `LIMITS.md` §8 follow-ups are still pending.

_chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that
is the human's call at the post-review gate (here delegated, and recorded as such above)._
