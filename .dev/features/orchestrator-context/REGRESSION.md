# REGRESSION — orchestrator-context

- base: `9490b1b8de89340aba3b26c1e6ee8dcd2cbf8917` — `git merge-base HEAD origin/main` (the working tree was clean,
  the build committed as `b1524fb`). `origin/main` moved to `656d60b` (6.31.2, #288) during the run; that commit is
  NOT in this comparison — it is merged, and regress re-run, before the pull request.
- stage model: opus, inline. **Orchestration deviation, recorded (advisory):** in this worktree-isolated session the
  pinned `xargs` / `$VAR` forms are refused, so the same gates ran through `.pharn/pharn-dev-regress/capture.mjs`
  (argv arrays via `spawnSync`, exit codes recorded from the child status) — the recorded workaround.

## Scope (`check-regress.mjs scope`, `--feature orchestrator-context`)

- **inside:** 29 paths (listed in `regression-report.json`): the six command files, the helper and its test, the
  hygiene and catalog tests, twelve test files that read a command with its parts, the four meta-docs, the version,
  and this feature's own artifacts.
- **escaped:** none. `escape_exempt`: `.dev/features/orchestrator-context/GRILL.md` (written by its own stage).
- **outside gates:** `tests` over 111 outside test files, `validate`, and the one outside eval pair
  (`structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json`, both paths confirmed
  readable before its exit was recorded). No shared style config is inside, so the style gates are skipped on both
  sides (a style flip over byte-identical outside files is impossible).

## Gates, base → head

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `tests` (111 outside files)                                                                | 0    | 0    |
| `validate`                                                                                 | 0    | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |

- `regressions[]`: none. `pre_existing[]`: none.

**A harness red, found and not recorded.** The first HEAD run read `tests: 1`. Two outside tests
(`check-review-assignments.test.mjs:345`, `lens-scanner-map.test.mjs:73`) count lenses over `.`, and the baseline
checkout was still nested at `.pharn/pharn-dev-regress/base/` — `count-lenses.mjs` reported 44 lenses, 22 of them
inside it. The pinned procedure removes the baseline worktree BEFORE the HEAD run; this run had not. After removing
it, HEAD read `tests: 0`. The recorded map is the second run's.

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.**

This certifies the comparison only: regress catches what its suite catches, nothing more. A behaviour no test, rule or
eval covers — here, above all, whether a model running `/pharn-loop` or `/pharn-ship` reads each part at its point —
is invisible to it.
