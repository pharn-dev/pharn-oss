# SHIP — run-scoped-token-accounting

## Stages that ran, in order

1. `/pharn-dev-plan` wrote `PLAN.md`. `check-plan-lessons` was GREEN.
   - **GATE 1:** the human approved the plan in the interactive form ("Approve as written").
2. `/pharn-dev-grill` wrote `GRILL.md`. Step 1b `check-plan-lessons.mjs` exited `0`, so the run proceeded.
   - The grill raised 6 advisory concerns. The build adopted four of them:
     - fail closed on a marker after a `run-stop`;
     - numeric timestamp comparison;
     - adoption traceable via `origin: "pending"`;
     - `excluded_requests: null` under `unknown`.
3. `/pharn-dev-build`: `node pharn/floor/validate.mjs .` exited `0` (GREEN). `npm run check` exited 0.
4. `/pharn-dev-regress`: `regression-report.json` `.verdict` is `"no-regressions"`.
5. `/pharn-dev-verify`: `verify-report.json` `.verdict` is `"PASS"`, and `reconcile` is `CLEAN`.
6. `/pharn-dev-review`: 0 floor-gate findings and 4 advisory findings (2 important, 2 minor). See
   `REVIEW.md`.
7. **GATE 2:** the decision was **fix**. The user delegated this gate in writing mid-run ("zaakceptuj
   jeśli uważasz że jest dobry… bez mojej ingerencji"), and it is recorded here as a model decision
   under that delegation, not as a human's.
   - All four review findings were fixed inside the approved `## Files`:
     - adoption is now opt-in via `--adopt-pending`, used by ship only;
     - `--verify-transcript` WARNs on `unknown`;
     - the stale WARN wording is corrected;
     - `attribute()` compares timestamps numerically.
   - A second iteration then ran:
     - `validate`: 0.
     - `regress`: `"no-regressions"`.
     - `verify`: `"PASS"`, with `reconcile` `CLEAN`.
     - `npm run check`: 0, 2483/2483 tests.

## The build note (it has no separate file)

The increment adds:

- `pharn/floor/run-window-core.mjs`, the one `run-window/1` membership rule, imported by both the
  emitter and the checker;
- `mark-phase.mjs --pending-start` and `--adopt-pending`;
- ledger schema `pharn-cost-ledger/2`, with a closed `membership` block;
- checker RULE 8, which recomputes the window from the file's own markers and REDs a row outside it;
- `/1` read as legacy, with a SESSION-scoped WARN;
- `--verify-transcript` bound to the RECORDED markers;
- `RUN-REPORT.md` measurement labels;
- ship and loop prose, the contract, `CLAUDE.md`, `CHANGELOG.md`, and the 6.9.0 bump.

**Before/after (advisory evidence, produced at build time against `git archive 81b5124`):** the same
100-before / 10-during fixture gave `pharn-cost-ledger/1: totals.input=110 requests=2 unattributed=2`
pre-fix, and `pharn-cost-ledger/2: totals.input=10 requests=1 unattributed=1` post-fix. The committed
regression test asserts the literal `10`.

## Pointers

- `REVIEW.md` — findings, not restated here (P4).
- `GRILL.md` — advisory.

lesson: none — both important review findings are first occurrences of their shape, so the L20
recurrence bar is not met. The Step 2b ask was delegated by the user, and nothing was taken to
`/pharn-dev-memory-promote`.

deferred: none

Chain ran; the named floor verdicts are as shown. This is NOT a judgment that the increment is good or
wise; that is the human's call at the post-review gate.
