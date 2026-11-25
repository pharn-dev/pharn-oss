# SHIP — core-381-skill-symlinks

`/pharn-dev-ship` for CORE-381: replace the committed `.claude/skills/*` symlinks with pinned copies and release 7.25.6.

Stages, in order: `/pharn-dev-plan` → GATE 1 → `/pharn-dev-grill` → `/pharn-dev-build` → `/pharn-dev-regress` →
`/pharn-dev-verify` → `/pharn-dev-review` → GATE 2. GATE 1 was approved by the lead, delegated by the user (recorded in
`PLAN.md`). GATE 2 was delegated with the decision fixed in advance: open the PR and drive CI green, do not merge.

verdict-grill: exit 0
verdict-build: exit 0
verdict-regress: no-regressions
verdict-verify: PASS
run-ended: GATE 2

changelog-entry: exit 0

lesson: none — the recurring failure here ("an apparatus-only change can still break the download") is already
ticketed as its own lesson (CORE-385), with its floor remedy as CORE-383, so this run carries no second candidate.

deferred: none

- Review: `REVIEW.md` (advisory; 0 floor-gate findings). Grill: `GRILL.md` (advisory; 3 concerns).
- Regress and verify reports: `regression-report.json`, `verify-report.json` (with `REGRESSION.md`, `VERIFY.md`).
- After the stages, the branch was rebased onto `origin/main` `a2cacaef` (#498, CORE-382: `docs/install-manifest.md`
  plus one `[Unreleased]` CHANGELOG entry). That entry was moved into `[7.25.6]` as the bump rule requires.
  `check:changelog` and `check:changelog-entry` were re-run against the new merge-base: both GREEN (the line above
  records the re-run). The gate verdicts above were measured before the rebase. The rebase brought in no file this
  increment touches other than `CHANGELOG.md`.

chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate.
