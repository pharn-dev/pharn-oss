# SHIP — orchestrator-direct-stage-calls

This is batch item 7 of the 2026-10-05 "make `/pharn-loop` fast" batch (audit candidates C3 and C1, plus finding 7),
run as split `/pharn-dev-ship` stages in an isolated worktree. **Every gate below was decided by the orchestrating model
under the user's delegation — never a human approval.**

## Stages, in order, and where the run ended

1. `/pharn-dev-plan` → `PLAN.md` (`check-plan-lessons`: GREEN; 13 lessons cited, each with a body line).
2. **GATE 1** — approved by the orchestrator (delegated): ship BOTH C3 and C1. Recorded in `PLAN.md`, "GATE 1".
3. `/pharn-dev-grill` → `GRILL.md`. `check-plan-lessons` GREEN; findings G1–G8 were all taken as plan amendments.
4. `/pharn-dev-build` → floor `validate`: **GREEN**.
5. `/pharn-dev-regress` → `regression-report.json` `.verdict`: **`no-regressions`** (base `d40667d`).
6. `/pharn-dev-verify` (iteration 1) → **`PASS`** (reconcile `CLEAN`, 23 paths).
7. Merged `origin/main` three times as main moved: #309 (6.39.0), #315 (apparatus), #312 (6.40.0). Each merge kept
   main's CHANGELOG sections byte-for-byte below this one. PR #314 was opened against `main`.
8. Independent review of `20f4e9c` (a separate Opus agent, relayed by the orchestrator) → `REVIEW.md`. It reported
   0 floor-gate findings and 5 advisory findings (R1–R5). The owner's decision was to fix all five, and all five
   were fixed.
9. `/pharn-dev-verify` (iteration 2, after the fixes) → **`PASS`**. The reconcile anchor was re-taken at the fix
   iteration's start (disclosed in `VERIFY.md`); `CLEAN`, 12 paths.
10. Merged `origin/main` `c62999a` (#313, 6.42.0). The version was renumbered 6.41.0 → **6.43.0** by diff, the
    `entry-gates.test.mjs` anchors moved to the new lines, and two byte ceilings were raised by the rule.
11. Pushed to PR #314. **Merge: left to the maintainer.**

## What shipped

- **C3:** `pharn/floor/stage-direct.mjs` (+ core). `/pharn-loop` and `/pharn-ship` run `/pharn-regress` and
  `/pharn-verify` as one tested call each, which handles the scope, the markers, the script and the release. Since
  R1 it also holds an in-flight lock.
- **C1:** `stage-agent.mjs start` / `finish`. Each routed stage's four pinned lines become two, and no shell line
  carries a model-typed route token. Since R3, a fixed-literal fallback marker covers a crashed `start`.
- **Finding 7** is recorded in `check-model-config.mjs`'s TURN SCOPE header and as one advisory line in each
  orchestrator.

## Honest numbers (unchanged from GATE 1)

- **C1's pre-registered bar was NOT met.** The bar was orchestrator-role requests ≥ 20% of a run's requests; it held
  in 1 of 3 real runs (15.2% / 14.9% / 21.2%). C1 was adopted because the user asked for item 7 to be addressed, and
  because it removes a model-typed route token from every shell line.
- **The saving:** about 10 requests ≈ 44 s on the measured 92-minute run. 36,640 B per iteration is no longer
  injected, about 209k cache-read tokens (an estimate). It does not move the hour.

## Named residuals

- The thin callers `/pharn-regress` and `/pharn-verify` still tell a person to resume once after "the Bash tool
  itself timed out". That is the same misreading as R1, outside this increment and outside the owner's five decisions.
- pharn-cli's vendored copy of `check-model-config.mjs`, pinned by sha256, lags this header-only edit.
- The lock sees only `stage-direct.mjs` calls, and a reused pid reads as alive, so that call refuses (fail-closed).

## Lesson

Promotion: **skipped (none proposed)**. The R1 fact — a Bash call at the tool's timeout is backgrounded, not killed —
is a candidate for a later `/pharn-dev-memory-promote` if it recurs (L20). It is recorded here only.
