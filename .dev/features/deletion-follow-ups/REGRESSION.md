# REGRESSION — deletion-follow-ups

## Iteration 3 — F1 routed through the existing `git()` helper (`bdb75d3`); the current record

- Base: `45107f7bb1a9e19d39b5f561c4fcb12d5b557a45` (clean tree → `git merge-base HEAD origin/main`). Inside: the same 20
  paths; `check-regress.mjs scope` exited 0 with no escape; `escape_exempt`: this feature's six pipeline artifacts and
  `LIMITS.md`.
- Outside gates: 153 test files, `validate`, and the one committed eval pair (real `{expected, actual}` paths, both
  confirmed readable). Style gates skipped (no shared style config inside).

| Gate                                                                                       | base → head |
| ------------------------------------------------------------------------------------------ | ----------- |
| `tests` (153 outside test files; 5201 tests each side, 0 failed)                           | 0 → 0       |
| `validate`                                                                                 | 0 → 0       |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0 → 0       |

`regressions[]`: none · `pre_existing[]`: none.

**REGRESSIONS: none.** No deterministically detectable breakage outside the feature. This stage catches exactly what
its suite catches, and nothing more.

- Iteration 2's two `★ GIT CEILING` failures (`stage-runtime.test.mjs`) pass at head: `ignoredByGit` no longer adds a
  git spawn of its own.
- Load averages: 4.06 / 6.81 / 10.03 at start, 3.58 / 5.68 / 8.56 when the base side finished, 3.82 / 5.92 / 7.90 at
  the end.
- `regression-report.json` is this iteration's verdict stdout byte-for-byte (sha256 `c1b562b7…aaa6` on both).

## Iteration 2 — after the GATE-2 review fixes (`6f41fc3`); superseded by iteration 3

- Base: `45107f7bb1a9e19d39b5f561c4fcb12d5b557a45` (clean tree → `git merge-base HEAD origin/main`). Inside: 20 paths;
  `check-regress.mjs scope` exited 0 with no escape; `escape_exempt`: this feature's six pipeline artifacts and
  `LIMITS.md`.
- Outside gates: 153 test files, `validate`, and the one committed eval pair (passed as its real `{expected, actual}`
  paths this time, both confirmed readable). Style gates skipped (no shared style config inside).

| Gate                                                                                       | base → head |
| ------------------------------------------------------------------------------------------ | ----------- |
| `tests` (153 outside test files; 5201 tests each side; head: 2 failed)                     | 0 → **1**   |
| `validate`                                                                                 | 0 → 0       |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0 → 0       |

`regressions[]`: `tests` · `pre_existing[]`: none.

**REGRESSIONS: 1 outside the feature — stage FAILS.** This stage catches exactly what its suite catches, and nothing
more.

- The two failing tests are in `pharn/floor/stage-runtime.test.mjs`, outside this plan's `## Files`:
  `★ GIT CEILING — every git spawn in a shipped floor module is listed, and each that can print a listing carries a
maxBuffer` and its `discriminates` twin. Cause, read from the assertion diff: the review fix F1 added a NEW
  `spawnSync("git", ["check-ignore", …])` in `check-bash-reconcile.mjs` (`ignoredByGit`), so the scanned map gained
  `check-ignore` beside the pinned `GIT_SPAWNS["check-bash-reconcile.mjs"]` (`[null, null, "diff"]`). A real
  regression caused by this increment, not load: load averages 3.31 / 4.20 / 13.96 at start and 7.55 / 9.35 / 11.51 at
  the end.
- Not fixed in iteration 2 (the stop rule); the orchestrator chose remedy (a), applied in `bdb75d3` (iteration 3).
- `regression-report.json` is this iteration's verdict stdout byte-for-byte (sha256 `c48a45ab…88edb` on both).

## Iteration 1 (`41a2c49`) — superseded

- Base: `45107f7bb1a9e19d39b5f561c4fcb12d5b557a45`. The working tree was clean, so the base is
  `git merge-base HEAD origin/main` (main at 6.56.0). HEAD: `41a2c49` (the build commit).
- Inside: 15 paths, the 13 declared `## Files` paths plus `GRILL.md` and `LIMITS.md`. `check-regress.mjs scope` exited
  0 with no escape. `escape_exempt`: `.dev/features/deletion-follow-ups/GRILL.md` (this feature's grill artifact) and
  `LIMITS.md` (a hook-protected trusted doc, the human's `83c5829`).
- Outside gates: 153 test files, `validate`, and the one committed eval pair. The style gates were skipped because no
  shared style config is inside.

| Gate                                                                                       | base → head |
| ------------------------------------------------------------------------------------------ | ----------- |
| `tests` (153 outside test files; 5201 tests each side, 0 failed)                           | 0 → 0       |
| `validate`                                                                                 | 0 → 0       |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0 → 0       |

`regressions[]`: none · `pre_existing[]`: none.

**REGRESSIONS: none.** No deterministically detectable breakage outside the feature. This stage catches exactly what
its suite catches, and nothing more.

## Orchestration notes (advisory)

- The pinned shell forms (`xargs`, `$(…)`) are refused by this worktree's isolation guard, so Steps 1–3 ran through a
  node runner under `.pharn/pharn-dev-regress/` with argv arrays; it was deleted after the stage.
- **First assembly was wrong, and was not recorded as a verdict.** The runner built the structural gate's id and
  operands from the scope's `outside_eval_pairs` objects as if they were `EXPECTED::ACTUAL` strings, so the gate read
  `structural:[object Object]`, exit 1 on both sides — a setup error that `check-regress.mjs` classified
  `pre_existing`, the L5/L16 masking this command warns about. Only the structural gate was then re-run, at the same
  base (re-checked) and at HEAD, with the real `{expected, actual}` pair (both paths confirmed readable first). The
  `tests` and `validate` exits were kept from the first run, and the verdict was re-computed over the corrected maps.
- Skipped counts differ (base 6, head 1); no test failed on either side.
- Load averages: 20.97 / 27.63 / 26.51 at start, 84.05 / 91.90 / 64.16 when the base side finished, 9.69 / 46.50 /
  56.53 when the head side finished. No test timed out.
- `regression-report.json` is the corrected verdict stdout byte-for-byte (sha256 `9e246668…c6c1` on both).
