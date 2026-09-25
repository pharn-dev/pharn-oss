# REGRESSION — ac-tests-agreement

**Base (final run):** `22f002aa608b59be042fd6e9e879bf17aa29c730`, i.e. `origin/main` after #267. The branch was rebased
onto it and committed, so the tree was clean and `base = merge-base HEAD origin/main` by the command's deterministic
rule. The machine report, `regression-report.json`, is that run's `check-regress.mjs verdict` stdout, copied
verbatim.

This stage ran **three times**, all with the same verdict, `no-regressions`, and every gate 0 on both sides:

1. Against `137abd3` (dirty tree, `base = HEAD`) after the build.
2. Again after the GATE-2 fix to `check-spec.mjs`.
3. Against `22f002a` after the rebase — the run recorded below.

## Partition (from `check-regress.mjs scope --feature ac-tests-agreement`, exit 0)

- **Inside (27 paths):** every path changed since the base. Each is declared in PLAN.md `## Files`, so nothing escaped
  the build's scope (`escaped: []`, `escape_exempt: []`).
- **Outside gates:** 97 test files, the one committed eval pair
  (`pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` ↔
  `.dev/features/trust-fence/findings.json`, confirmed readable before its exit code was recorded), `validate`, and
  the three style gates. The style gates run because `.prettierignore`, a shared style config, is inside.

## Per-gate exit codes (base → head)

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `tests` (97 outside test files)                                                            | 0    | 0    |
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
