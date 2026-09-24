# REGRESSION — wire-pharn-test

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.** The verdict is
`check-regress.mjs verdict` (exit 0, `"no-regressions"`), copied verbatim into `regression-report.json`. It catches
exactly what the outside suite catches, and nothing more.

## Base and scope

- **Base:** `927cd6b` (`HEAD`, `main` with items 01–04 merged). The working tree holds the uncommitted build, so
  `base = HEAD`; the base side ran in a detached `git worktree`, removed afterwards.
- **Inside:** 27 paths: the plan's changed `## Files` paths (as amended after grill) plus this feature's `PLAN.md` and
  `GRILL.md`. `escaped: []`.
- **Outside gates:** `tests` (96 outside test files), `validate`, and the trust-fence eval pair. Style gates skipped on
  both sides: no shared style config is inside.

## Per-gate exit codes

| gate                | base | head |
| ------------------- | ---- | ---- |
| `tests`             | 0    | 0    |
| `validate`          | 0    | 0    |
| `structural:…` pair | 0    | 0    |

`regressions[]`: none. `pre_existing[]`: none.

## What this covers

The changed shared modules sit inside (`check-loop-fresh.mjs`, the briefing pair). Their outside consumers — the
loop decision and record checkers, the cost and run-report renderers, `ship-outcome-core` and the rest of the 96 outside
suites — stayed green. Five product commands changed only in prose (the spine string and ordinals); the hygiene suite
that pins their lines is inside. That is the comparison's whole claim, not that nothing broke.

## Iteration 2 (after the review fixes)

The fix pass touched inside files only. Head re-captured over the 96 outside tests, `validate` and the eval pair
against the unchanged base `927cd6b`: every gate 0 → 0, `check-regress.mjs verdict` exit 0, `"no-regressions"` — now
`regression-report.json`. `escaped` is empty.
