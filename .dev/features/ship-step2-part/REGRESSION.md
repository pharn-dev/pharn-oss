# REGRESSION — ship-step2-part

- base: `dcf7b43d` (main 6.67.0). The tree is an uncommitted working-tree build, so base = HEAD (Step 1.1).
- inside: the 20 paths `regression-report.json` lists (`git diff --name-only dcf7b43d` plus untracked files).
- declared: the 25 `## Files` paths of `PLAN.md`, read with `pharn/floor/plan-files-core.mjs`.
- `check-regress.mjs scope`: exit 0. escaped: none. escape_exempt: `PLAN.md`, `GRILL.md` (this feature's own stage
  artifacts). outside: 162 test files and 1 eval pair.

## Gates (base → head, exit codes)

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---: | ---: |
| `tests` (162 outside test files, `node --test`)                                            |    0 |    0 |
| `validate` (`pharn/floor/validate.mjs .`, whole repo)                                      |    0 |    0 |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` |    0 |    0 |

Style gates skipped at both sides: `inside` touches no shared style config.

regressions: none · pre_existing: none

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.** This catches what the outside
suite catches, nothing more.

## Orchestration notes (advisory)

- The pinned `git worktree add` / `xargs` / `$?` forms ran as an argv-array node runner
  (`.pharn/ship-step2-part/regress.mjs`), because this worktree-isolated session refuses them. The base ran in a
  detached worktree at `dcf7b43d` in the session scratchpad, removed afterwards.
- The FIRST head run recorded `tests: 1`. It ran at the same time as the base run on a machine also running other
  sessions' suites. One test failed: `entry-base-evidence.test.mjs` "★ equivalent environment" (`TypeError: Cannot read
properties of null (reading 'source')`, after 80 s). That file passed alone at HEAD (14/14), passed in this build's
  `npm run check` (5,696 pass, 0 fail), and the head gate set re-run alone recorded `tests: 0`. The map above is that
  re-run. The first run's map and log are kept at `.pharn/pharn-dev-regress/head-results.run1.json` and
  `head-tests.run1.log`. The flake is in a file this increment does not touch; it is recorded here, not counted.
