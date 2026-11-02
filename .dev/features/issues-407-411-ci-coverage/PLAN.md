# PLAN — issues-407-411-ci-coverage

- spec_content_hash: d5a974303fd0b9568945c60423ae5a89c57d7b65f5baa03657e317fbe64f33a5
- applied_lessons: none
- increment: Auto-fix for PR #412's `check` job. pharn-ci's diff-coverage gate (threshold 100) read
  `pharn/floor/check-ac-style.mjs` at 32.79% (60/183). Its tests copy `pharn/floor/` into each scratch project and
  run the COPY, so the coverage lcov credits a temp path, never the committed file. The CLI reads only its invoking
  directory (`resolve(".")`, `process.cwd()`), so `run()` now spawns the committed file with the scratch project as
  its cwd. The WIRING test still runs the committed command lines against the copy, as before. No behaviour change.
- layer(s): one product-floor test file (never ships, no bump).
- constitution_refs: [P1]
- approval: Auto-fix, enabled by the maintainer for PR #412 (standing authorization to fix a reported CI failure).
  `applied_lessons: none` because no canon lesson names this case (a test that runs a copy loses coverage).

## Files

- `.dev/features/issues-407-411-ci-coverage/PLAN.md`
- `pharn/floor/check-ac-style.test.mjs`
