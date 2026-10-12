# PLAN — main-green-changelog

- feature: main-green-changelog
- applied_lessons: none

Makes `main` green again and corrects one overstated sentence. Repo-side part of review finding SEC-2 (High,
2026-10-12 review). Run by the orchestrator on the light path under the maintainer's 2026-10-13 delegation ("no commands
at all" for small changes). That choice is a model decision, not a human approval.

- `CHANGELOG.md` carries `## [Unreleased]` twice (#342 opened a second one above the existing one), so `npm run lint:md`
  (MD024), `npm run check:changelog` (`UNRELEASED_NOT_FIRST`) and the two live-CHANGELOG tests in
  `.dev/floor/check-skills-version-recorded.test.mjs` fail on `main`, and CI's `check` and `floor` jobs are red. The fix
  keeps one `[Unreleased]` section: its guidance comment, then one `### Changed` group holding #342's entry unchanged.
  The per-PR checker permits a base `[Unreleased]` entry to stay under `[Unreleased]`. No released section is touched.
- `CLAUDE.md` hard constraint 1 says `main`'s branch protection means a `CODEOWNERS` change "cannot be merged without the
  human owner's approval". Live settings (read 2026-10-13 via `gh api`): ruleset 18045407 requires a Code-Owner review
  and the checks, but its only bypass actor is the owner's account with `bypass_mode: always`, and classic protection
  has `enforce_admins: false`. So any merge made with the owner's credentials, including an agent running
  `gh pr merge --admin` with the owner's token, skips both. The sentence is reworded to say that.

No `SKILLS_VERSION` bump: `CHANGELOG.md` and `CLAUDE.md` are repo-meta, not product surface.

Not changed here, human-only: the ruleset bypass actor, `enforce_admins`, a release tag, and the matching sentences in
`THREAT-MODEL.md` §4 and `pharn/floor/reconcile-ignore.json` (`always_reconciled.bound`).

## Files

- `.dev/features/main-green-changelog/PLAN.md` — **NEW.** This file.
- `CHANGELOG.md` — **EDIT.** One `[Unreleased]` section, plus this PR's own entry.
- `CLAUDE.md` — **EDIT.** Hard constraint 1, the branch-protection sentence.
