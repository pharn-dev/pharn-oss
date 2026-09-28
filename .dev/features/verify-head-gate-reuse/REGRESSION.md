# REGRESSION — verify-head-gate-reuse

- **Base:** `2cf0e8507a4e28ce5398784b8e6014d08c091916` (`HEAD` — the working tree was dirty with this increment's
  uncommitted build, so the auto-detect rule chose `HEAD`).
- **Inside (29 paths):** exactly this increment's `## Files` plus its own stage artifacts (`regression-report.json`,
  verbatim, lists them). `check-regress.mjs scope` exited **0**: no path escaped the declared writes.
- **Outside gates:** the 119 committed `*.test.mjs` / `*.test.cjs` files outside the inside set (one `node --test` run),
  the whole-repo `validate.mjs`, and the one committed eval pair
  (`pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` ↔
  `.dev/features/trust-fence/findings.json`). No shared style config is inside, so the style gates were skipped on both
  sides (the skip rule).

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---: | ---: |
| `tests` (119 outside test files)                                                           |    0 |    0 |
| `validate`                                                                                 |    0 |    0 |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` |    0 |    0 |

`regressions: []` · `pre_existing: []`

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.**

**How the capture ran (advisory orchestration).** Steps 1–2 ran as one node runner under
`.pharn/pharn-dev-regress/capture.mjs` that passes every list as an argv array (L5/L16 — no shell word-splitting),
with the base side in a detached worktree of the base SHA, removed afterwards. The verdict is
`node pharn/floor/check-regress.mjs verdict …` (exit 0), copied verbatim into `regression-report.json`.

_Honest residual: this catches what the outside suite, the floor and the eval pair catch — nothing more. It certifies
the base-vs-head comparison of those gates, never that the increment is correct._
