# SHIP — pharn-test-red

Queue item 4 of 7 (the AC-delivery queue), run through `/pharn-dev-ship`.

## Where the run ended

**GATE 2**, after two review iterations. Stages: `/pharn-dev-plan` → GATE 1 → `/pharn-dev-grill` (inline, 4 concerns;
an independent agent then found 13, two blocking — the plan was amended as G1–G13 before the dependent code was
written) → `/pharn-dev-build` → `/pharn-dev-regress` → `/pharn-dev-verify` → `/pharn-dev-review` (iteration 1:
blocked on one floor-gate finding) → fix pass (plan amended to declare `PROTECTED-FOLLOWUPS.md`) →
`/pharn-dev-regress` → `/pharn-dev-verify` → `/pharn-dev-review` (iteration 2: GREEN).

**Both human gates were DELEGATED and are recorded as model decisions, never human approvals.** The user wrote in
chat on 2026-09-23: "you have to approve everything I want to see all 7 things merged to the main branch when I
wake up tomorrow. before you merge make sure all checks are green." GATE 1 (plan decisions a–f and the G1–G13
amendment) and GATE 2 (merge once CI is green) were decided by the model under that delegation.

## Structural verdicts, verbatim

- `/pharn-dev-grill` → `check-plan-lessons.mjs` exit **0**.
- `/pharn-dev-build` → `validate.mjs` exit **0**.
- `/pharn-dev-regress` → `regression-report.json` `.verdict` **`"no-regressions"`**.
- `/pharn-dev-verify` → `verify-report.json` `.verdict` **`"PASS"`** over the clean-copy map (raw: `format:check`
  only, every flagged file inside `.claude/worktrees/`; `VERIFY.md` records both).

Advisory: `GRILL.md` (17 concerns, all adopted), `REVIEW.md` (two iterations, every finding's outcome listed).

changelog-entry: exit 0

lesson: none — the blocking review finding recurs canon L52 (a rule over a set exercised over one ORDER of its
members), and the bootstrap-approval finding recurs L43/L37 (a value trusted where the owning checker could be run).

deferred: none

## Protected edits left for a human

None new is REQUIRED — no trusted doc is made false by 6.18.0. `PROTECTED-FOLLOWUPS.md` refines item 03's pending
`pharn/ARCHITECTURE.md` §6 row to mention the red-run evidence and the bootstrap record. Item 03's own follow-ups
(`ARCHITECTURE.md` §4/§6, `LIMITS.md` §8 "ten" → "eleven") are still pending.

_chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that
is the human's call at the post-review gate (here delegated, and recorded as such above)._
