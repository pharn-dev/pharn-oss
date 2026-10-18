# SHIP — grill-griller-slim

`/pharn-dev-ship` roll-up (advisory). It records that the chain ran and the floor verdicts it read. It is not an
approval, a "shipped" claim or a seal.

Increment: the rest of review finding CTX-1 (2026-10-12 review). The maintainer invoked it as `/pharn-dev-ship deliver
CTX-1` on 2026-10-18. Every stage ran in its own opus subagent in an isolated worktree, with the branch as the handoff
pointer; the orchestrator held both gates.

## Gates

- **GATE 1 — plan acceptance: the human approved it, in two rounds.**
  - Round 1: the first plan (`grill-griller-selection`) recommended shipping no runtime selection ("R0"). Its numbers
    are in `MEASUREMENTS.md`:
    - archetype matching saves 0 B in installs, because the installer already applies it;
    - choosing grillers by `## Files` loses findings, or saves 1.4% (a11y only);
    - one subagent per griller costs about 25× what it saves.

    The human chose to re-plan as "R2", a deeper trim that keeps every griller. They put the migrations `applies`
    widening in a separate increment and folded in the `/pharn-dev-grill` trim.

  - Round 2: the human approved the R2 plan (`grill-griller-slim`) with these answers:
    - also omit the `## The two layers` intro;
    - apply the deep omission only to `kind: pharn-owned` grillers;
    - edit the six grillers that held grill-time guidance under `### Layer 1`.

    They also accepted the planner's defaults: grill-scan worded true in both modes, and the grillers read in full when
    the scan fails.
- **GATE 2 — post-review decision: the human chose FIX FIRST**, covering review findings 1–3, including the authoring
  rule.
  - The plan was amended to widen `## Files` to all 13 grillers, then built, regressed and verified, and the reviewer
    reviewed the fix round.
  - The fix-round review recommended fixing findings 8 and 9 before merge. The orchestrator sent them back under the
    same FIX decision; that was a model decision, not a further human answer.
  - The merge decision is the human's, asked after this roll-up.

## Stages and verdicts (verbatim)

1. `/pharn-dev-plan` → `PLAN.md`; `check-plan-lessons.mjs` exit 0. The plan was re-planned twice and amended once for
   the fix round, each time exit 0.
2. `/pharn-dev-grill` → `GRILL.md`; `check-plan-lessons.mjs` exit **0**.
   - Round 1 raised 3 advisory findings; 2 were folded in.
   - The fix round re-checked exit 0 and added a note, with no full interrogation.
3. `/pharn-dev-build` → `node pharn/floor/validate.mjs .` exit **0** (GREEN, 37 capabilities) in every round.
4. `/pharn-dev-regress` → `regression-report.json` `.verdict`: **`no-regressions`** (base `44b12e8`), in round 1 and
   the fix round.
5. `/pharn-dev-verify` → `verify-report.json` `.verdict`: **`PASS`**.
   - Round 1 and the fix round passed.
   - Fix round 2 (review findings 8 and 9) first read **FAIL**: `reconcile` reported an ESCAPE on
     `.dev/memory-bank/lessons-learned.md` (`denied_by: protect-trusted-paths.cjs`).
     - Cause: the orchestrator made the L74 promotion in its own checkout, and it reached the build worktree by
       fast-forward after that epoch's anchor. Reconcile cannot attribute a write from another worktree, a bound the
       contract states.
     - The four uncommitted edits were restored to HEAD and a fresh build Step 0 anchor was taken after `8a22676`. The
       edits were redone through Edit, and verify was re-run: **PASS**, reconcile CLEAN over the four declared paths.
     - The baseline was never edited. `VERIFY.md` records both attempts.
6. `/pharn-dev-review` → `REVIEW.md`.
   - Round 1: GREEN, 0 floor-gate findings, 7 advisory.
   - Fix round: findings 1–3 resolved, 3 new minor advisory findings (8–10), none blocking. Findings 8 and 9 were fixed
     in fix round 2.

The run ended at GATE 2.

- Review: `.dev/features/grill-griller-slim/REVIEW.md`. Grill log (advisory): `.dev/features/grill-griller-slim/GRILL.md`.
  Measurements: `.dev/features/grill-griller-slim/MEASUREMENTS.md`.
- changelog-entry: exit 0
- lesson: promoted L74
- deferred:
  - the builder's candidate "measure 'before' from the base commit when a build edits what it measures" (one
    occurrence);
  - the builder's candidate "a runner that replaces a pinned shell form must parse the helper's real output shape" (one
    occurrence);
  - the review's candidate B (put the rule for what may sit under omitted headings in the trimmed file itself). It is
    now built as fix F1, so it is not carried as a lesson.

## Named follow-ups (not built here)

- `migrations-applies-universal`: widen the migrations griller's `applies` (the human's GATE 1 choice: a separate
  increment).
- `griller-body-slim`: the kept preamble (about 20% of the extract), and review findings 6 ("(Layer 1)" pointers in kept
  Procedures) and 10 (the scanner grillers' Layer 1 under the new authoring paragraph).
- Review findings 4 (pin a heading between the copied scan section and the model's findings), 5 (`/pharn-dev-grill`'s
  list of floor checks) and 7 (an eval of the extract form, only on a real miss, P7).
- `walkers-skip-pharn-scratch`: `count-grillers` / `validate` count scratch griller copies under `.pharn/`.

## Versioning

6.63.0 (minor). `origin/main` stayed at `44b12e8` (6.62.0) for the whole run, so nothing was renumbered.
`check:changelog-entry` exit 0 against that merge-base. There is no MIN_CLI change and no trusted-doc edit.

## Process deviations (recorded, not hidden)

- **Node runners:** the pinned shell forms of build Step 2b, regress and verify were refused in the isolated worktrees,
  so each ran through a node runner under `.pharn/` with argv arrays (`REGRESSION.md`, `VERIFY.md`).
- **Regress runner:** the round-1 runner's second attempt ran past the 600 s tool limit and finished in the background,
  without being restarted.
- **Early `prettier --write`:** in the fix round the builder ran `npx prettier --write` on two in-scope files before the
  build's own format step. It was a Bash write; both paths are declared, and reconcile read CLEAN.
- **Promotion and roll-up in a different checkout:** the L74 promotion and this roll-up were written in the
  orchestrator's checkout, on a local branch at the PR head. There, `--amend-scope` amended a stale local epoch left
  from an earlier run (amendments 2 and 3), which is harmless local scratch. The promotion's cross-worktree effect on the
  build epoch is described under verify above.

Chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate.
