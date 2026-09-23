# REGRESSION — e2e-gate

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.** The verdict is
`check-regress.mjs verdict` (exit 0, `"no-regressions"`), copied verbatim into `regression-report.json`. It catches
exactly what the outside suite catches, and nothing more.

## Base and scope

- **Base:** `4db8eae` (`HEAD`, which is `main` with item 01 merged). The working tree holds the uncommitted build,
  so `base = HEAD`. The base side ran in a detached `git worktree`, removed afterwards.
- **Inside:** 16 paths: the 14 `## Files` paths plus this feature's `PLAN.md` and `GRILL.md`. `escaped: []`.
- **Outside gates:** `tests` (93 outside test files), `validate`, and the
  `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` pair (both paths
  confirmed readable). Style gates skipped on both sides: no shared style config is inside.

## Per-gate exit codes

| gate                | base | head |
| ------------------- | ---- | ---- |
| `tests`             | 0    | 0    |
| `validate`          | 0    | 0    |
| `structural:…` pair | 0    | 0    |

`regressions[]`: none. `pre_existing[]`: none.

## Coverage of the change

The changed modules (`gate-run-core.mjs`, `test-results-core.mjs`) and the three commands are inside. Outside
suites that consume them — `check-verify`, `check-regress`, `check-loop-fresh`, `command-hygiene` — stayed green,
which is the comparison's whole claim. It is not a claim that nothing broke.

## Iteration 2 (after the review fixes)

The fixes touched inside files only (`pharn-loop.md` and `run-gates.mjs` were added to the plan's `## Files`). The
head side was re-captured over the same 93 outside tests, `validate` and the eval pair against the unchanged base
`4db8eae`: every gate 0 → 0, `check-regress.mjs verdict` exit 0, `"no-regressions"`, which is now
`regression-report.json`. `inside` grew to 23 (the two added files plus this feature's stage artifacts);
`escaped` is still empty.
