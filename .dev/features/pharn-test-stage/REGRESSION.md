# REGRESSION — pharn-test-stage

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.** The verdict is
`check-regress.mjs verdict` (exit 0, `"no-regressions"`), copied verbatim into `regression-report.json`. It catches
exactly what the outside suite catches, and nothing more.

## Base and scope

- **Base:** `7e9ed52` (`HEAD`, `main` with items 01–02 merged). The working tree holds the uncommitted build, so
  `base = HEAD`; the base side ran in a detached `git worktree`, removed afterwards.
- **Inside:** 28 paths: the plan's changed `## Files` paths plus this feature's `PLAN.md` and `GRILL.md`. `escaped: []`.
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

Several changed modules sit inside (`plan-files-core.mjs`, `check-regress.mjs`, `worktree-fingerprint.mjs`,
`spec-template-core.mjs`, `check-model-config.mjs`, `reconcile-ignore.json`). Their outside consumers —
`render-run-report`, `check-spec-approved`, `check-plan-spec-agree`, `check-loop-fresh`, `command-hygiene` and
the rest of the 92 outside suites — stayed green. That is the comparison's whole claim, not that nothing broke.

## Iteration 2 (after the review fixes)

The fix pass touched inside files only (three added to the plan: `command-hygiene.test.mjs`, `pharn-loop.md`,
`check-config.mjs`). Head re-captured over 91 outside tests, `validate` and the eval pair against the unchanged base
`7e9ed52`: every gate 0 → 0, `check-regress.mjs verdict` exit 0, `"no-regressions"` — now `regression-report.json`.
`inside` is 36; `escaped` is still empty.
