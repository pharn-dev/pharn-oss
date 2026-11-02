# PLAN — lessons-408-409

- spec_content_hash: d5a974303fd0b9568945c60423ae5a89c57d7b65f5baa03657e317fbe64f33a5
- applied_lessons: none
- increment: Close out the GATE 2 lesson decisions of the 2026-11-02 batch (PR #412). L80 (#408) and L81 (#409) were
  promoted through `/pharn-dev-memory-promote`, each with the maintainer's accept, in the commit before this one. This
  increment replaces the two `lesson: pending` lines in those features' `SHIP.md` with `lesson: promoted L80` /
  `lesson: promoted L81` (the closed set, `pharn-dev-ship.md` 2b.4), and adds the PR's CHANGELOG entry. Dev-only: no
  `SKILLS_VERSION` bump.
- layer(s): apparatus only (`.dev/**`, `CHANGELOG.md`).
- constitution_refs: [P2, P6]
- approval: NOT a `/pharn-dev-plan` output. It exists so these writes come from a declared `## Files` list (fix #7).
  `applied_lessons: none`: no lesson governs recording a GATE 2 outcome.

## Files

- `.dev/features/lessons-408-409/PLAN.md`
- `.dev/features/reconcile-state-root/SHIP.md`
- `.dev/features/ac-tests-style-gate/SHIP.md`
- `CHANGELOG.md`
