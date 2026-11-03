# PLAN — audit-integration-2026-11-03

- spec_content_hash: d5a974303fd0b9568945c60423ae5a89c57d7b65f5baa03657e317fbe64f33a5
- applied_lessons: [L35, L38, L68]
- increment: integrate the 2026-11-03 fix batch into `batch/audit-2026-11-03` (worker INT): Phase A merges each
  ready `fix/*` branch with `git merge --no-ff`, resolving conflicts with Edit; Phase B prepares the owner-run docs
  script; Phase C applies the release commit (7.3.0).
- layer(s): build apparatus (`.dev/features/audit-integration-2026-11-03/**`) plus whatever conflict resolutions the
  merged branches need in the files listed below (product surface and root docs, all already changed by a worker).
- constitution_refs: [P0, P6, P7]
- mode: LIGHT (batch worker INT): no `/pharn-dev-ship` chain; the gate after each merge round is `npm run check`,
  recorded in `NOTES.md`.

## Why (P7)

The batch's workers each fixed findings of the 2026-11-03 principal review on their own branch; one integration
branch becomes one release. This increment adds no behaviour of its own: it only resolves the textual conflicts the
merges produce and records every resolution.

## Lessons

- L35: where two workers stored one fact twice (CHANGELOG `[Unreleased]` group headings, a ceiling table entry), the
  resolution keeps exactly one copy — one heading per type, no duplicated entry.
- L38: several agents share this host; this worktree's setter calls and `--clear` run only with this worktree as cwd,
  never another worktree's.
- L68: the trusted-doc and canon edits of Phase B are owner-run outside any anchored window; Phase C commits them as
  their own commit before the release commit.

## Files

- `.dev/features/audit-integration-2026-11-03/PLAN.md` — this plan
- `.dev/features/audit-integration-2026-11-03/NOTES.md` — every merge, conflict resolution and gate result
- `CHANGELOG.md` — `[Unreleased]` merge resolutions
- `README.md` — conflict resolution
- `SECURITY.md` — conflict resolution
- `CLAUDE.md` — conflict resolution
- `CONTRIBUTING.md` — conflict resolution
- `docs/limitations.md` — conflict resolution
- `docs/guarantees.md` — conflict resolution
- `.dev/guides/floor-checks.md` — conflict resolution
- `.dev/guides/writes-scope.md` — conflict resolution
- `.claude/hooks/enforce-writes-scope.test.cjs` — conflict resolution
- `.claude/hooks/hook-wiring.test.cjs` — conflict resolution
- `.claude/hooks/set-writes-scope.test.cjs` — conflict resolution
- `.claude/hooks/protect-trusted-paths.test.cjs` — conflict resolution
- `.dev/floor/command-hygiene.test.mjs` — NPX_PENDING / ceiling upkeep after each owner's merge
- `pharn/floor/check-run-isolation-core.mjs` — S + G2 merge
- `pharn/floor/check-run-isolation.mjs` — S + G2 merge
- `pharn/floor/validate.mjs` — conflict resolution
- `pharn/floor/cli-stdout-flush.test.mjs` — conflict resolution

## Not in scope

- Any fix of a finding (each belongs to its group's branch); a red gate caused by a merged branch is reported to the
  orchestrator, not fixed here.
- The four trusted docs, canon, `.claude/settings.json` and the four hook scripts (Phase B's owner-run script).

## Open questions

none
