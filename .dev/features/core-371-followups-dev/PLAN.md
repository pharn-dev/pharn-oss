# PLAN — core-371-followups-dev

- feature: core-371-followups-dev
- applied_lessons: none

The apparatus half of the follow-ups the CORE-371 docs audit found. Two stale test-header comments and one missing
lint ignore; the product half (`pharn-grill.md`, `pharn-review.md`, `check-regress.mjs`, `.claude/settings.json`) ships
separately as 7.25.4.

- `.dev/floor/stage-agent-type.test.mjs` and `.dev/floor/review-lens-agent.test.mjs` say pharn-cli "does not copy
  `.claude/agents/` yet; follow-up `cli-install-agents`". pharn-cli 0.20.0 (2026-11-17) installs
  `.claude/agents/pharn-*.md` (its CHANGELOG `[0.20.0]`; this repo's `pharn-install.json` lists both agents under
  surface `agents`), which is what `.dev/guides/product-commands.md` already says. The comments are reworded to match.
- `eslint.config.mjs` has no `.agents/**` ignore. `.gitignore` excludes `/.agents/` (the Codex skill import) and
  `.markdownlint-cli2.jsonc` already skips it, but ESLint flat config does not skip dot-directories, so a bare
  `npm run lint` in a checkout that holds the import lints its third-party scripts and goes red. CI is unaffected (the
  folder is untracked).

No `SKILLS_VERSION` bump: `*.test.*` files, `eslint.config.mjs` and `CHANGELOG.md` never ship.

## Files

- `.dev/floor/stage-agent-type.test.mjs` — **EDIT.** Header comment only.
- `.dev/floor/review-lens-agent.test.mjs` — **EDIT.** Header comment only.
- `eslint.config.mjs` — **EDIT.** One `ignores` entry, `.agents/**`, with its reason.
- `CHANGELOG.md` — **EDIT.** This PR's `[Unreleased]` entry.
