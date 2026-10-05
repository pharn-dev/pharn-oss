# REGRESSION — orchestrator-direct-stage-calls

- **Base:** `d40667d1e998ecfc3039a658648065cba0243e9c` — `git merge-base HEAD origin/main` (the tree was clean; the
  build was committed as `0b983b3`).
- **Partition** (`check-regress.mjs scope`, exit 0, no escape): 25 changed paths inside, against 24 declared `## Files`
  paths; `PLAN.md` and `GRILL.md` are this feature's own artifacts (`escape_exempt`). 124 test files and one committed
  eval pair are outside.
- **Style gates skipped:** no shared style config is inside the change (`eslint.config.mjs`, `.prettierrc*`,
  `.prettierignore`, `.markdownlint-cli2.jsonc` untouched), so a style flip over the outside files is impossible.
- **How it ran:** one node runner under `.pharn/pharn-dev-regress/` (this isolated worktree session refuses the
  command's `xargs` form), every test path passed as an argv element to `node --test`. The base side ran in a
  detached worktree of the base commit with this checkout's `node_modules` linked in, then the worktree was removed.

## Outside gates

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---: | ---: |
| `tests` (124 outside test files)                                                           |    0 |    0 |
| `validate`                                                                                 |    0 |    0 |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` |    0 |    0 |

- `regressions[]`: none.
- `pre_existing[]`: none.

## Verdict

REGRESSIONS: none — no deterministically-detectable breakage outside the feature (`check-regress.mjs verdict`, exit 0,
`no-regressions`).

This catches exactly what the outside suite catches, nothing more: a regression no test, validate rule or committed
eval covers is invisible here.
