# SHIP — build-writes-through-tools

A `/pharn-dev-ship` roll-up for batch item 9 of the 2026-10-05 "make `/pharn-loop` fast" batch. It records that the
chain ran and the floor verdicts it read. It is not an approval, and not a seal.

## Who decided what

The batch ran unattended under the user's delegation:

- **GATE 1** was approved by the batch's orchestrating model, under that delegation, on 2026-10-05. It was not a
  human approval. It chose a patch version and accepted the residual name `write-tool-attribution` (`PLAN.md`,
  "GATE 1 — decisions").
- **The review disposition** ("fix all five") was also the orchestrator's decision under delegation.
- **The merge is the maintainer's.** The user merged PR #305 (squash `4c4c0c5`, released as 6.35.1) **before** the
  independent review's fixes were pushed. This branch, `fix/build-writes-review`, carries those fixes as **6.35.2**.

## Where the run ended

**GATE 2, with the review fixes in a follow-up PR.**

1. **`/pharn-dev-plan`.** `PLAN.md`, opus, in this builder's context. `check-plan-lessons.mjs` exit 0.
2. **GATE 1.** Approved by the orchestrator under delegation.
3. **`/pharn-dev-grill`.** Step 1b, `check-plan-lessons.mjs`: **exit 0** → proceed. It raised 6 advisory concerns
   (0 blocking), all taken (`GRILL.md`).
4. **`/pharn-dev-build`.** Floor: **`validate.mjs` exit 0** → proceed. `npm run check` GREEN.
5. **`/pharn-dev-regress`.** `.verdict` **`no-regressions`** (base `ea0234b`) → proceed.
6. **`/pharn-dev-verify`.** `.verdict` **`PASS`** (7 gates, `reconcile` CLEAN) → proceed.
7. **PR #305 opened against `main`** at the orchestrator's request. CI green. **Merged by the user** before the
   review fixes.
8. **Independent review** of `2026ce4`: 0 floor-gate findings, 5 advisory findings R1–R5, all fixed (`REVIEW.md`).
9. **Fix pass, on `fix/build-writes-review` from `origin/main`.** The fixes are R1–R5. `[6.35.1]` is frozen, so its
   corrections went into a new `[6.35.2]` section.
   - Floor: `validate.mjs` exit 0.
   - `npm run check` GREEN (4,504 tests).
   - `/pharn-dev-verify` `.verdict` **`PASS`**, `reconcile` CLEAN over a fresh epoch.
   - **Not re-run for the fix pass:** `/pharn-dev-regress`. The fixes touch only this feature's own files. The whole
     suite (`npm test`, inside both `npm run check` and verify) is GREEN on the fixed tree.

## Structural verdicts read, verbatim

| stage                | read                          | build (#305)       | fix pass (6.35.2) |
| -------------------- | ----------------------------- | ------------------ | ----------------- |
| `/pharn-dev-grill`   | `check-plan-lessons.mjs` exit | `0`                | (not re-run)      |
| `/pharn-dev-build`   | `validate.mjs` exit           | `0`                | `0`               |
| `/pharn-dev-regress` | `.verdict`                    | `"no-regressions"` | (not re-run)      |
| `/pharn-dev-verify`  | `.verdict`                    | `"PASS"`           | `"PASS"`          |

## Pointers

- Review: `.dev/features/build-writes-through-tools/REVIEW.md` (advisory; the independent reviewer's findings are
  quoted as DATA).
- Grill: `.dev/features/build-writes-through-tools/GRILL.md` (advisory).
- Measurement record: `.dev/measurements/loop-wall-clock-2026-10-05.md`.

## Recorded lines

changelog-entry: exit 0

lesson: skipped — the orchestrator declined lesson promotion during the unattended batch, since parallel PRs would
collide on lesson ids.

deferred: "a rule that forbids a tool must be read against every deny message that recommends that tool" (REVIEW R1,
a first occurrence, so it does not yet clear L20's bar).

## Notes for the human

- **The R1 contradiction shipped in 6.35.1 and is corrected in 6.35.2.** Until 6.35.2 is merged, a routed stage agent
  whose out-of-project scratch write is denied gets two opposite instructions: the brief says never Bash, the deny
  message says Bash.
- **No hook, settings, trusted-doc or `MIN_CLI` change.** The rule stays advisory. The residual
  `write-tool-attribution` is named: closing it needs a PostToolUse record, which is a human-only hook change.
- **A builder slip, disclosed.** During the first build the builder created and at once deleted a stray scratch file
  through Bash. It was never committed, and `reconcile` was CLEAN. Every tracked file was written with the write
  tools.

Chain ran; the named floor verdicts are as shown. This is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate. Merge is left to the maintainer.
