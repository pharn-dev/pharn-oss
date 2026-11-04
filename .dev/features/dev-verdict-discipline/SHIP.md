# SHIP — dev-verdict-discipline

Gated `/pharn-dev-ship`, run by batch worker G5 of the 2026-11-03 review batch. Both gates were decided by the batch
orchestrator (a model) under the owner's delegation — **not human approvals**.

## Stages, in order

1. `/pharn-dev-plan` → `PLAN.md`; `check-plan-lessons.mjs` exit 0 (13 lessons cited).
2. `/pharn-dev-grill` → `GRILL.md`; floor verdict `check-plan-lessons.mjs` exit 0; 7 advisory concerns, all folded into
   the build.
3. **GATE 1** — decided by the batch orchestrator (a model) under the owner's delegation: approved as written,
   decisions 1–4 confirmed, plus two additions (state decision 2's presence-not-coverage bound plainly; convert the
   bare `npx <tool>` lines in `pharn-dev-verify.md` and `pharn-dev-review.md` to `npx --no-install`).
4. `/pharn-dev-build` → `validate` exit **0** (GREEN, 37 capabilities).
5. `/pharn-dev-regress` → `regression-report.json` `.verdict`: **`no-regressions`** (`tests` red at base only — one
   load failure in an untouched file — green at head; `new_failures: []`).
6. `/pharn-dev-verify` (the new stamp path, run on itself) → three STOPs, then PASS. Attempts 1 and 2: INCONCLUSIVE
   `gate-not-measured` (`test` timed out at 570 s). Attempt 3: FAIL, `failing_gates: ["test"]` (the runner's
   `PHARN_TEST_RESULTS` leaked into one test). Each cause was fixed inside the plan's files and the stage re-run from
   `init`; attempt 4: `verify-report.json` `.verdict`: **`PASS`**. None was proceeded past (`VERIFY.md`).
7. `/pharn-dev-review` → `REVIEW.md`: 0 floor findings, 7 advisory (cited, not restated).
8. **GATE 2 (round 1)** — decided by the batch orchestrator (a model) under the owner's delegation: **"fix"** — fold
   four of `REVIEW.md`'s follow-ups into this branch (E1 `gateEnv` strips an inherited `PHARN_TEST_RESULTS`, E2
   `check-verify.mjs` refuses a positional map in any position on the stamp path, E3 a stale test comment, E4 the
   `/pharn-dev-plan` `## Files` sentence).

Three post-GATE-1 corrections to the plan are recorded in `PLAN.md` (its `## Files` lost four later-stage artifacts;
the `run --next` line runs in the background with a one-hour timeout; the `test` token unset `PHARN_TEST_RESULTS`,
until E1 made that the runner's job).

## Round 2 — after GATE 2 "fix"

1. `PLAN.md` "Round 2": six paths joined `## Files` before any write; the plan was committed (`91075f57`);
   `check-plan-lessons.mjs` exit 0.
2. `/pharn-dev-build` Step 0 again (setter, then `--anchor`) on the clean tree; E1–E4 built; `validate` exit **0**
   (GREEN, 37 capabilities). E1's test was mutation-checked (it fails with the `delete` line removed). The `env -u`
   wrapper was removed from `/pharn-dev-verify`.
3. `/pharn-dev-regress` → `regression-report.json` `.verdict`: **`no-regressions`** (base `91075f57`; every outside
   gate 0 → 0; `new_failures: []`).
4. `/pharn-dev-verify` → attempt 1: **FAIL**, `failing_gates: ["test"]` — one load failure in
   `pharn/floor/entry-gates.test.mjs` (`5 !== 4`), green re-run alone (49/49). Stage re-run from `init`; attempt 2:
   `verify-report.json` `.verdict`: **`PASS`**, with the plain `npm test` token. Not proceeded past (`VERIFY.md`).
5. `/pharn-dev-review` → `REVIEW.md` "Round 2": the four findings fixed, no new finding.
6. **GATE 2 (round 2)** — handed to the batch orchestrator with this record.

The verdict block below is round 2's. `check:surface-bump` reds on this branch now (two `pharn/floor/*.mjs` files
changed, no bump), which the batch expects; the orchestrator bumps once at the end.

Advisory artifacts: `GRILL.md`, `REVIEW.md`.

verdict-grill: exit 0
verdict-build: exit 0
verdict-regress: no-regressions
verdict-verify: PASS
run-ended: GATE 2

changelog-entry: exit 0

lesson: skipped — a candidate is proposed in `REVIEW.md` ("Proposed lesson candidate"); this batch worker does not
promote canon, and whether it goes to `/pharn-dev-memory-promote` is the batch orchestrator's call.

deferred: none

_Chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate._
