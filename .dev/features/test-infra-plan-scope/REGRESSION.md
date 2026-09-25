# REGRESSION — test-infra-plan-scope

**Base (final run):** `67b7b8b404026f58e7fbb26bbc1fd4dfae8cd5e2`, i.e. `origin/main` after #270 (6.20.7). The branch
was rebased onto it and committed, so the tree was clean and `base = merge-base HEAD origin/main` by the command's
deterministic rule. The machine report, `regression-report.json`, is that run's `check-regress.mjs verdict` stdout,
copied verbatim (`cmp` against the captured stdout: byte-identical).

This stage ran **three times**, every run `no-regressions` with every gate 0 on both sides:

1. Against `7bcd7a8` (dirty tree, `base = HEAD`) after the build, before main moved.
2. Against `8eec2d7` (6.20.6, #269) after the first rebase.
3. Against `67b7b8b` (6.20.7, #270) after the second rebase and the two GATE-2 review fixes — the run recorded below.

## Partition (from `check-regress.mjs scope --feature test-infra-plan-scope`, exit 0)

- **Inside (18 paths):** every path changed since the base, including this feature's `REVIEW.md`. Each is declared
  in PLAN.md `## Files`, so nothing escaped the build's scope (`escaped: []`, `escape_exempt: []`).
- **Outside gates:** 99 test files (of 103 in the repo), the one committed eval pair
  (`pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` ↔
  `.dev/features/trust-fence/findings.json`, both confirmed readable before the exit code was recorded), and
  `validate`. The three style gates are skipped on BOTH sides: no shared style config (`eslint.config.mjs`,
  `.prettierrc.json`, `.prettierignore`, `.markdownlint-cli2.jsonc`) is inside, so a style flip over the outside files
  is impossible.

## Per-gate exit codes (base → head)

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `tests` (99 outside test files)                                                            | 0    | 0    |
| `validate`                                                                                 | 0    | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |

`regressions: []` · `pre_existing: []`

## Verdict (FLOOR — `check-regress.mjs verdict`, exit 0)

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.** This certifies the comparison
only. `/pharn-dev-regress` catches exactly what its suite catches, nothing more; a breakage no deterministic check
covers is invisible to it.

## Orchestration deviations (ADVISORY, stated)

- The pinned shell forms (`xargs`, `$VAR` exit capture, `mktemp`) are refused in an isolated worktree, so Steps 1–3
  ran from `.pharn/pharn-dev-regress/run.mjs`: the same steps with argv arrays, recording exit codes only (logs kept
  beside them for diagnosis, read by no verdict). The base checkout was a `git worktree add --detach` of the base SHA
  in the session scratchpad, removed afterwards. The runner was deleted after each run, because `eslint .` (a verify
  gate) descends into `.pharn/`.
- **devDeps at base:** this worktree has no `node_modules` of its own; its tools resolve the main checkout's tree. The
  base worktree got a symlink to that same `node_modules` instead of `npm ci`, so both sides ran identical tool
  versions. No style gate ran, and the increment changes no package file.
- **The rebases and the reconciliation epochs.** Before the first rebase, the build epoch's reconcile was recorded:
  `check-bash-reconcile.mjs --require-baseline` exit 0, `CLEAN` (14 paths reconciled, no escapes). After each rebase
  the epoch was re-anchored (`--anchor --by pharn-dev-build`, after the plan's scope setter, the order
  `/pharn-dev-build` uses), so each later verify judges only the writes made after that rebase. Main's merged files
  are not this build's writes.
