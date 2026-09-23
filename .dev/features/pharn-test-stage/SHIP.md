# SHIP — pharn-test-stage

Queue item 3 of 7 (the AC-delivery queue), run through `/pharn-dev-ship`.

## Where the run ended

**GATE 2**, after two review iterations. Stages: `/pharn-dev-plan` → GATE 1 → `/pharn-dev-grill` (an independent
agent found two blocking plan defects; the plan was amended) → `/pharn-dev-build` → `/pharn-dev-regress` →
`/pharn-dev-verify` → `/pharn-dev-review` (iteration 1: blocked on two floor-gate findings) → fix pass (plan amended
again) → `/pharn-dev-regress` → `/pharn-dev-verify` → `/pharn-dev-review` (iteration 2: GREEN).

**Both human gates were DELEGATED and are recorded as model decisions, never human approvals.** The user wrote in
chat on 2026-09-23: "you have to approve everything I want to see all 7 things merged to the main branch when I
wake up tomorrow. before you merge make sure all checks are green." GATE 1 (plan, options a–e and both amendments)
and GATE 2 (merge once CI is green) were decided by the model under that delegation.

## Structural verdicts, verbatim

- `/pharn-dev-grill` → `check-plan-lessons.mjs` exit **0**.
- `/pharn-dev-build` → `validate.mjs` exit **0**.
- `/pharn-dev-regress` → `regression-report.json` `.verdict` **`"no-regressions"`**.
- `/pharn-dev-verify` → `verify-report.json` `.verdict` **`"PASS"`** over the clean-copy map (raw: `format:check`
  only, every flagged file inside `.claude/worktrees/`; `VERIFY.md` records both).

Advisory: `GRILL.md` (11 concerns), `REVIEW.md` (two iterations, every finding's outcome listed).

changelog-entry: exit 0

lesson: none — both blocking review findings recur canon lessons (L45: the formatter-split `writes:` was caught only
by executing the invocation; L37/L55: the `(gated)` fail-open is a check that re-derived the setter's model instead of
being probed against it). The remedies (the executed-setter hygiene test, scope-key comparison) are built here.

deferred: none

## Protected edits left for a human

`pharn/ARCHITECTURE.md` §6 (spine + stage table) and §4 (contract list), and `LIMITS.md` §8 (now FALSE: "ten") —
`PROTECTED-FOLLOWUPS.md`. Editing ARCHITECTURE changes the spec hash, so apply between queue items.

_chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that
is the human's call at the post-review gate (here delegated, and recorded as such above)._
