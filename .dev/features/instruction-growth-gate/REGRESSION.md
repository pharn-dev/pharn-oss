# REGRESSION — instruction-growth-gate

- **Base:** `d40667d1e998ecfc3039a658648065cba0243e9c`. BASE_RULE chose it because the working tree was dirty, so the
  base is `HEAD`.
- **Partition** (`check-regress.mjs scope --feature instruction-growth-gate`, exit 0):
  - 21 paths are inside, all declared in PLAN `## Files`; 0 escaped.
  - Two are exempt as this feature's own pipeline artifacts (`GRILL.md`, `PLAN.md`).
  - 125 outside test files and one outside eval pair (trust-fence) remain.
- **Style gates skipped.** No shared style config is inside, so a style flip over the outside files is impossible.

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---: | ---: |
| `tests` (125 outside test files)                                                           |    0 |    0 |
| `validate`                                                                                 |    0 |    0 |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` |    0 |    0 |

- `regressions[]`: none · `pre_existing[]`: none

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.** This catches what the suite
catches, nothing more: a regression that no outside test, rule or eval covers is invisible here.

**Orchestration deviation, recorded (ADVISORY).** This session is isolated in a worktree, and the pinned shell forms of
`/pharn-dev-regress` Step 2 (`xargs`, `$?` capture) are refused there. So the identical gate set ran through a scratch
node runner, `.pharn/pharn-dev-regress/capture.mjs`. The runner uses `spawnSync` argv arrays and records only exit
statuses. It ran each gate in a detached base worktree, with `node_modules` symlinked in, and at HEAD. The first run
crashed in the runner itself, on the eval-pair object shape, before any map was written. It was fixed and re-run in
full. The verdict is `check-regress.mjs verdict` over the two maps, and `regression-report.json` is its stdout verbatim
(`cmp`-equal).
