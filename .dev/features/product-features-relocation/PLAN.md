# PLAN — product-features-relocation (`features/` → `pharn/features/`)

- spec_content_hash: 83890d9741dd2f63bfe5112a3fcd6d8c49fd3795233eee719e271eba16fd9487 # fix #4 (post-A4 ARCHITECTURE.md)
- applied_lessons: none
- increment: Relocate the product pipeline artifact root from root `features/` to `pharn/features/` across floor, commands, capabilities, tests, and shipped docs; major SKILLS_VERSION 5.0.0 with MIN_CLI 0.5.0. Prerequisite A1–A4 (hook safe-set + ARCHITECTURE §6) already landed.
- layer(s): cross-cutting — `pharn/floor/`, `.claude/commands/pharn-*.md`, `pharn/pharn-review/`, `pharn/pharn-pipeline/`, `pharn/pharn-contracts/`, root docs
- constitution_refs: [P0, P3, P5, P6, P7]

## Files

- `.claude/hooks/enforce-writes-scope.test.cjs` — product safe-set vectors → `pharn/features/**`
- `.claude/hooks/set-writes-scope.test.cjs` — path examples → `pharn/features/`
- `.claude/commands/pharn-*.md` (10 product commands) — all `features/` paths → `pharn/features/`
- `pharn/floor/check-bash-reconcile.mjs` — `PIPELINE_RE` + comments for `pharn/features/`
- `pharn/floor/check-regress.mjs` — product root in `isPipelineArtifact` + comments
- `pharn/floor/render-ship-briefing.mjs` — default `base` → `pharn/features`
- `pharn/floor/reconcile-ignore.json` — pipeline_artifacts shape prose
- `pharn/floor/check-loop-record.mjs`, `check-ship-briefing.mjs`, `render-cost-record.mjs`, `merge-findings.mjs` — header comments
- `pharn/floor/*.test.mjs` — fixture paths (preserve `.dev/features/`)
- `pharn/pharn-contracts/*.md` (7 contracts) — product artifact paths
- `pharn/pharn-review/**/*.md`, `pharn/pharn-pipeline/grillers/**/*.md` (35 capabilities) — writes + prose
- `.prettierignore` — `features/*/` → `pharn/features/*/`
- `features/README.md` → `pharn/features/README.md` (git mv + prose rewrite)
- `README.md`, `CLAUDE.md`, `CONTRIBUTING.md` — product root path prose
- `SKILLS_VERSION` — 4.0.0 → 5.0.0
- `MIN_CLI` — new file, `0.5.0`
- `CHANGELOG.md` — [5.0.0] breaking relocation entry
- `docs/capabilities/**`, README CURRENT-STATE — regenerate via `npm run docs:generate`

Explicitly **not** touched: `.dev/features/**` historical records, closed increment artifacts, `pharn-dev-*` command paths under `.dev/features/`.

## Guarantee audit (P0)

- "Product artifacts live under `pharn/features/`" → **advisory** (command orchestration); the **floor hook** safe-set (`INSTALL_SAFE_SET`) is the guarantee that the default posture permits the new root (A1, human-landed).
- "Old root `features/` is denied by default" → **floor: hook** (enforce-writes-scope.cjs).
- Path consistency across floor checkers → **floor: enum-regex** (`npm test`, `validate.mjs`).
