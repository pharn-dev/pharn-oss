# REGRESSION — ship-step2-part

- base: `499f1f26` (origin/main 6.68.0, after the merge of origin/main into this branch). The tree is committed and
  clean, so base = `git merge-base HEAD origin/main` (Step 1.1).
- inside: the 22 paths `regression-report.json` lists (`git diff --name-only 499f1f26` plus untracked files).
- declared: the 25 `## Files` paths of `PLAN.md`, read with `pharn/floor/plan-files-core.mjs`.
- `check-regress.mjs scope`: exit 0. escaped: none. escape_exempt: 2 (this feature's own `PLAN.md` and `GRILL.md`).
  outside: 162 test files and 1 eval pair.

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
  detached worktree at the base commit in the session scratchpad, removed afterwards; base and head ran one after the
  other.
- This is the stage's SECOND run. The first, before the merge of origin/main and before the GATE-2 review fix to the
  stages pointer, used base `dcf7b43d` (6.67.0). Its first head run recorded `tests: 1` while it ran at the same time as
  the base run on a loaded machine: `entry-base-evidence.test.mjs` "★ equivalent environment" failed with a
  `TypeError` after 80 s. That file passed alone (14/14), passed in `npm run check`, and the head gate set re-run alone
  recorded `tests: 0` (verdict `no-regressions`). It is a timing flake in a file this increment does not touch. It is
  recorded here, not counted, and it did not recur in this run.
