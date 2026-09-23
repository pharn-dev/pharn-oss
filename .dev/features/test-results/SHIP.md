# SHIP — test-results

Queue item 1 of 7 (the AC-delivery queue, `../pharn-oss-spec-run/runbook.md`), run through `/pharn-dev-ship`.

## Where the run ended

**GATE 2**, after two review iterations. Stages, in order: `/pharn-dev-plan` → GATE 1 → `/pharn-dev-grill` →
`/pharn-dev-build` → `/pharn-dev-regress` → `/pharn-dev-verify` → `/pharn-dev-review` (iteration 1: blocked on two P0
wording findings) → fix pass → `/pharn-dev-regress` → `/pharn-dev-verify` → `/pharn-dev-review` (iteration 2: GREEN).

**Both human gates were DELEGATED, and this records them as model decisions, never as human approvals.** On
2026-09-23 the user wrote, in chat: "you have to approve everything I want to see all 7 things merged to the main
branch when I wake up tomorrow. before you merge make sure all checks are green." So:

- **GATE 1 (plan approval)** — approved by the model under that delegation, including the options-halt decisions
  a–g recorded in `PLAN.md` and its two post-grill amendments.
- **GATE 2 (merge / fix / abandon)** — decided by the model under the same delegation: merge, once CI is green.

## Structural verdicts, verbatim

- `/pharn-dev-grill` → `check-plan-lessons.mjs` exit **0**.
- `/pharn-dev-build` → `validate.mjs` exit **0** (GREEN, 36 capabilities).
- `/pharn-dev-regress` → `regression-report.json` `.verdict` **`"no-regressions"`**.
- `/pharn-dev-verify` → `verify-report.json` `.verdict` **`"PASS"`**, over the clean-copy map. The raw working-tree
  map is `FAIL` on `format:check` alone, and every file it flagged lies in another session's worktree under
  `.claude/worktrees/` (`VERIFY.md` records both).

Advisory artifacts: `GRILL.md` (17 concerns, all weighed; most adopted in the plan amendments), `REVIEW.md` (the
findings and what happened to each).

changelog-entry: exit 0

lesson: none — both blocking review findings were instances of the canon P0 disease (overclaiming wording, L2), not a
new mechanism, and the quadratic walk was a one-off; no candidate cleared L20's bar.

deferred: none

## Protected edit left for a human

`pharn/ARCHITECTURE.md` §4's contract list — `PROTECTED-FOLLOWUPS.md`. Applying it changes the spec hash, so apply
it between queue items.

_chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that
is the human's call at the post-review gate (here delegated, and recorded as such above)._
