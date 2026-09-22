# SHIP — loop-freshness

## Stages that ran, in order

1. `/pharn-dev-plan` wrote `PLAN.md`, which answers the six Phase 0 questions and corrects the prompt's
   record. `check-plan-lessons` was GREEN.
   - The prompt's base-stamp path was unreachable, so the runner fix shipped first as #241
     (`run-gates-base-cwd`, 6.9.3).
   - **GATE 1** was approved by the model under the user's written delegation for this batch. It is
     recorded as such, not as a human approval.
2. `/pharn-dev-grill`: Step 1b `check-plan-lessons.mjs` exit `0`. The setter parsed 17 paths against 17
   declared bullets. There were 5 advisory concerns, 0 of them blocking. All five were folded into the
   build:
   - the self-integrity bound;
   - the commit gate is the first line of Step 6c, with `--front`;
   - the ledger co-location is stated;
   - one live fixture helper with a one-cause negative control;
   - the verify→regress cascade note.
3. `/pharn-dev-build`: `validate` exit `0`.
4. `/pharn-dev-regress`: `"no-regressions"`.
5. `/pharn-dev-verify`: `"PASS"` (`reconcile` CLEAN, 2545/2545 tests). `check-loop-fresh.mjs` has 99.74%
   line coverage.
6. `/pharn-dev-review`: 0 floor-gate findings and 2 advisory ones. One is the runner's `existsSync`
   containment gap (a named follow-up). The other is two stated deviations from the plan's check table.
7. **GATE 2:** the decision was **merge**, taken under the same delegation. Neither finding needs a change
   inside this increment's axis.

## Build note

`check-loop-fresh.mjs` runs checks A–J, fabrication before staleness, with a counted re-run budget and a
commit-gate mode. `/pharn-loop` reads it at Step 5 and as the first line of Step 6c. It adds S11
(`blocked: stale-evidence`) and the outcome `not committed: evidence stale`. `gate-run-core.mjs` gains
`LAPSE_CODES`, `RESERVED_REASON_CODES`, `logBasename` and nine members. The reverse closure test is new.

**Deviations from the approved plan, stated rather than hidden:**

1. An out-of-vocabulary `reason_code` is a RERUN `report-malformed`, not a STOP.
2. There is a ninth member, `ledger-malformed`.

**Found by the build's own test:** the first ledger containment check used `existsSync`. A dangling
symlink read as absent, so the append would have written through it. It now uses `lstat`.

## Pointers

- `REVIEW.md` — not restated here.
- `GRILL.md` — advisory.

lesson: none — one candidate did clear L20's bar ("`existsSync` is not an absence test inside a containment
check"). It is held under `deferred:` for the human, because this batch delegated the plan and merge gates
and did not delegate canon promotion, which needs an explicit human accept.

deferred:

- lesson candidate `existsSync-containment` (REVIEW.md, advisory finding 1), for the human at the end of
  the batch.
- follow-up `run-gates-dangling-link-containment` (REVIEW.md, advisory finding 1).

Chain ran; the named floor verdicts are as shown. This is NOT a judgment that the increment is good or
wise; that is the human's call at the post-review gate.
