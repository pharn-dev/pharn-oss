# REGRESSION — unmeasured-gates-inconclusive

## Iteration 1 — the uncommitted build over `8fe73d1`

- Base: `8fe73d19d9108e089b35a4405b2ce552c2922ffc`. The working tree was dirty (the build is uncommitted), so the base
  is `HEAD` (Step 1.1's dirty-tree rule) — `HEAD` is `origin/main` at #343 (6.58.0).
- Inside: 30 paths (`git diff --name-only 8fe73d1` plus untracked). `check-regress.mjs scope --feature
unmeasured-gates-inconclusive` exited 0 with no escape; `escape_exempt`: this feature's `GRILL.md`. Every other
  inside path is in the PLAN's `## Files` (read by `pharn/floor/plan-files-core.mjs`, L69).
- Outside gates: 147 test files (every `*.test.mjs` / `*.test.cjs` not inside), `validate`, and the one committed eval
  pair (`pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` ↔
  `.dev/features/trust-fence/findings.json`, both confirmed readable). Style gates skipped: no shared style config is
  inside.

| Gate                                                                                       | base → head |
| ------------------------------------------------------------------------------------------ | ----------- |
| `tests` (147 outside test files; 4875 tests each side, 1 skipped, 0 failed)                | 0 → 0       |
| `validate`                                                                                 | 0 → 0       |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0 → 0       |

`regressions[]`: none · `pre_existing[]`: none.

**REGRESSIONS: none.** No deterministically detectable breakage outside the feature. This stage catches exactly what
its suite catches, and nothing more.

- Each side's suite took ~586 s (base 586.0 s, head 585.5 s — two separate runs, logged at 02:06 and 02:16) under a
  load average between 10 and 31 from parallel sessions.
- `regression-report.json` is the verdict stdout byte-for-byte (sha256 `393d79f4…b4bb` on both).

## Orchestration deviations (ADVISORY)

- The pinned Step 1–3 shell forms (`xargs`, `$VAR` capture, `printf` assembly, `git worktree add`) are refused in an
  isolated worktree, so the steps ran from one node runner under `.pharn/pharn-dev-regress/` (argv arrays, exit codes
  only; git-ignored, removed before lint).
- The BASE checkout was a `git clone --shared --no-checkout` of this worktree into a temp dir, with
  `refs/remotes/origin/*` fetched in and the base commit checked out detached — not `git worktree add`, so the shared
  git dir's worktree list was never touched. `node_modules` was symlinked from the working tree (`package-lock.json` is
  unchanged between base and head), so no `npm ci` ran.
- `origin/main` moved to `791d205` (6.58.1, #344) while this ran. This iteration compares against `8fe73d1`; the
  branch merges `origin/main` before `/pharn-dev-verify`, which re-runs the whole suite on the merged tree.
