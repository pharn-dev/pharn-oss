# SHIP — loop-closeout-script

A `/pharn-dev-ship` roll-up for batch item 7 (audit candidate C2) of the 2026-10-05 "make `/pharn-loop` fast" batch. It
records that the chain ran and the floor verdicts it read. It is not an approval, and not a seal.

## Who decided what

The batch ran unattended under the user's delegation:

- **GATE 1** was approved by the batch's orchestrating model, under that delegation, on 2026-10-05 — not a human
  approval. Q1: proceed, and record that C2's pre-registered bar (orchestrator requests ≥ 20% of a run's) was met in
  **1 of 3** real runs (15.2 / 14.9 / 21.2%), that the measured 92-minute run's blocked close saves about one request,
  and that C2 is adopted because the user asked for item 7 and because the commit path becomes tested code. Q2: the
  test re-points accepted. Q3: a crash's presentation made explicit. Q4, Q5: accepted bounds (`PLAN.md`, "GATE 1").
- **The review disposition** ("fix all") was the orchestrator's decision under delegation.
- **Stacking was dropped** by the orchestrator mid-run: the PR targets `main`, version **6.44.0** (assigned; 6.43.0 is
  held for #314).
- **merge: left to the maintainer.** PR #316, base `main`.

## Where the run ended

**GATE 2, PR #316 open with the review fixes pushed.**

1. **`/pharn-dev-plan`.** `check-plan-lessons.mjs` exit 0.
2. **GATE 1.** Approved by the orchestrator under delegation.
3. **`/pharn-dev-grill`.** Step 1b exit **0** → proceed; 7 advisory concerns, 6 taken, G2 declined (P7) (`GRILL.md`).
4. **`/pharn-dev-build`.** `validate.mjs` exit **0**; `npm run check` GREEN. `origin/main` merged three times during
   the run (6.38.1; 6.39.0 with #309, every build-gate file taken as main's; 6.40.0), the baseline re-anchored after
   each merge (`BUILD.md`).
5. **`/pharn-dev-regress`.** `.verdict` **`no-regressions`** (base `43c09ba`; 127 outside test files, `validate`, the
   trust-fence structural pair, 0 → 0 each).
6. **`/pharn-dev-verify`.** `.verdict` **`PASS`** (7 gates, 4,739 tests).
7. **PR #316 opened** against `main`. CI's `check` and `floor` jobs were cancelled twice after 15 minutes with **no
   runner assigned** (0 steps) — a runner-availability failure, not a test result; gitleaks, CodeQL and Socket passed.
8. **Independent review** of `6d1f19e`: 0 floor-gate findings, 8 advisory findings R1–R8, all fixed (`REVIEW.md`).
9. **Fix pass** `be3526d`: `/pharn-dev-verify` `.verdict` **`PASS`** (4,778 tests). Then `origin/main` merged at
   `c62999a` (6.42.0, #313; one conflict in `pharn-ship-quick.md` item 3, both edits kept) and renumbered 6.44.0:
   `npm run check` exit 0 over 4,823 tests.
   - **Not re-run for the fix pass:** `/pharn-dev-regress`. The fixes touch only this feature's own files and
     `pharn-ship-quick.md`'s two items; the whole suite is GREEN on the fixed, merged tree.

## Structural verdicts read, verbatim

| stage                | read                          | build              | fix pass (6.44.0) |
| -------------------- | ----------------------------- | ------------------ | ----------------- |
| `/pharn-dev-grill`   | `check-plan-lessons.mjs` exit | `0`                | `0`               |
| `/pharn-dev-build`   | `validate.mjs` exit           | `0`                | `0`               |
| `/pharn-dev-regress` | `.verdict`                    | `"no-regressions"` | (not re-run)      |
| `/pharn-dev-verify`  | `.verdict`                    | `"PASS"`           | `"PASS"`          |

## The saving, as recorded (advisory estimate)

−14 requests per green `/pharn-loop` stop (≈ 46 s, ≈ 7.0M opus cache-read tokens at the measured close context), −8 on
a non-green stop, −7 on a blocked one, −5 per `/pharn-ship` exit; on the measured 92-minute run itself, about one
request (≈ 2 s). Arithmetic: `PLAN.md`, "Saving".

## Pointers

- Plan `PLAN.md`; grill `GRILL.md`; build `BUILD.md`; regress `REGRESSION.md`; verify `VERIFY.md`; review `REVIEW.md`
  (the independent reviewer's findings quoted as DATA).
- Evidence: `.dev/measurements/loop-wall-clock-2026-10-05.md`, `.dev/measurements/pipeline-performance-audit-2026-09-29.md`.

## Recorded lines

changelog-entry: exit 0

lesson: skipped — the batch orchestrator declined promotion during the unattended batch (parallel PRs collide on
lesson ids).

deferred:

- a Bash call past the tool timeout is moved to the background, not killed — so command prose that calls an overrun a
  "crash" must not assume the process stopped, and a re-run while it runs doubles its side effects (found by this
  increment's review and by another review in the batch; it may clear L20's bar).

chain ran; the named floor verdicts are as shown; GATE 1 and the review disposition were decided by the orchestrating
model under the user's delegation — this is NOT a judgment that the increment is good or wise; that is the maintainer's
call at the merge.
