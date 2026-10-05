# BUILD — regress-head-install-drift

- plan: `.dev/features/regress-head-install-drift/PLAN.md` (GATE 1 approved with one change by the orchestrator under
  the user's delegation; grill amendments G1, G2, G3, G5, G6 taken)
- spec hash: `d831d30d…f4f4` re-verified before the build (`.dev/floor/hash-doc.mjs`)
- scope: 36 paths from the plan's `## Files` (`set-writes-scope.cjs --from-plan`); reconcile epoch anchored after it
- floor: `node pharn/floor/validate.mjs .` → GREEN (36 capabilities)

## What landed

- `pharn/floor/install-drift-core.mjs` (pure) — the closed states `clean | drifted | not-installed | not-checked`, nine
  closed `why`s, the per-path comparison (`changed` / `missing` / `extraneous`, plus GATE 1's `missing_unchecked` for an
  absent `dev` / `peer` / `optional` / `devOptional` entry), the capped sorted mismatch list, the refusal detail, the
  report block, its closed-shape validator and the one rendered line. Remedy = `resolveInstall`'s command (INSTALL_RULE).
- `pharn/floor/install-drift.mjs` — reads the tree (`lstat` for presence, `stat`-then-kind before every read; a FIFO is
  never opened), stores and re-reads the block. No CLI; `readInstallCheck(root)` and `refuses` exported.
- `stage-regress-core.mjs` — `LOCKFILE_FAMILIES` (one owner of the lockfile names; `lockfilesAtBase` now derives from
  it) and `REGRESS_PATHS.headInstall`.
- `stage-regress.mjs` — `phaseHeadInstall` first thing in head-init; `head_install` appended last to the report;
  `REGRESSION.md` line. `stage-verify.mjs` / `stage-verify-core.mjs` — the same check first thing in init;
  `VERIFY_PATHS.headInstall`; `composeReport` merges `head_install` (`MERGED_KEYS`).
- `stage-exit-core.mjs` — `head-install-drift` in `regress.refused` and `verify.refused`.
- Renderers, contracts (`stage-exit.md`, `regression-report.md`, `verify-report.md`), the two thin callers' remedy
  lines (both inside their byte ceilings: 20448 / 20480 and 18244 / 18432), CLAUDE.md, CHANGELOG 6.41.0,
  SKILLS_VERSION, README badge.

## Measured during the build (2026-10-05, read-only on other trees)

- `readInstallCheck` on this worktree: `clean`, 5 ms. On `~/Projects/pharn-starter` (868 KB lock, 717 KB record):
  `clean`, `missing_unchecked` 271, 15 ms warm. On the main pharn-oss checkout: `drifted`, 12 changed (the #302 bump
  never installed); its one absent package is dev, now `missing_unchecked` (GATE 1).
- L27 reachability, scratch npm project with two local tarballs (offline): `drifted` (changed) → `npm ci` → `clean`;
  `not-installed` → `npm ci` → `clean`; `drifted` (extraneous, from `npm install --no-save`) → `npm ci` → `clean`.

## Decisions

- The stored block lives in each stage's own scratch (`.pharn/pharn-regress/head-install.json`,
  `.pharn/pharn-verify/head-install.json`), so neither progress-record schema changed (the `scope.json` precedent).
- `composeReport` requires `headInstall` (an object or `null`) rather than defaulting it, so an omitted argument is a
  refusal, never a silently absent key (L41).
- `stage-verify-core.mjs` keeps its one pinned import: it shape-checks a plain object; the caller validates the block.
- Step 2b ran through a node runner under `.pharn/build-scratch/` (xargs is refused in this worktree session), scoped
  to the 29 existing scoped paths: prettier, markdownlint, eslint — all exit 0.
