# REGRESSION — verify-ac-gate

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.** The verdict is
`check-regress.mjs verdict` (exit 0, `"no-regressions"`), copied verbatim into `regression-report.json`. It catches
exactly what the outside suite catches, and nothing more.

## Base and scope

- **Base:** `c06ba64` (`main` with items 01–05 merged). The working tree holds the uncommitted build, so the base side
  ran in a detached `git worktree`, removed afterwards. Re-run after the review fix pass; this is the final run.
- **Inside:** 39 paths — the plan's changed `## Files` (as amended after grill and review) plus this feature's
  records. `escaped: []`.
- **Outside gates:** `tests` (91 outside test files), `validate`, and the trust-fence eval pair. Style gates skipped
  on both sides: no shared style config is inside.

## Per-gate exit codes

| gate                | base | head |
| ------------------- | ---- | ---- |
| `tests`             | 0    | 0    |
| `validate`          | 0    | 0    |
| `structural:…` pair | 0    | 0    |

`regressions[]`: none. `pre_existing[]`: none.

## What this covers

The changed shared modules are inside: the lock script, `red-run-core`, `gate-run-core`, `check-verify`,
`check-loop`, `check-loop-fresh` and `render-run-report`. Their outside consumers stayed green, among them
`check-loop-decision`, `check-loop-record`, `run-gates`, `test-results-core`, the ship briefing pair, the cost
ledger, `ship-outcome-core` and the hooks' suites. The flag-less and `--stamp` outputs of `check-verify.mjs` are
unchanged; its existing fixture set is outside and green.
