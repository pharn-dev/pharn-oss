# PLAN — main-format-fix

- feature: main-format-fix
- applied_lessons: none

Makes `main` green again on `npm run format:check`. The two code-scanning autofix commits (pull requests 487 and 488)
left one array in `pharn/floor/stage-direct.test.mjs` (the `spawn` arguments near line 2493) split over several lines
where Prettier wants it on one. The fix collapses that array to Prettier's output. Nothing else in the file changes.

No `SKILLS_VERSION` bump: a `*.test.*` file never ships, and `CHANGELOG.md` is repo-meta.

## Files

- `pharn/floor/stage-direct.test.mjs` — **EDIT.** The one array, re-formatted to Prettier's output.
- `CHANGELOG.md` — **EDIT.** This PR's `[Unreleased]` entry.
