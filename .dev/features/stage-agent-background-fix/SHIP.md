# SHIP — stage-agent-background-fix

Advisory roll-up of a `/pharn-dev-ship` run (2026-10-25), started by another session for the pharn-starter cost
measurement and run in a desktop-app worktree session.

## Where the run ended

**RED-verdict STOP at `/pharn-dev-verify`** (`verify-report.json` `.verdict` = `"FAIL"`, failing gate `reconcile`).

## Stages, in order, with the structural verdict each was read on

1. `/pharn-dev-plan` → PLAN.md; `check-plan-lessons.mjs` exit 0. **GATE 1: the human approved the plan** ("Approve as
   drafted", via an interactive question in this session), and chose the write route ("Bash writes, hook-checked").
2. `/pharn-dev-grill` → GRILL.md; `check-plan-lessons.mjs` exit 0 (3 advisory concerns, 0 blocking).
3. `/pharn-dev-build` → BUILD.md; `node pharn/floor/validate.mjs .` exit 0 (GREEN).
4. `/pharn-dev-review` → REVIEW.md (advisory; GREEN, 0 floor-gate, 7 advisory findings). It ran in a fresh-context
   subagent while regress was running, before verify — out of the chain's order. Its findings A1–A5 were applied
   before the regress run that counts (BUILD.md, "Fix round").
5. `/pharn-dev-regress` → `regression-report.json` `.verdict` = `"no-regressions"` (Run 2; Run 1 was a load failure
   in an untouched hook test, recorded in REGRESSION.md).
6. `/pharn-dev-verify` → `verify-report.json` `.verdict` = `"FAIL"`, `failing_gates: ["reconcile"]`. The one escape is
   `pharn/floor/mark-phase.test.mjs`, declared in `## Files` after the build's anchor (BUILD.md deviation 3,
   VERIFY.md). Every other gate exit 0.

Pointers (cited, not restated): GRILL.md, REVIEW.md.

changelog-entry: not-reached (pharn-dev-verify)

lesson: not-reached (pharn-dev-verify)

deferred: REVIEW.md's proposed candidate (closed-set importers in scope before the anchor), for a
`/pharn-dev-memory-promote` run if the human wants it.

## GATE 2 decision

The human, asked in this session after verify: **"Accept, commit and open PR"** — the `reconcile` escape
(`pharn/floor/mark-phase.test.mjs`) is accepted as the known, explained edit. Merging stays the human's call.

## Deviations the human should see

- Every in-repo write went through a scratchpad helper that runs both real PreToolUse hooks with this worktree as root
  and writes only on two exit-0s (this session's hooks judge paths from the main checkout and deny every in-worktree
  Write). Chosen by the human at GATE 1. The prevention is the helper's (self-reported); verify's reconcile is the
  floor detection, and it found exactly the one path above.
- The build's Step 0 ran twice before any build write (README.md added to `## Files`).

_Chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate._
