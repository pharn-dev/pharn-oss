# REGRESSION — lean-stage-agent (CORE-107)

- Base: `b38cd31c6a5f86c429a8a8c1a35c317252612cd2` (HEAD, a working-tree build, so `base = HEAD`).
- How it ran: through a node runner (`pharn/.run/pharn-dev-regress/run.mjs`, scratch) that runs Steps 1–3's pinned
  argv with `spawnSync` argv arrays. The worktree-isolation guard refuses the pinned shell forms (`xargs`, `$VAR`
  capture), so this deviation is advisory orchestration. The verdict is `check-regress.mjs`'s, unchanged.
- Inside (14 paths): the 13 declared `## Files` paths plus this feature's `PLAN.md`, which `scope` exempted
  (`escape_exempt`). `scope` exited 0, with no escapes.
- Outside: 193 test files, the floor, and the one committed eval pair. No shared style config changed, so the style
  gates were skipped on both sides.

| gate                                                                                               | base | head |
| -------------------------------------------------------------------------------------------------- | ---: | ---: |
| `tests` (per-test: base 6,530 passed, 0 failed, 7 skipped; head 6,531 passed, 0 failed, 6 skipped) |    0 |    0 |
| `validate`                                                                                         |    0 |    0 |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json`         |    0 |    0 |

- `regressions[]`: none. `pre_existing[]`: none. `per_test.new_failures`: none.

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.**

The comparison catches what the suite catches, nothing more: a regression no test, rule or eval covers is invisible
to it. Machine report: `regression-report.json` (the `check-regress.mjs verdict` output, verbatim).
