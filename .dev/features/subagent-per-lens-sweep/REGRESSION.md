# REGRESSION — subagent-per-lens-sweep

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature**, in both runs.
`regression-report.json` now holds the **fix round 1** verdict, verbatim (sha256 `9c241beb…48ffea`): see
`## Fix round 1 (GATE 2)` at the end. The sections up to it record the first run.

## Run 1

`pharn/floor/check-regress.mjs verdict` exit 0, `"verdict": "no-regressions"`. Its stdout was committed verbatim in
`efe53830` (sha256 `075772f5…860a66`).

## Base

`c47707e62d5cd72f3e581ea49508ff3aa7e97bb8`. `git status --porcelain` was empty, so the base is
`git merge-base HEAD origin/main`; `origin/main` was fetched at the start of this run and is that commit. HEAD is the
build commit `5c1a9035`.

## Inside / outside

- **Inside (31 paths):** `git diff --name-only <base>` plus untracked files (none): the 26 `## Files` paths, this
  feature's `PLAN.md` and `GRILL.md`, and the three trusted docs the maintainer patched in `125ff0fe`.
- **Declared:** the 26 `## Files` paths, read with the pinned `plan-files-core.mjs` line.
- **`check-regress.mjs scope --feature subagent-per-lens-sweep`:** exit 0, `escaped: []`. `escape_exempt` lists
  `.dev/features/subagent-per-lens-sweep/GRILL.md`, `.dev/features/subagent-per-lens-sweep/PLAN.md`, `LIMITS.md`,
  `THREAT-MODEL.md` and `pharn/ARCHITECTURE.md`. The plan's Ordering predicted exactly those three trusted docs.
- **Outside gates:** `tests` (162 outside test files: no test file is inside), `validate`, and one structural gate for
  the committed eval pair `pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` ↔
  `.dev/features/trust-fence/findings.json` (both paths checked readable at base and HEAD before their exit was
  recorded).
- **Style gates skipped (deterministic):** no inside path is `eslint.config.mjs`, `.prettierrc.json`, `.prettierignore`
  or `.markdownlint-cli2.jsonc`, so they are absent from both maps.

## Gates, base → head

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `tests`                                                                                    | 0    | 0    |
| `validate`                                                                                 | 0    | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |

- `regressions[]`: none.
- `pre_existing[]`: none.

## Orchestration (advisory)

- The base checkout was `git worktree add --detach` at the base SHA, outside the repo (this session's scratchpad), and
  was removed with `git worktree remove --force` after the base capture. No `npm ci`: the gates run are stdlib-only.
- **Deviation:** this worktree-isolated agent's shell guard refuses the pinned `$(…)` / `xargs` forms, so the scope
  call and both captures ran through scratch node runners under `.pharn/pharn-dev-regress/`. They call the same
  commands with `spawnSync` argv arrays: `node --test <the 162 outside tests>` in one invocation (what the pinned
  `cat outside-tests.txt | xargs node --test` does for a list this size), `node pharn/floor/validate.mjs .` and
  `node pharn/floor/check-structural.mjs <expected> <actual> .`. Each exit code was taken from the child process. The
  test run took 411 s at base and 425 s at HEAD.

## Fix round 1 (GATE 2)

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.** `check-regress.mjs verdict` exit
0, `"verdict": "no-regressions"`, written verbatim to `regression-report.json` (sha256 `9c241beb…48ffea`).

- **Base:** `c47707e62d5cd72f3e581ea49508ff3aa7e97bb8` again: the tree was clean, and `origin/main` (re-fetched for
  this round) is still that commit. HEAD is the fix-round build `09744eb0`.
- **Inside (38 paths):** run 1's 31, plus `pharn/floor/lens-scanner-map.json` and
  `pharn/floor/installed-skills-core.mjs` (both added to `## Files` at GATE 2 fix round 1, before this round's
  anchor), plus this feature's `REGRESSION.md`, `REVIEW.md`, `VERIFY.md`, `regression-report.json` and
  `verify-report.json`.
- **Declared:** 28 `## Files` paths, by the pinned `plan-files-core.mjs` line.
- **`scope --feature subagent-per-lens-sweep`:** exit 0, `escaped: []`. `escape_exempt` is this feature's seven stage
  artifacts and the three trusted docs.
- **Outside gates:** the same set as run 1. 162 outside tests (neither new path is a test), `validate`, and the
  trust-fence structural pair. The style gates are skipped again, because no shared style config is inside.

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `tests`                                                                                    | 0    | 0    |
| `validate`                                                                                 | 0    | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |

`regressions[]` and `pre_existing[]`: none. The base checkout was a fresh `git worktree add --detach` in the
scratchpad, removed after the base capture. The scope call and both captures ran through the same scratch node runners
as run 1 (the deviation recorded above). The test run took 498 s at base and 504 s at HEAD.

Honest residual: `/pharn-dev-regress` catches exactly what this suite catches, nothing more. A regression no test,
rule or eval covers is invisible to it, so this verdict is "no deterministically-detectable breakage outside the
feature", never "nothing broke".
