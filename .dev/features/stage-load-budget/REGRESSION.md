# REGRESSION — stage-load-budget

## Fix pass (GATE 2) — the current `regression-report.json`

- base: `e401ac08e69ee2dfffe3b7580959558ea99dcdd4` (HEAD — the first pass committed and `origin/main` 6.58.1 merged;
  the fix pass is uncommitted, so `git status` is non-empty)
- inside (10): `.dev/floor/stage-load-budget.test.mjs`, `.dev/floor/instruction-growth-wiring.test.mjs` (new),
  `.dev/guides/floor-gates.md`, `CHANGELOG.md`, `CONTRIBUTING.md`, and this feature's `PLAN.md`, `REVIEW.md`,
  `SHIP.md`, `VERIFY.md`, `verify-report.json` (`escape_exempt`)
- escaped: none (`check-regress.mjs scope` exit 0)
- outside gates, base → head: `tests` (155 files) 0 → 0 · `validate` 0 → 0 ·
  `structural:…/expected-injection-comment.json` 0 → 0
- style gates skipped: no shared style config is inside
- regressions: none · pre-existing: none
- **verdict (FLOOR, `check-regress.mjs verdict`, exit 0): `no-regressions`** — `regression-report.json` now holds
  this run's helper stdout, byte-identical (`cmp`); the same node runner as below, its baseline worktree removed in a
  `finally`.

## First pass

- base: `8fe73d19d9108e089b35a4405b2ce552c2922ffc` (HEAD — a working-tree dogfood build, `git status` non-empty)
- inside (9): `.dev/floor/stage-load-budget.test.mjs`, `.dev/guides/floor-gates.md`, `.dev/guides/product-commands.md`,
  `.github/workflows/ci.yml`, `CHANGELOG.md`, `CONTRIBUTING.md`, `package.json`, and this feature's `PLAN.md` /
  `GRILL.md` (`escape_exempt`)
- escaped: none (`check-regress.mjs scope` exit 0)
- outside gates, base → head: `tests` (155 files) 0 → 0 · `validate` 0 → 0 ·
  `structural:…/expected-injection-comment.json` 0 → 0
- style gates skipped: no shared style config is inside
- regressions: none · pre-existing: none
- **verdict (FLOOR, `check-regress.mjs verdict`, exit 0): `no-regressions`**

REGRESSIONS: none — no deterministically-detectable breakage outside the feature. This catches what the outside suite
catches and nothing more: a regression no test, eval or floor check covers is invisible here.

Orchestration note (advisory): this isolated worktree's shell refuses the pinned `$(…)` / `xargs` / `mktemp` forms, so
Steps 1–3 ran through a node runner (`.pharn/pharn-dev-regress/run.mjs`, gitignored) that spawns the same commands with
argv arrays: the pinned `plan-files-core.mjs` declared-paths line, `check-regress.mjs scope` with `--feature`, the same
gate set in a detached baseline worktree (with `node_modules` linked read-only) and at HEAD, then
`check-regress.mjs verdict`. The first attempt crashed in the runner itself (it read `outside_eval_pairs` as strings;
they are `{expected, actual}` objects) before any verdict; the baseline worktree it left was removed and the whole step
re-run. `regression-report.json` is the helper's stdout, byte-identical (`cmp`).
