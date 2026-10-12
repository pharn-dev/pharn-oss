# REGRESSION — loop-no-prompts

- base: `846723803dc653eee3e772585f6c3dfe69212c44` (HEAD — a working-tree dogfood build, `git status` non-empty)
- inside (7): `.claude/commands/pharn-loop.md`, `.dev/floor/command-hygiene.test.mjs`, `CHANGELOG.md`, `README.md`,
  `SKILLS_VERSION`, and this feature's `PLAN.md` / `GRILL.md` (`escape_exempt`)
- escaped: none (`check-regress.mjs scope` exit 0)
- outside gates, base → head: `tests` (154 files) 0 → 0 · `validate` 0 → 0 ·
  `structural:…/expected-injection-comment.json` 0 → 0
- style gates skipped: no shared style config is inside
- **verdict (FLOOR, `check-regress.mjs verdict`): `no-regressions`**

`regression-report.json` holds the helper's JSON verbatim (copied from `.pharn/pharn-dev-regress/verdict.json` with
a Bash `cp`, under this stage's own scope for that file).
