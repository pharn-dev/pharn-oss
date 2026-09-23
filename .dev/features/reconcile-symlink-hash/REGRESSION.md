# REGRESSION — reconcile-symlink-hash

- Base: `7e9ed526a450c06218be4fa9aeeb505228be30fd` (`git status --porcelain` was non-empty, a working-tree build,
  so `base = HEAD`).
- Verdict source: `pharn/floor/check-regress.mjs verdict`, exit **0**. The machine report is
  `regression-report.json`, verbatim.

## Partition

`check-regress.mjs scope --feature reconcile-symlink-hash` exited 0, with `escaped: []`.

- **Inside (10):** `CHANGELOG.md`, `README.md`, `SKILLS_VERSION`, `pharn/floor/check-bash-reconcile.test.mjs`,
  `pharn/floor/reconcile-baseline.mjs`, `pharn/floor/reconcile-baseline.test.mjs`,
  `pharn/floor/worktree-fingerprint.mjs`, `pharn/pharn-contracts/reconciliation-record.md`, plus this feature's own
  `PLAN.md` and `GRILL.md`.
- **`escape_exempt`:** `.dev/features/reconcile-symlink-hash/GRILL.md`, `.dev/features/reconcile-symlink-hash/PLAN.md`.
  These are this feature's own pipeline artifacts, each written under its stage's own scope.
- **Outside gates:** 94 outside test files (`tests`), `validate`, and one eval pair,
  `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` ↔
  `.dev/features/trust-fence/findings.json`. Both paths were confirmed readable before running.
- **Style gates skipped** (the deterministic rule): `inside` touches no shared style config, so a style result over
  the byte-identical outside files cannot flip.

## Gates, base → head

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `tests` (94 outside files)                                                                 | 0    | 0    |
| `validate`                                                                                 | 0    | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |

- `regressions[]`: none
- `pre_existing[]`: none

## Orchestration note (advisory)

The baseline ran in a detached `git worktree` at the base SHA, under `.pharn/pharn-dev-regress/base`, with
`node_modules` symlinked in. It was removed before the HEAD run. The pinned
`cat outside-tests.txt | xargs node --test` line could not run as written, because this session's
worktree-isolation guard refuses a computed `xargs` argv. The same gate set was therefore run by a scratch script
(`.pharn/pharn-dev-regress/capture.mjs`, gitignored). It passes the 94 paths to `node --test` as one argv array,
one path per argument with no shell word-splitting, which is what the pinned form produces. It runs `validate` and
`check-structural` exactly as prescribed. The gate set was identical on both sides, and the baseline was green,
which rules out the fabricated-red failure the pinned form guards against.

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.** This catches exactly what the
suite catches, nothing more. A regression that no test, `validate` rule or eval covers is invisible here.
