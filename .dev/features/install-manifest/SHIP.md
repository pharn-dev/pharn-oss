# SHIP — install-manifest (Linear CORE-193, C8.1)

Stages run, in order: `/pharn-dev-plan` → GATE 1 (approved by the orchestrator, owner-delegated, with three answers and
three extra requirements recorded in `PLAN.md` "Resolved at GATE 1") → `/pharn-dev-grill` → `/pharn-dev-build` →
`/pharn-dev-regress` → `/pharn-dev-verify` → `/pharn-dev-review` → GATE 2.

verdict-grill: exit 0
verdict-build: exit 0
verdict-regress: no-regressions
verdict-verify: PASS
run-ended: GATE 2

changelog-entry: exit 0

lesson: none — no finding is a recurrence-prone mechanism failure; the one important review finding (pharn/floor/README.md outside PRODUCT_SURFACE) is a one-off rule omission the new closure test names.

deferred: none

- Grill (advisory): `GRILL.md` — 4 concerns, 3 folded into the build (the no-git walk's width, the CLI's `applies`
  shape, destination uniqueness), 1 accepted (the glob-matcher import).
- Review (advisory): `REVIEW.md` — GREEN, 0 floor-gate findings, 4 advisory.
- Regress: `REGRESSION.md` / `regression-report.json`. Verify: `VERIFY.md` / `verify-report.json`.
- Revision after GATE 2 (2026-11-17): pharn-ci warned `SETUP_STALE_SI02` on pre-existing `CLAUDE.md` lines because the
  PR edited `CLAUDE.md`. The added sentence moved to `.dev/guides/generated-docs.md` (`PLAN.md`, "Revision after GATE
  2"); the build scope was re-set and re-anchored first, regress (head side) and verify were re-run on the revised tree,
  and the verdict lines above are the re-run's.
- Rebased (2026-11-17) onto `origin/main` dde008dc. #457 and #454 (`.dev/` files and one `[Unreleased]` CHANGELOG entry
  each) landed first, then #453, which released 7.20.0 and placed those entries in its `[7.20.0]` section. This
  increment is therefore renumbered **7.21.0**: a new `## [7.21.0] - 2026-11-17` section holds only its own entry, and
  every merged section is unchanged. `check-model-config.mjs` keeps #453's comment edits beside this increment's
  exports and import guard. `npm run docs:generate` regenerated `pharn-install.json` (new `skillsVersion` and the
  installed bytes #453 changed). The verdict lines above are from the tree before the rebases; the full gate set was
  re-run on the rebased tree (`npm run check`, and CI's `check` job).
- GATE 2 decision (delegated by the brief): regress and verify are green, so ship — commit, push, open the pull
  request; nobody merges it in this run.

Chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate.
