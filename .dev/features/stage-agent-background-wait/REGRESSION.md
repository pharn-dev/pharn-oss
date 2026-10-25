# REGRESSION — stage-agent-background-wait

- **Base:** `1d34805c83e7426c78336407cd6e849ce592115e` (HEAD; the working tree was dirty — the build is uncommitted).
- **Inside (14 paths):** the plan's product and apparatus files, plus this feature's PLAN/GRILL/BUILD. `scope` exit 0:
  no path escaped the plan's `## Files`; `escape_exempt` empty.
- **Outside gates:** 168 test files (per-test records on both sides), `validate`, and the one committed eval pair. No
  shared style config was touched, so the style gates were skipped on both sides (the deterministic config-touch rule).
- Run through a node runner under `.pharn/` with the pinned forms as argv arrays (the per-test reporter by absolute
  path, `--test-reporter-destination` per side, each record removed first), because xargs is refused in this isolated
  worktree.

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---: | ---: |
| `tests`                                                                                    |    0 |    0 |
| `validate`                                                                                 |    0 |    0 |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` |    0 |    0 |

Per-test: base 5,584 passed / 0 failed / 4 skipped; head 5,587 passed / 0 failed / 1 skipped; `new_failures` none.

`regressions`: none. `pre_existing`: none.

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature** (`check-regress.mjs verdict` exit
0, `"no-regressions"`). This catches exactly what the outside suite catches — nothing more.
