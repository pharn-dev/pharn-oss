# REGRESSION — loop-entry-preflight

- base: `eb7d7d2b5348ecb5197ea117d9c5baa246a726cd` — the last commit before the build (`--base`, passed explicitly).
  The branch is stacked on `feat/regress-pre-run-snapshot`, so `git merge-base HEAD origin/main` would have counted
  that branch's changes as this build's.
- head: `25ab81c` (the build commit; the working tree was clean apart from git-ignored `.pharn/` scratch).
- driver: `.pharn/pharn-dev-regress/run.mjs`, a node runner for Steps 1–3. The isolated worktree refuses the pinned
  `xargs`/`$VAR` shell forms, so the outside test list goes to `node --test` as an argv array and is never
  word-split (L5/L16). `regression-report.json` is `pharn/floor/check-regress.mjs verdict`'s JSON, unchanged.
- a first attempt was stopped by the harness's 600 s background limit while it was creating the base worktree. That
  worktree was removed (`git worktree remove --force`, then `prune`) and the run was repeated in full. The verdict
  below is the repeat's.

## Partition (`check-regress.mjs scope --feature loop-entry-preflight`, exit 0)

- inside: 18 paths. Every one is declared in the PLAN's `## Files`, so `escaped` and `escape_exempt` are both empty.
- outside tests: 129 `*.test.mjs` / `*.test.cjs` files, run in one `node --test` call on each side.
- outside eval pairs: 1 —
  `pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` ↔
  `.dev/features/trust-fence/findings.json`. Both paths were confirmed to resolve before the run.
- style gates: skipped on both sides. None of the shared style configs (`eslint.config.mjs`, `.prettierrc.json`,
  `.prettierignore`, `.markdownlint-cli2.jsonc`) is inside.

## Gates (exit codes)

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `tests` (the 129 outside test files)                                                       | 0    | 0    |
| `validate`                                                                                 | 0    | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |

- regressions: none
- pre_existing: none

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.**

_/pharn-dev-regress catches what its suite catches, nothing more, but it does so deterministically. This does not
claim that nothing broke. The feature's own tests (the 4 inside test files) run at `/pharn-dev-verify`._
