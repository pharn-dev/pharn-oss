# SHIP — verify-ac-gate

Queue item 6 of 7 (the AC-delivery queue), run through `/pharn-dev-ship`.

## Where the run ended

**GATE 2.** Stages, in order:

1. `/pharn-dev-plan` → GATE 1 → `/pharn-dev-grill`. An independent agent returned RED with one blocking finding: S13
   was unreachable for the brief's main case. The plan was amended as G1–G10 before the dependent code was written.
2. `/pharn-dev-build` → `/pharn-dev-regress` → `/pharn-dev-verify` → `/pharn-dev-review`. Iteration 1 was GREEN
   with 0 blocking, 9 should-fix and 5 notes.
3. A fix pass, then `/pharn-dev-regress` → `/pharn-dev-verify` again, then a second read-only agent re-checking each
   fix (iteration 2): RED on three over-broad wording lines and one test gap, all fixed and re-verified.

**Both human gates were DELEGATED and are recorded as model decisions, never human approvals.** On 2026-09-23 the
user wrote in chat: "you have to approve everything I want to see all 7 things merged to the main branch when I wake
up tomorrow. before you merge make sure all checks are green." The model decided under that delegation:

- **GATE 1:** plan decisions a–h, and the G1–G10 amendment;
- **GATE 2:** merge once CI is green.

## Structural verdicts, verbatim

- `/pharn-dev-grill` → `check-plan-lessons.mjs` exit **0**.
- `/pharn-dev-build` → `validate.mjs` exit **0**.
- `/pharn-dev-regress` → `regression-report.json` `.verdict` **`"no-regressions"`**.
- `/pharn-dev-verify` → `verify-report.json` `.verdict` **`"PASS"`** over the clean-copy map. The raw capture failed
  `format:check` only, and every flagged file is inside `.claude/worktrees/`; `VERIFY.md` records both.

Advisory: `GRILL.md` (10 findings, all adopted) and `REVIEW.md` (iteration 1: 14 findings, 13 fixed and 1 recorded as a bound; iteration 2: wording and one test gap, fixed).

changelog-entry: exit 0

lesson: none. Every defect recurs L22, L45, L58 or L59 (see `REVIEW.md`).

deferred: none

## Deviation from the brief, recorded

The brief says SHIP.md and RUN-REPORT "show the per-AC table". Here:

- `RUN-REPORT.md` renders the table by code;
- `/pharn-ship`'s `SHIP.md` and `/pharn-verify`'s `VERIFY.md` state the gate's verdict and cite that table, rather
  than having a model retype reporter-written test ids (L22; grill G10, review #13).

## Protected edits left for a human

`PROTECTED-FOLLOWUPS.md` proposes:

- the `pharn/ARCHITECTURE.md` §6 verify row;
- the §4 contract names;
- the AC gate's residuals as a stated limit in `LIMITS.md`.

`THREAT-MODEL.md` needs nothing. Items 01, 03, 04 and 05's follow-ups are still pending; item 07 consolidates them.

_chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that
is the human's call at the post-review gate (here delegated, and recorded as such above)._
