# REGRESSION — plan-declared-deletions

- Base: `2acb55ad7568c3a5bbbe18109b148e4b59fc5c32` — the working tree was clean (the build is committed), so the base is
  `git merge-base HEAD origin/main`: main at 6.55.0.
- Inside: 22 paths — the 21 declared `## Files` paths plus this feature's `GRILL.md`. `check-regress.mjs scope` exited 0
  with no escape; `escape_exempt` lists `GRILL.md` alone (`PLAN.md` is itself declared).
- Outside gates: 148 test files, `validate`, and the one committed eval pair. The style gates were skipped because no
  shared style config is inside.

| Gate                                                                                       | base → head |
| ------------------------------------------------------------------------------------------ | ----------- |
| `tests` (148 outside test files)                                                           | 0 → 0       |
| `validate`                                                                                 | 0 → 0       |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0 → 0       |

`regressions[]`: none · `pre_existing[]`: none.

**REGRESSIONS: none.** No deterministically detectable breakage outside the feature. This stage catches exactly what
its suite catches, and nothing more.

## Run note (advisory)

The worktree's command guard refuses the pinned shell forms (`$(…)` capture, `xargs`, `$VAR`), so Steps 1.4–3 ran
through a node runner under `.pharn/pharn-dev-regress/` with `spawnSync` argv arrays: the same base rule, the same
`check-regress.mjs scope` call with the pinned extractor's `declared.txt`, the same gate set on both sides (the base in
a detached `git worktree` outside the project, removed afterwards), and the same `check-regress.mjs verdict` call.
`regression-report.json` is the verdict's stdout byte-for-byte (sha256 `fbf8f3f7…f8086e` on both). The runner was
deleted after the stage.
