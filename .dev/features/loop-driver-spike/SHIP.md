# SHIP — loop-driver-spike

`/pharn-dev-ship` for Linear CORE-113, the loop-driver spike. Dev apparatus only.

## Stages, in order

1. **`/pharn-dev-plan`.** Wrote `PLAN.md`. The GATE-1 halt was reported to the orchestrating agent.
   - **GATE 1 was decided by the orchestrating agent under the user's delegation** (a model decision, not a human
     approval). It approved with answers to the six open questions plus extra decisions, all recorded in PLAN.md
     "Decisions at GATE 1". The plan was amended before the build's anchor: `kit/preflight.sh` was added to
     `## Files`.
2. **`/pharn-dev-grill`.** `check-plan-lessons.mjs` exited 0. The interrogation raised 6 advisory concerns, all handled
   in the build (`GRILL.md`).
3. **`/pharn-dev-build`.** It wrote the driver, the test and the kit, then stopped twice for the maintainer's live runs:
   - the setup and preflight;
   - `driver-1`, `loop-1` and `loop-2`, run from a terminal, one after another.

   It then wrote `RECORD.md` and the CHANGELOG entry from the measured outputs. `validate.mjs` exited 0. During the
   wait, `measure.mjs` was corrected to read tokens from the transcripts, and `setup.sh` gained the settings step the
   maintainer had applied by hand.

4. **`/pharn-dev-regress`.** `no-regressions` (`regression-report.json`, `REGRESSION.md`).
5. **`/pharn-dev-verify`.** PASS. It ran twice, both PASS; `verify-report.json` and `VERIFY.md` are the second run.
6. **`/pharn-dev-review`.** GREEN: 0 floor-gate findings, 3 advisory (`REVIEW.md`).

**GATE 2 was decided by this agent under the orchestrator's delegation** (a model decision, not a human decision).
The decision was **fix, then merge-ready**:

- the two in-plan advisory findings were fixed: the driver header's conditional kinds and the README's `measure.mjs`
  line, with the matching `RECORD.md` §3 sentence;
- `/pharn-dev-verify` was re-run over the fixed tree and read PASS;
- the third finding (`kit/intent.md` holds the extraction rule rather than the private text) is kept as the safer
  deviation.

The merge itself is not this run's: a pull request is opened and left unmerged.

## After the pull request — one CI-fix iteration (a model decision under delegation)

PR #457's `check` job failed at the pharn-ci diff-coverage gate: 89.31% against a 100% threshold. The uncovered lines
were in `driver/driver-core.mjs` and `driver/measure.mjs`. All other checks passed.

The orchestrator delegated the fix as tests only. This agent then made it as follows:

- **Tests added**, in `driver/loop-driver.test.mjs`, in process:
  - walks of the S12 preflight path, the Step 6d path, a failing fn step, a failed redirect, a throwing capture, a stop
    before the isolation witness exists, a spent step budget, and a driver error while closing;
  - `measure.mjs` end to end on fixture directories, with its CLI now an exported `measure(argv)`.
- **Two defects the new tests found, fixed.** Both are in paths `driver-1` never took (RECORD.md §9):
  - step names defined twice on the Step 6d path (`c6d-scope`, `c6d-amend`, `c6d-check`), so a closeout exit 4 would
    have rewritten the record without reverting the SPEC. The record-side steps are now `c6d-loop-scope`,
    `c6d-loop-amend` and `c6d-record-check`, and a closure test pins that no step id is defined twice;
  - a spent step budget skipped the close steps. A stop now has `CLOSE_STEPS` (60) more steps to finish closing.
- **One branch removed as dead code:** the interpreter's "a stop action while closing" branch. No close step emits
  one, and a closure test pins that.
- **Checked locally the way CI measures it:** `npm run test:coverage` (6,944 tests, 0 failed) writes
  `coverage/lcov.info`, and it holds no zero-hit `DA` line in `driver-core.mjs`, `measure.mjs` or `token-exit.mjs`.
- **`/pharn-dev-verify` was re-run over the fixed tree**, and read PASS (stamp `0a75d954…`). The verdict block below
  is that run's.
- **`/pharn-dev-regress` was not re-run.** The change touches only the feature's own files, which are inside the
  partition, so no outside gate can flip.

## Verdict block

verdict-grill: exit 0
verdict-build: exit 0
verdict-regress: no-regressions
verdict-verify: PASS
run-ended: GATE 2

## Pointers

- Review: `.dev/features/loop-driver-spike/REVIEW.md`. Grill (advisory): `.dev/features/loop-driver-spike/GRILL.md`.
- The record: `.dev/features/loop-driver-spike/RECORD.md`. Its verdict is **no-go**, and its §7 gives the reasons and
  what would reopen it.

changelog-entry: exit 0

lesson: none — one candidate was proposed in REVIEW.md, but this delegated run has no person to take it to
`/pharn-dev-memory-promote`'s gate, and the model never self-promotes; it is listed below for a human.

deferred:

- stream-json `output_tokens` under-reports a request: 278 against 14,006 in `driver-1`'s spec session. So a
  measurement reads per-request tokens from the transcript with the ledger's reader. Source: REVIEW.md "Proposed
  lesson candidate", RECORD.md §4.

_Chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate._
