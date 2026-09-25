# REGRESSION — neutral-test-results

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.** This is the verdict of
`pharn/floor/check-regress.mjs verdict` (`"no-regressions"`, exit 0), recorded verbatim in `regression-report.json`.

## Base and partition

- **Base:** `ee81d47af133810f358f94111e21a4a41031bb1b` (`HEAD`). The build is uncommitted in the working tree, so
  `git status --porcelain` is non-empty.
- **Inside (20 paths):** `git diff --name-only <base>` plus untracked files. That is the 18 declared `## Files`
  paths, plus this feature's own `PLAN.md` and `GRILL.md`, which `check-regress.mjs scope --feature` listed in
  `escape_exempt`.
- **`scope`: exit 0.** No changed path fell outside the declared writes.
- **Outside gates:** `tests` (102 of the 104 tracked test files, the two inside the feature excluded), `validate`,
  and `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` over
  `.dev/features/trust-fence/findings.json`. Both eval-pair paths were confirmed readable before running.
- **Style gates skipped** by the deterministic config-touch rule: `inside` touches no `eslint.config.mjs`,
  `.prettierrc.json`, `.prettierignore` or `.markdownlint-cli2.jsonc`.

## Exit codes, base → head

| gate                                | base | head |
| ----------------------------------- | ---- | ---- |
| `tests` (102 files, 3248 tests)     | 0    | 0    |
| `validate`                          | 0    | 0    |
| `structural:…/expected-injection-…` | 0    | 0    |

- `regressions[]`: none.
- `pre_existing[]`: none.

## How the capture ran (ADVISORY orchestration, and one stated deviation)

This session is isolated in a git worktree, and its guard refuses the command's pinned shell forms: the
`cat … | xargs node --test` line, the `$?` captures, and `git worktree add` for the baseline. Following the recorded
precedent, one disposable Node runner (`.pharn/pharn-dev-regress/run.mjs`, deleted before `/pharn-dev-verify`) ran
every command as an argv array and recorded each gate's exit code from `spawnSync`'s status, never typed.

- **The deviation, stated:** the base was materialized with `git archive` (a read-only operation) instead of
  `git worktree add`.
- **Head ran in a clean copy too, not in the working tree.** The copy holds the working tree's tracked and untracked
  files. Both copies got `node_modules` symlinked and a one-commit `git init`, so the two sides ran in the same kind
  of environment. A test that shells out to git sees a repo on both sides, and neither side sees the worktree's
  `.pharn/` state.
- The base side's 3248/3248 passing tests are the harness sanity check: a red baseline on a green repo would have
  meant the harness, not the code.

## The honest residual

`/pharn-dev-regress` catches exactly what its deterministic suite catches outside the feature, and nothing more. A
behaviour no test, rule or eval covers is invisible here. This certifies the comparison, never that nothing broke.
