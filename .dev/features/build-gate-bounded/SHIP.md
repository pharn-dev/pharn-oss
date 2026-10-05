# SHIP — build-gate-bounded

A `/pharn-dev-ship` roll-up for batch item 6 of the 2026-10-05 "make `/pharn-loop` fast" batch. It records that the
chain ran and the floor verdicts it read. It is not an approval, and not a seal.

## Who decided what

The batch ran unattended under the user's delegation:

- **GATE 1** was approved by the batch's orchestrating model, under that delegation, on 2026-10-05 — not a human
  approval. Q1 merge `gate-exclusion-config` first; Q2 keep `build` in the full run; Q3 accept the ship behaviour change
  (`PLAN.md`, "GATE-1 answers").
- **The review disposition** ("fix all seven") was also the orchestrator's decision under delegation.
- **merge: left to the maintainer.** PR #309, base `main`.

## Where the run ended

**GATE 2, PR #309 open with the review fixes pushed.**

1. **`/pharn-dev-plan`.** `check-plan-lessons.mjs` exit 0.
2. **GATE 1.** Approved by the orchestrator under delegation.
3. **`/pharn-dev-grill`.** Step 1b exit **0** → proceed; 10 advisory concerns, 9 taken, 1 declined (`GRILL.md`).
4. **`/pharn-dev-build`.** `validate.mjs` exit **0**; `npm run check` GREEN.
5. **`/pharn-dev-regress`.** `.verdict` **`no-regressions`** (base `f6174ae`, the merged gate-exclusion tip; a first
   run's unreproduced head red is recorded in `REGRESSION.md`) → proceed.
6. **`/pharn-dev-verify`.** `.verdict` **`PASS`** → proceed.
7. **Stacked and PR #309 opened** (base then `feat/regress-pre-run-snapshot`, now `main`); CI green.
8. **Independent review** of `fb33d07`: 0 floor-gate findings, 7 advisory findings R1–R7, all fixed (`REVIEW.md`).
9. **Fix pass** `1c10537`, merged with `origin/main` 6.38.1 and renumbered to **6.39.0** (`4fa9dd7`).
   - `/pharn-dev-verify` `.verdict` **`PASS`** (test 4,688/4,688; `reconcile` CLEAN over an empty window, stated in
     `VERIFY.md`).
   - `check-changelog-entry --merge-base origin/main`: GREEN.
   - **Not re-run for the fix pass:** `/pharn-dev-regress`. The fixes touch only this feature's own files and
     `pharn-ship.md`'s one sentence; the whole suite is GREEN on the fixed tree.

## Structural verdicts read, verbatim

| stage                | read                          | build              | fix pass (6.39.0) |
| -------------------- | ----------------------------- | ------------------ | ----------------- |
| `/pharn-dev-grill`   | `check-plan-lessons.mjs` exit | `0`                | `0`               |
| `/pharn-dev-build`   | `validate.mjs` exit           | `0`                | `0`               |
| `/pharn-dev-regress` | `.verdict`                    | `"no-regressions"` | (not re-run)      |
| `/pharn-dev-verify`  | `.verdict`                    | `"PASS"`           | `"PASS"`          |

## Pointers

- Plan: `.dev/features/build-gate-bounded/PLAN.md`; grill `GRILL.md`; review `REVIEW.md` (the independent
  reviewer's findings quoted as DATA).
- Evidence: `.dev/measurements/loop-wall-clock-2026-10-05.md`.
- Follow-up: `build-gate-execution-reuse`.

## Recorded lines

changelog-entry: exit 0

lesson: none — no candidate clears L20's bar (the R3 cap-accounting slip is a first occurrence).
