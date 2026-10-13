# REGRESSION — loop-scope-hardening

**Base:** `f37eabe441cf4c3b0a2d8322af3c1bf0ca446a8b` (origin/main at 6.59.0, passed explicitly as `--base`: the tree
held this feature's untracked stage artifacts, so the auto-detect would have picked HEAD). **HEAD:** `80918bc`
(fix-loop pass 1).

**Orchestration deviation (advisory, recorded):** the pinned Step 1–2 lines use `$VAR`, `xargs` and `paste`, which
this isolated worktree refuses; a node runner (`.pharn/pharn-dev-regress/run.mjs`, argv arrays, the same gates and
inputs, the declared list through the pinned `plan-files-core.mjs` call) ran them. **`--changed` excludes one path
by hand:** `.claude/hooks/set-writes-scope.cjs`, the maintainer-applied human patch committed before the first
build's anchor (`a809c32`, L68) — not a build write.

## Pass 1 (superseded) — the RED that started the fix loop

Base `f37eabe`, HEAD `d06d12e`: `tests` 0 → 1, `validate` 0 → 0, `structural:` 0 → 0 — verdict `regressions`.
Two outside tests had failed at HEAD: `.dev/floor/installed-skills-consumers.test.mjs:120` (real: it read
`pharn-loop.md`'s grant list, which names `catalogue-installed-skills.mjs`) and `pharn/floor/stage-regress.test.mjs:2207`
(a 16 s timing case that passed alone, 2/2, with the machine's load average near 166). Decision (delegated: decided
by the orchestrating model under the maintainer's 2026-10-13 delegation): fix through a fresh build pass, the test
added to `## Files` before that pass's anchor.

## Pass 2 (this report)

- `scope` exit 0 — no path outside the declared writes. `escape_exempt`: this feature's `GRILL.md`, `PLAN.md`,
  `REGRESSION.md`, `SHIP.md`, `regression-report.json`.
- Inside: the 21 paths in `regression-report.json` `inside`.
- Outside gates: `tests` (150 test files), `validate`, `structural:` the trust-fence eval pair. Style gates skipped
  (no shared style config inside).

| gate                                | base | head |
| ----------------------------------- | ---- | ---- |
| `tests` (150 outside test files)    | 0    | 0    |
| `validate`                          | 0    | 0    |
| `structural:` trust-fence eval pair | 0    | 0    |

`stage-regress.test.mjs:2207` is among the 150 and passed at both base and HEAD this time; load average at the end of
the run was 21 / 76 / 95 (1, 5, 15 min). The installed-skills consumer test is inside now (fixed in this pass).

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.** `/pharn-dev-regress` catches
exactly what its suite catches, nothing more; this verdict certifies the comparison only.
