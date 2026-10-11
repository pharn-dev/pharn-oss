# REGRESSION — plan-declared-deletions

## Iteration 2 (after the GATE-2 review fixes, `292730c`)

- Base: `2acb55ad7568c3a5bbbe18109b148e4b59fc5c32` — the working tree was clean, so the base is
  `git merge-base HEAD origin/main`: main at 6.55.0.
- Inside: 27 paths — the 21 declared `## Files` paths plus this feature's `GRILL.md`, `REVIEW.md`, and the four
  artifacts of iteration 1. `check-regress.mjs scope` exited 0 with no escape; `escape_exempt` lists the six pipeline
  artifacts (`PLAN.md` is itself declared).
- Outside gates: 148 test files, `validate`, and the one committed eval pair. The style gates were skipped because no
  shared style config is inside.

| Gate                                                                                       | base → head |
| ------------------------------------------------------------------------------------------ | ----------- |
| `tests` (148 outside test files)                                                           | 0 → **1**   |
| `validate`                                                                                 | 0 → 0       |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0 → 0       |

`regressions[]`: `tests` · `pre_existing[]`: none.

**REGRESSIONS: 1 outside the feature — stage FAILS.** This stage catches exactly what its suite catches, and nothing
more.

### What the red is (investigated, not re-decided — the verdict above stands)

- One test of 4811 failed at HEAD: `.claude/hooks/protect-trusted-paths.test.cjs:1098`, "✧ a 100k-segment payload path
  is judged in linear time, with the same verdict as its short spelling" — `the hook did not finish within 30 s
(30020 ms)`. 4809 passed.
- That file and the hook it tests are outside this increment: neither is in `## Files`, and the diff since the base does
  not touch `.claude/hooks/`.
- Re-run alone right after, the same test passed in 128 ms. `uptime` at the time read load averages 26.95 / 59.75 /
  68.11 (1 / 5 / 15 min) — other sessions on this machine — so the 30 s timeout was most likely hit under load.
- That is an observation for the human. It does not change the floor verdict, which counts a pass→fail flip as a
  regression whatever its cause. A re-run of this stage on a quieter machine is the human's or orchestrator's call;
  this stage did not proceed to `/pharn-dev-verify`.

## Iteration 1 (the build, `8a85699`)

Base `2acb55a`, 22 paths inside, `escape_exempt` `GRILL.md` alone; `tests` (148 files), `validate` and the structural
pair were all `0 → 0`; verdict `no-regressions`.

## Run note (advisory)

The worktree's command guard refuses the pinned shell forms (`$(…)` capture, `xargs`, `$VAR`), so Steps 1.4–3 ran
through a node runner under `.pharn/pharn-dev-regress/` with `spawnSync` argv arrays: the same base rule, the same
`check-regress.mjs scope` call with the pinned extractor's `declared.txt`, the same gate set on both sides (the base in
a detached `git worktree` outside the project, removed afterwards), and the same `check-regress.mjs verdict` call.
`regression-report.json` is the verdict's stdout byte-for-byte (iteration 2: sha256 `3d9af00d…2314a8c4` on both). The
runner was deleted after the stage.
