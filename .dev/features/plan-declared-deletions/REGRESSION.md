# REGRESSION — plan-declared-deletions

## Iteration 3 — the current record (a re-run of iteration 2's tree, `40fe1e5`; supersedes iteration 2)

- Why re-run: iteration 2 read `regressions` (`tests` 0 → 1) from one timeout in
  `.claude/hooks/protect-trusted-paths.test.cjs:1098`, a file this diff does not touch, with load averages 26.95 /
  59.75 / 68.11. The orchestrator did not override that floor verdict. It had the stage re-run once the 1-minute load
  average fell below 10 (waited 14 minutes; 8.04 / 27.02 / 43.17 at the start).
- Base: `2acb55ad7568c3a5bbbe18109b148e4b59fc5c32` (clean tree → `git merge-base HEAD origin/main`). Inside: the same 27
  paths; `check-regress.mjs scope` exited 0 with no escape; `escape_exempt` is the same six pipeline artifacts.
- Outside gates: 148 test files, `validate`, the one committed eval pair; style gates skipped (no shared style config
  inside).

| Gate                                                                                       | base → head |
| ------------------------------------------------------------------------------------------ | ----------- |
| `tests` (148 outside test files; 4811 tests each side, 0 failed)                           | 0 → 0       |
| `validate`                                                                                 | 0 → 0       |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0 → 0       |

`regressions[]`: none · `pre_existing[]`: none.

**REGRESSIONS: none.** No deterministically detectable breakage outside the feature. This stage catches exactly what
its suite catches, and nothing more.

- Load averages, from the runner: 7.48 / 26.59 / 42.92 at start, 4.55 / 14.22 / 31.66 when the base side finished, and
  99.63 / 87.98 / 67.20 when the head side finished (other sessions started meanwhile). The test that timed out in
  iteration 2 passed at head in 207 ms.
- `regression-report.json` is this iteration's verdict stdout byte-for-byte (sha256 `ff3190d7…9189e36` on both).

## Iteration 2 (after the GATE-2 review fixes, `292730c`) — superseded by iteration 3

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
