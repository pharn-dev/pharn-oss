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
