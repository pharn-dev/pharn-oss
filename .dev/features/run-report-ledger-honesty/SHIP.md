# SHIP — run-report-ledger-honesty

## Stages that ran, in order

1. **`/pharn-dev-plan`**: `check-plan-lessons` was GREEN.
   - **GATE 1** was approved by the model under the user's written delegation ("go", continuing the
     standing no-interruption instruction). It is recorded as such.
2. **`/pharn-dev-grill`**: Step 1b exited `0`, and it raised 2 advisory concerns.
   - The important one was adopted: an identity compare of the latest `run-start` instead of "greater
     `seq`", which failed open after a `.pharn/` reset.
3. **`/pharn-dev-build`**: `validate` exited `0`.
4. **`/pharn-dev-regress`**: `"no-regressions"`.
5. **`/pharn-dev-verify`**: `"PASS"` (`reconcile` CLEAN).
6. **`/pharn-dev-review`**: 0 floor-gate findings and 1 minor advisory finding (the Verdicts section
   lacked its "no current ledger" prefix).
7. **GATE 2**: the decision was **fix**, under the same delegation, and the fix stayed within the
   planned files.
   - **Iteration 2:** `npm run check` exited 0 (2503/2503), `validate` stayed GREEN, and `reconcile` was
     CLEAN.
   - Regress was not re-run as a separate stage for iteration 2. The fix touched only
     `render-run-report(.test).mjs`, which is inside the feature, and the whole suite passed.

## Build note

- **F1:** `coverage: unavailable` under a known window renders "Run usage: UNAVAILABLE — not measured,
  and NOT a zero" and quotes `coverage_note`.
- **F2:** `ledgerCurrency()` compares the live markers' latest `run-start` with the ledger's recorded
  one, by `seq` and `ts` identity. A mismatch renders STALE LEDGER, with `n/a` for Outcome, Tokens and
  Files, and a "no current ledger" note on Verdicts. A missing live markers file renders "ledger currency
  not checked".
- **Command prose (advisory):** a non-zero emitter exit means no ledger was emitted this run.
- **Verification:** the integration review's probe was pointed at this tree and passed 18/18. Its I5
  case still passes, but for a layout reason: the probe keeps its markers outside the default base, so
  staleness is "not checked" there. The same failure through the default path is detected, and the new
  F2 test covers it.
- **Version:** 6.9.1 → 6.9.2 (patch).

## Pointers

- `REVIEW.md` and `GRILL.md`

lesson: none — both findings are first occurrences, so the L20 bar is not met.

deferred: none

Chain ran; the named floor verdicts are as shown. This is NOT a judgment that the increment is good or
wise; that is the human's call at the post-review gate.
