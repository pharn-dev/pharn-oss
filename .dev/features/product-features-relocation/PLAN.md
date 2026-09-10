# PLAN — product-features-relocation (`features/` → `pharn/features/`)

- spec_content_hash: 83890d9741dd2f63bfe5112a3fcd6d8c49fd3795233eee719e271eba16fd9487 # fix #4 (post-A4 ARCHITECTURE.md)
- applied_lessons: none
- increment: Relocate the product pipeline artifact root from root `features/` to `pharn/features/` across floor, commands, capabilities, tests, and shipped docs; major SKILLS_VERSION 5.0.0 with MIN_CLI 0.5.0. Prerequisite A1–A4 (hook safe-set + ARCHITECTURE §6) already landed.
- layer(s): cross-cutting — `pharn/floor/`, `.claude/commands/pharn-*.md`, `pharn/pharn-review/`, `pharn/pharn-pipeline/`, `pharn/pharn-contracts/`, root docs
- constitution_refs: [P0, P3, P5, P6, P7]

## Files

> `set-writes-scope.cjs --from-plan` reads **one literal path per bullet** — the FIRST back-ticked token
> — and drops `*`-glob entries unless `--target` narrows them. A bullet naming several paths therefore
> scoped only its first, and a glob bullet scoped nothing: measured, this list resolved **13** paths while
> naming far more. The multi-path bullets below were split so every path this increment writes is
> declarable, which is the sanctioned remedy (declare it and re-run the setter), not a widening of the
> approved intent — every added path was already named in this list's prose. The one genuine addition is
> `.dev/floor/command-hygiene.test.mjs` (two comment attributions the relocation made stale).

- `.claude/hooks/enforce-writes-scope.test.cjs` — product safe-set vectors → `pharn/features/**`
- `.claude/hooks/set-writes-scope.test.cjs` — path examples → `pharn/features/`
- `.claude/commands/pharn-*.md` (10 product commands) — all `features/` paths → `pharn/features/`
- `pharn/floor/check-bash-reconcile.mjs` — `PIPELINE_RE` + comments for `pharn/features/`
- `pharn/floor/check-regress.mjs` — product root in `isPipelineArtifact` + comments
- `pharn/floor/render-ship-briefing.mjs` — default `base` → `pharn/features`
- `pharn/floor/reconcile-ignore.json` — pipeline_artifacts shape prose
- `pharn/floor/check-loop-record.mjs` — header comment
- `pharn/floor/check-ship-briefing.mjs` — header comment
- `pharn/floor/render-cost-record.mjs` — header comment
- `pharn/floor/merge-findings.mjs` — header comment
- `pharn/floor/render-ship-briefing.test.mjs` — fixture paths + the CLI-default regression case
- `pharn/floor/*.test.mjs` — remaining fixture paths (preserve `.dev/features/`)
- `pharn/pharn-contracts/*.md` (7 contracts) — product artifact paths
- `pharn/pharn-review/**/*.md`, `pharn/pharn-pipeline/grillers/**/*.md` (35 capabilities) — writes + prose
- `.dev/floor/command-hygiene.test.mjs` — stale `pharn-review.md` attributions in two comments
- `.prettierignore` — `features/*/` → `pharn/features/*/`
- `pharn/features/README.md` — moved from `features/README.md` (git mv + prose rewrite)
- `README.md` — product root path prose
- `CLAUDE.md` — product root path prose + the `MIN_CLI` discipline paragraph
- `CONTRIBUTING.md` — product root path prose
- `SKILLS_VERSION` — 4.0.0 → 5.0.0
- `MIN_CLI` — new file, `0.5.0`
- `CHANGELOG.md` — [5.0.0] breaking relocation entry
- `docs/capabilities/**`, README CURRENT-STATE — regenerate via `npm run docs:generate`

Explicitly **not** touched: `.dev/features/**` historical records, closed increment artifacts, `pharn-dev-*` command paths under `.dev/features/`.

## Guarantee audit (P0)

- "Product artifacts live under `pharn/features/`" → **advisory** (command orchestration); the **floor hook** safe-set (`INSTALL_SAFE_SET`) is the guarantee that the default posture permits the new root (A1, human-landed).
- "Old root `features/` is denied by default" → **floor: hook** (enforce-writes-scope.cjs).
- Path consistency across floor checkers → **floor: enum-regex** (`npm test`, `validate.mjs`).
