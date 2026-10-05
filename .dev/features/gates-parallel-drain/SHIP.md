# SHIP — gates-parallel-drain

Batch item 5 of the 2026-10-05 "make /pharn-loop fast" batch. Branch `feat/gates-parallel-drain`, base `main`
(d8fd005, 6.38.1). This is an apparatus-only increment: no product byte changes and no `SKILLS_VERSION` bump.

## Stages, in order, and where the run ended

1. `/pharn-dev-plan`: the first plan (commit `4d40d03`) proposed an opt-in concurrent `sides` phase in
   `stage-regress.mjs`.
2. **GATE 1**, decided by the **orchestrating model under the user's delegation for this batch**, not by a human:
   **SHRINK**. Do not build the phase; deliver the findings as an apparatus-only decision record, plus two named
   follow-ups. The reasons are recorded in PLAN.md, "GATE 1 decision".
3. The plan was rewritten as that decision record.
4. `/pharn-dev-grill` on the shrunk plan:
   - Step 1b (`check-plan-lessons`) was GREEN.
   - It raised 3 advisory concerns (1 important, 2 minor), and all 3 were taken into PLAN.md: an unreachable reopen
     trigger was replaced, a percentage corrected, and an extrapolation labelled.
5. `/pharn-dev-build`, `/pharn-dev-regress`, `/pharn-dev-verify`: **not run, deliberately.** No floor code, contract,
   command or capability changes, so the gates below are the only checks with anything to check. The dev pipeline's
   regress and verify stages exist to judge a build, and this increment has none.
6. The dev gates (below), then the PR to `main`.

## Structural verdicts, verbatim

- `check-plan-lessons` (PLAN.md): GREEN, `applied_lessons: L24, L58, L66`.
- `npm run check`: exit 0. Every gate before `test` was GREEN, and `check:reconcile` read `NO_BASELINE`. `test`: 4650
  tests, 4650 pass, 0 fail. It took 1,541 s at a load average of ≈ 80–97 from the concurrent builders. This run came
  before SHIP.md existed; prettier and markdownlint were re-run on SHIP.md alone afterwards.
- `check-changelog-entry --merge-base origin/main`: GREEN, 1 new entry; no merged entry or released heading changed.

## Records

- changelog-entry: `[Unreleased]`, `### Added`, dated 2026-10-05
- version: none (apparatus only; the 6.44.0 the orchestrator first assigned is not claimed)
- lesson: none. No candidate clears L20's bar: the nested-checkout hazard (F1) was found by reading configs, not by a
  failure that recurred, and it is recorded as a follow-up precondition instead.
- deferred: `regress-base-outside-tree`, `gates-within-side-parallel` (both in PLAN.md, each with its preconditions and
  reopen trigger)
- merge: left to the maintainer

## Delegation and deviations (ADVISORY)

- Both gates in this record were decided by the orchestrating model under the user's delegation. Neither is a human
  approval.
- The contention figure (F4) is one sample, taken on a machine loaded by the batch's other builders (load average
  ≈ 20–36 on 8 cores). It is labelled that way everywhere it appears.
- The read-only inspection of `~/Projects/pharn-starter` (its `package.json` scripts, `tsconfig.json`,
  `vitest.config.ts`, `eslint.config.mjs`, `.gitignore`, `.prettierignore`) wrote nothing there.
