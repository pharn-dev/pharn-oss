# REGRESSION — test-results

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.** The verdict is
`check-regress.mjs verdict` (exit 0, `"no-regressions"`), copied verbatim into `regression-report.json`. It
catches exactly what the outside suite catches, and nothing more.

## Base and scope

- **Base:** `6ee6fc8` (`HEAD`). The working tree holds the uncommitted build, so the command's rule selects
  `base = HEAD`. The base side ran in a detached `git worktree` at that SHA, removed afterwards.
- **Inside:** 19 paths: the 17 `## Files` paths that changed (`docs/capabilities/README.md` was declared but
  `npm run docs:generate` left it unchanged) plus this feature's `PLAN.md` and `GRILL.md`. `escaped: []`;
  `escape_exempt`: `GRILL.md`, `PLAN.md` (each written by its own stage).
- **Outside gates:** `tests` (93 outside test files, run as one `node --test` over the listed paths),
  `validate`, and `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json`
  (both eval-pair paths confirmed readable at base and head). The style gates are skipped on both sides: no
  shared style config is inside.

## Per-gate exit codes (the verdict's input)

| gate                | base | head |
| ------------------- | ---- | ---- |
| `tests`             | 0    | 0    |
| `validate`          | 0    | 0    |
| `structural:…` pair | 0    | 0    |

`regressions[]`: none. `pre_existing[]`: none.

## What this does and does not cover

The inside files are this increment's own, so their behaviour is `/pharn-dev-verify`'s to judge, not this
stage's. The two changed runner modules (`run-gates.mjs`, `gate-run-core.mjs`) are inside; the outside tests
that exercise them indirectly — `check-verify`, `check-regress`, `check-loop-fresh` and the command-hygiene
suite, which build stamps and run the runner — are in the outside set and stayed green. That is the
comparison's whole claim: deterministically-detectable breakage outside the feature is absent. It is not a
claim that nothing broke.

## Iteration 2 (after the review fixes)

The review's fixes changed inside files only. The head side was re-captured over the same 93 outside tests,
`validate` and the eval pair, and compared with the unchanged base capture: every gate 0 → 0,
`check-regress.mjs verdict` exit 0, `"no-regressions"`. `regression-report.json` is that run's verdict,
verbatim. `inside` grew to 24 paths because this feature's own stage artifacts (`REGRESSION.md`, `VERIFY.md`,
`REVIEW.md` and the two reports) now exist; `escaped` is still empty, and each of them is in `escape_exempt`.
