# REGRESSION — ac-tests-agreement

**Base:** `137abd3088ac7bd079561be4c5ffc7a2e66aec21`. The working tree was dirty (a working-tree build), so
`base = HEAD` by the command's deterministic rule. The machine report, `regression-report.json`, is
`check-regress.mjs verdict`'s stdout, copied verbatim.

## Partition (from `check-regress.mjs scope --feature ac-tests-agreement`, exit 0)

- **Inside (22 paths):** every changed or untracked path. Each is declared in PLAN.md `## Files`, so nothing escaped the
  build's scope (`escaped: []`, `escape_exempt: []`).
- **Outside gates:** 96 test files, the one committed eval pair
  (`pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` ↔
  `.dev/features/trust-fence/findings.json`, confirmed readable before its exit code was recorded), `validate`, and
  the three style gates. The style gates run because `.prettierignore`, a shared style config, is inside.

## Per-gate exit codes (base → head)

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `tests` (96 outside test files)                                                            | 0    | 0    |
| `validate`                                                                                 | 0    | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |
| `format:check`                                                                             | 0    | 0    |
| `lint`                                                                                     | 0    | 0    |
| `lint:md`                                                                                  | 0    | 0    |

`regressions: []` · `pre_existing: []`

## Verdict (FLOOR — `check-regress.mjs verdict`, exit 0)

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.** This certifies the comparison
only. `/pharn-dev-regress` catches exactly what its suite catches, nothing more; a breakage no deterministic check
covers is invisible to it.

## Orchestration deviations (ADVISORY, stated)

- The pinned shell forms (`xargs`, `$VAR` exit capture, `mktemp`) are refused in an isolated worktree. So Steps 1–2
  ran from `.pharn/pharn-dev-regress/run.mjs`, which does the same steps with argv arrays and records exit codes
  only. The base checkout was a `git worktree add --detach` of the base SHA in the session scratchpad, removed
  afterwards.
- **devDeps at base:** this worktree has no `node_modules` of its own; its tools resolve the main checkout's tree. The
  base worktree got a symlink to that same `node_modules` instead of `npm ci`, so both sides ran identical tool
  versions. The increment changes no package file.
- The first runner attempt crashed on the eval-pair shape (`{expected, actual}` objects) before recording anything.
  It was fixed and re-run from scratch; no exit code from the failed attempt was used.
