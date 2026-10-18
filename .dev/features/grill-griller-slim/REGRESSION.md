# REGRESSION — grill-griller-slim

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.**
`pharn/floor/check-regress.mjs verdict` exit `0`, `"verdict": "no-regressions"` (`regression-report.json`, verbatim).

## Base and partition

- **Base:** `44b12e81244c1ea2cb49ec03591d945e8078ce83` — `git merge-base HEAD origin/main` (the tree was clean at
  `3697075`, and `origin/main` was still `44b12e8` after a fresh fetch).
- **Inside** (`git diff --name-only <base>` plus untracked): 20 paths — the plan's 18 `## Files` paths, plus this
  feature's own `PLAN.md` and `GRILL.md`.
- **Declared** (`pathsFromPlanFiles` over `PLAN.md`, L69): 18 paths. `check-regress.mjs scope --feature grill-griller-slim`
  exited `0`: no escape. `escape_exempt` = `PLAN.md`, `GRILL.md` (each written by its own stage under its own scope).
- **Outside gates:** 156 test files (`git ls-files '*.test.mjs' '*.test.cjs'` minus the inside ones), `validate`, and the
  one committed eval pair (`structural:…/expected-injection-comment.json` ↔ `.dev/features/trust-fence/findings.json`,
  both confirmed readable before the gate ran).
- **Style gates skipped** by the deterministic config-touch rule: no inside path is `eslint.config.mjs`,
  `.prettierrc.json`, `.prettierignore` or `.markdownlint-cli2.jsonc`.

## Gates (exit codes)

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---: | ---: |
| `tests` (`node --test` over the 156 outside test files)                                    |    0 |    0 |
| `validate` (`node pharn/floor/validate.mjs .`)                                             |    0 |    0 |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` |    0 |    0 |

- `regressions[]`: none.
- `pre_existing[]`: none.

## How the gates were run (a recorded deviation)

This ran in an isolated agent worktree, where the harness refuses the command's pinned shell forms (`xargs`, `$VAR`
capture, `t=$?`, loops with computed arguments). The same steps ran through a scratch node runner,
`.pharn/pharn-dev-regress/run.mjs`. It resolves the base and the inside set with `git`, the declared set with
`plan-files-core.mjs`, and the partition with `check-regress.mjs scope`. It runs each gate with `spawnSync` and an argv
array (the 156 test paths as separate arguments, so no word-splitting can fabricate a red), in a detached
`git worktree` at the base and then in the working tree, and records each gate's real exit status. The verdict came
from `check-regress.mjs verdict` over the two maps. The runner's first attempt stopped with a setup error before any
gate ran (it read `outside_eval_pairs` as strings; they are `{expected, actual}` objects), and no result from it was
recorded. The second attempt is the one reported. One wall-clock note: the run outlived the tool's 600 s limit, kept
running in the background, and was not restarted.

Honest residual: `/pharn-dev-regress` catches exactly what its suite catches, nothing more. A broken behavior outside
the feature that no test, rule or eval covers is invisible here. This certifies the comparison, not the feature.
