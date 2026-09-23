# SHIP — cost-ledger-verify-tail

## Stages that ran, in order

1. `/pharn-dev-plan` wrote `PLAN.md`, and `check-plan-lessons` was GREEN.
   - The defect was reproduced at `d96ef03` (6.13.0) before planning. The downstream ledger went RED with
     `423 recorded, 550 re-derived`, and an independent split gave 422 before the window, 630 inside and
     161 after its end.
   - **GATE 1 was approved by the model under explicit user delegation (2026-09-23).** It is recorded as
     such, not as a human approval.
2. `/pharn-dev-grill`: Step 1b `check-plan-lessons.mjs` exited `0`. It raised 3 advisory concerns, all
   answered in the build:
   - F1: the continuation WARN was kept deliberately;
   - F2: the dedup-order assumption is named in the contract's bound list;
   - F3: the CHANGELOG says what happens to already-committed ledgers.
3. `/pharn-dev-build`: `validate` exit **0** (`FLOOR: GREEN — 36 capabilities checked`). The setter parsed
   10 paths from 10 `## Files` bullets.
4. `/pharn-dev-regress`: `regression-report.json` `.verdict` = **`no-regressions`**. The base was
   `d96ef03`, and the gates were 93 outside tests, validate and 1 eval pair.
5. `/pharn-dev-verify`: `verify-report.json` `.verdict` = **`PASS`**. There were 7 gates, including
   `reconcile` CLEAN, and `npm test` gave 2884/2884 with 0 skipped after `npm ci`.
6. `/pharn-dev-review`: 0 floor-gate findings and 3 advisory ones, all minor and left as recorded.
7. **GATE 2:** the decision was **merge**, meaning commit this increment and continue to increment (b) in
   the same PR. It was taken by the model under the same delegation. The user merges the PR.

## Build note

`check-cost-ledger.mjs --verify-transcript` now checks `membership.excluded_requests` as the range
`[before, before + after]` instead of by equality. `before` and `after` are re-derived through
`deriveLedger`, which returns the unchanged ledger plus a count of excluded requests after the window's end
(`isAfterWindow`, new in `run-window-core.mjs`). Rows and totals are still exact. `cost.json` is
byte-identical. A WARN states the bound whenever the range was needed. The contract's `excluded_requests`
paragraph, field-table row and rule 6 now state the range and its bounds. `SKILLS_VERSION` moves 6.13.0 →
6.13.1, together with the badge and a new `## [6.13.1]` CHANGELOG section.

## Pointers

- `REVIEW.md`: not restated here.
- `GRILL.md`: advisory.
- `VERIFY.md`: the red-before-green, and the before/after on the real downstream ledger.

changelog-entry: exit 0

lesson: skipped. A candidate cleared L20's bar: L42's class recurred through L43's remedy (`REVIEW.md`,
"Proposed lesson candidate"). **Declined by the model under explicit user delegation (2026-09-23).** A canon
write is withheld from a delegated run because the model never self-promotes (`pharn/ARCHITECTURE.md §5`),
so the candidate is left for a human to take to `/pharn-dev-memory-promote`.

deferred:

- The lesson candidate above ("a record bound to a live referent must ask which part of that referent may
  still change").
- The `PLAN.md` "Deferred" items: an open window's rows grow with the session, and recording an emission
  timestamp would pin the tail exactly (a schema change).

Chain ran; the named floor verdicts are as shown. This is NOT a judgment that the increment is good or
wise; that is the human's call at the post-review gate.
