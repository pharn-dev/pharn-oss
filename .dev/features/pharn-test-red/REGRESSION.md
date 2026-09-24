# REGRESSION — pharn-test-red

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.** The verdict is
`check-regress.mjs verdict` (exit 0, `"no-regressions"`), copied verbatim into `regression-report.json`. It catches
exactly what the outside suite catches, and nothing more.

## Base and scope

- **Base:** `8ba9308` (`HEAD`, `main` with items 01–03 merged). The working tree holds the uncommitted build, so
  `base = HEAD`; the base side ran in a detached `git worktree`, removed afterwards.
- **Inside:** 32 paths: the plan's changed `## Files` paths (as amended after grill) plus this feature's `PLAN.md`
  and `GRILL.md`. `escaped: []`.
- **Outside gates:** `tests` (92 outside test files), `validate`, and the trust-fence eval pair (both paths confirmed
  readable). Style gates skipped on both sides: no shared style config is inside.

## Per-gate exit codes

| gate                | base | head |
| ------------------- | ---- | ---- |
| `tests`             | 0    | 0    |
| `validate`          | 0    | 0    |
| `structural:…` pair | 0    | 0    |

`regressions[]`: none. `pre_existing[]`: none.

## What this covers

The changed shared modules sit inside (`gate-run-core.mjs`, `run-gates.mjs`, `check-spec.mjs`,
`spec-template-core.mjs`, `check-ac-tests.mjs`, `ac-tests-lock.mjs`, `test-results-core.mjs`). Their outside
consumers — `check-verify`, `check-regress`, `check-loop-fresh`, `check-spec-approved`, `check-plan-spec-agree`,
`render-run-report`, `test-results-core`'s suite and the rest of the 92 outside suites — stayed green. The pin
change (`check-spec.mjs` `pinHash`) is the one with the widest reach: every SPEC fixture outside this increment
carries no `spec_kind:` line and still pins byte-identically. That is the comparison's whole claim, not that
nothing broke.

## Iteration 2 (after the review fixes)

The fix pass touched inside files only, plus `PROTECTED-FOLLOWUPS.md`, which the plan now declares (amended after
review — a first iteration-2 scope run reported it `escaped`, being written but undeclared, and it is this feature's
own artifact). Head re-captured over the 92 outside tests, `validate` and the eval pair against the unchanged base
`8ba9308`: every gate 0 → 0, `check-regress.mjs verdict` exit 0, `"no-regressions"` — now `regression-report.json`.
`inside` is 37; `escaped` is empty.
