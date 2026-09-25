# SHIP — verify-ac-gate-fixes

**Stages that ran, in order:** `/pharn-dev-plan` → GATE 1 → `/pharn-dev-grill` → `/pharn-dev-build` →
`/pharn-dev-regress` → `/pharn-dev-verify` → `/pharn-dev-review` → GATE 2. **The run ended at GATE 2.** A usage limit
interrupted it once, during the build. It resumed from the worktree state and did not redo finished work.

## Structural verdicts, verbatim

- `/pharn-dev-grill` → `check-plan-lessons.mjs` exit **0** (the declaration only). Its interrogation raised 6
  advisory concerns (`GRILL.md`). All 6 were folded into `PLAN.md` before the build.
- `/pharn-dev-build` → `node pharn/floor/validate.mjs .` exit **0** (`FLOOR: GREEN — 36 capabilities checked`).
- `/pharn-dev-regress` → `regression-report.json` `.verdict` = **`no-regressions`** (`REGRESSION.md`).
- `/pharn-dev-verify` → `verify-report.json` `.verdict` = **`PASS`**. All seven gates exited 0, `reconcile` among
  them (`VERIFY.md`).
- `/pharn-dev-review` → `REVIEW.md`: GREEN, 0 floor findings, 2 minor advisory findings, recorded rather than fixed.

changelog-entry: exit 0

lesson: none — the failures this increment fixed are already named by canon: L29/L52 (a set-quantified rule tested
for one member) and L41 (a fixture default every test shares). A new entry would restate them (`REVIEW.md`).

deferred: none

## The two human gates — decided under delegation, NOT human approvals

The user delegated both gates on 2026-09-24, verbatim: _"fix all findings, if you can ship some of them at one run do
it, if you can ship some of them simultaniuslly in worktrees do it. each fix needs to be fixed by using pharn-dev-ship
command and needs to ends by merged pull request. you merge pull requests when the CI are green."_ Both decisions below
are **model decisions made under that delegation**. Neither was made by a human.

- **GATE 1 — plan approval.** The orchestrator (the session that spawned this run) replied "GATE 1 approved" with
  **option A** for the one open question: INCOMPLETE also outranks an AC gate that could not measure. Its reasoning,
  recorded as asked:
  - INCOMPLETE is never green.
  - It spends at most one bounded rebuild or loop iteration before the re-measured verdict stands.
  - It removes the bootstrap dead end.

  The approval carried four build conditions, each met:
  1. The sentinel is swallowed alone, and a crash stays a crash. Tested with a `--import` preload, and
     mutation-checked.
  2. Flag-less `check-verify.mjs` output is byte-identical. The EQUIVALENCE tests are unchanged and green
     (`VERIFY.md`).
  3. `--ac-gate` with a red real gate over an incomplete build is FAIL. These are the `*/1/red` cells of the
     `PRECEDENCE` table.
  4. `check-loop-fresh.mjs` is untouched.

  A later addendum fixed the CHANGELOG date as the actual date, 2026-09-25.

- **GATE 2 — merge / fix / abandon.** Decision under delegation: **merge once CI is green.** The basis is structural:
  - validate exit 0;
  - regress `no-regressions`;
  - verify `PASS`;
  - no blocking review finding;
  - the CHANGELOG entry check exit 0.

  The two advisory review findings are minor. Fixing either would move shipped bytes for no verdict change, so they
  stay recorded in `REVIEW.md`. This roll-up does not merge. The orchestrator merges, and only after CI is green.

## Pointers

`PLAN.md` (design D1–D3, GATE 1 conditions) · `GRILL.md` (advisory) · `REGRESSION.md` · `VERIFY.md` · `REVIEW.md` ·
the two machine reports.

_Chain ran; the named floor verdicts are as shown. This is NOT a judgment that the increment is good or wise. That is
the human's call at the post-review gate, delegated here as recorded above._
