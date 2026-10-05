# SHIP — front-grill-concurrent

This is the `/pharn-dev-ship` roll-up for batch item 8 of the 2026-10-05 "make `/pharn-loop` fast" batch. It records
that the chain ran and the floor verdicts it read. It is not an approval, and not a seal.

## Who decided what

The batch ran unattended under the user's delegation.

- **GATE 1** — the batch's orchestrating model approved it under that delegation on 2026-10-05; it was not a human
  approval. The orchestrator also added scope:
  - (1) apply checkers-first to `/pharn-ship` too;
  - (2) accept grill ‖ test concurrency as infeasible (follow-up `front-grill-concurrent-agents`);
  - (3) **adopt option 3**: `/pharn-loop`'s full grill becomes `floor-only`;
  - version 6.45.0, pre-assigned; the PR targets `main`.
- **Review dispositions** ("fix all", including the revised R2 decision to keep the `scan-plan-*` scanners) were also
  the orchestrator's decisions under that delegation.
- **merge: left to the maintainer.** PR #317, base `main`.

## Where the run ended

**GATE 2: PR #317 is open and the review fixes are pushed.**

1. **`/pharn-dev-plan`** — `check-plan-lessons.mjs` exit 0. The plan was amended at GATE 1, then again for the grill
   findings and the review findings.
2. **GATE 1** — approved with added scope by the orchestrator under delegation.
3. **`/pharn-dev-grill`** — Step 1b exit **0**, so proceed. 5 advisory concerns, all 5 taken (`GRILL.md`; PLAN
   "Grill amendments").
4. **`/pharn-dev-build`** — `validate.mjs` exit **0**; `npm run check` GREEN (4,653 tests).
5. **`/pharn-dev-regress`** — `.verdict` **`no-regressions`** against base `d8fd005` (4,322 outside tests), so
   proceed.
6. **`/pharn-dev-verify`** — `.verdict` **`PASS`**, so proceed.
7. **Merges and PR**
   - Merged `origin/main` ab0b11c (6.39.0) and opened PR #317.
   - Merged `origin/main` 7696477 (6.40.0); its `[Unreleased]` entry was already in 6.40.0.
   - Merged `origin/main` c62999a (6.42.0, entry gates).
     - Its `entry-gates.test.mjs` wiring test anchored the loop's wait line on the grill's `read` line, which this
       change removes. CI `check` and `floor` failed on exactly that one test, and local `npm test` showed 4,778/4,779.
     - The anchor moved to the grill's stage-start marker. The test now passes; the `docs:generate` README count is 120.
   - CI `check` and `floor` pass. CodeQL `Analyze` was cancelled at 15 min before any step ran; the same happened on
     `main`'s own run. A rerun was queued; no step of this PR failed.
8. **Independent review** of `cfb7158` — 0 floor-gate findings and 5 advisory findings (R1–R5), all fixed
   (`REVIEW.md`).
9. **Fix pass `aa7438c`**
   - Validate GREEN.
   - `/pharn-dev-verify` `.verdict` **`PASS`**: 4,734 tests; `reconcile` CLEAN; `lint:md` re-run after removing a
     gitignored scratch fixture (`VERIFY.md`).
   - `check-changelog-entry --merge-base origin/main`: GREEN.
   - **Not re-run for the fix pass:** `/pharn-dev-regress`. The fixes add a new floor module and its test, and touch
     this feature's own commands and docs; the whole suite is GREEN on the fixed tree.

## Structural verdicts read, verbatim

| stage                | read                          | build              | fix pass     |
| -------------------- | ----------------------------- | ------------------ | ------------ |
| `/pharn-dev-grill`   | `check-plan-lessons.mjs` exit | `0`                | `0`          |
| `/pharn-dev-build`   | `validate.mjs` exit           | `0`                | `0`          |
| `/pharn-dev-regress` | `.verdict`                    | `"no-regressions"` | (not re-run) |
| `/pharn-dev-verify`  | `.verdict`                    | `"PASS"`           | `"PASS"`     |

## Pointers

- **Pipeline records:** plan `PLAN.md`; grill `GRILL.md`; build `BUILD.md`; regress `REGRESSION.md`; verify
  `VERIFY.md`; review `REVIEW.md` (the independent reviewer's findings, quoted as DATA).
- **Trusted-doc wording for a human:** `PROTECTED-FOLLOWUPS.md` — `LIMITS.md §3a` and `§5`, `THREAT-MODEL.md §1`,
  and `ARCHITECTURE.md §6` (optional). All four are incomplete; none is an overclaim.
- **Evidence:** `.dev/measurements/loop-wall-clock-2026-10-05.md` §2, and pharn-starter's `cost.json` ledgers (read
  only).

## Recorded lines

changelog-entry: exit 0

lesson: skipped — the orchestrator declined promotion during the unattended batch (parallel PRs collide on lesson
ids). No candidate clears L20's bar: R2 was a one-time design-scope correction.

deferred: none

follow-ups: `front-grill-concurrent-agents` (grill ‖ test agents; now relevant to `/pharn-ship` only)
