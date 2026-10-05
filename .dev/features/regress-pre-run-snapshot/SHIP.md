# SHIP — regress-pre-run-snapshot

Batch item 2 of the 2026-10-05 "make `/pharn-loop` fast" batch, run as split `/pharn-dev-ship` stages in an isolated
worktree. **Every gate below was decided by the orchestrating model under the user's delegation — never a human
approval.**

## Stages, in order, and where the run ended

1. `/pharn-dev-plan` → `PLAN.md` (`check-plan-lessons`: GREEN).
2. **GATE 1** — approved by the orchestrator (delegated). Its three answers are recorded in `PLAN.md` ("GATE 1 and grill
   amendments"): escape set only, STOP on a failed capture, and the porcelain line kept.
3. `/pharn-dev-grill` → `GRILL.md`. Step 1b `check-plan-lessons`: GREEN. Interrogation: 15 advisory concerns,
   applied as plan amendments except #6, which GATE 1's answer decided.
4. `/pharn-dev-build` → floor `validate`: **exit 0** (GREEN). One build amendment added
   `.dev/floor/command-hygiene.test.mjs` to the plan's Files.
5. `/pharn-dev-regress` → `regression-report.json` `.verdict`: **`no-regressions`**.
6. `/pharn-dev-verify` (iteration 1) → `verify-report.json` `.verdict`: **`PASS`**.
7. Stacked by merge (never rebase): onto `feat/gate-exclusion-config`, then re-stacked onto `main` after #305 (6.35.1),
   #306 (6.35.2) and #307 (6.36.0) merged. The version became **6.37.0**. Each merge kept `main`'s sections
   byte-for-byte.
8. Independent review (a separate Opus agent, relayed by the orchestrator) → `REVIEW.md`: 0 floor-gate findings and
   5 advisory findings (R1–R5), all fixed.
9. `/pharn-dev-verify` (iteration 2, after the fixes) → `verify-report.json` `.verdict`: **`PASS`** (4595 tests).
10. **GATE 2** — the PR is opened against `main`. **merge: left to the maintainer.**

## Records

- Pointers: `PLAN.md`, `GRILL.md`, `REGRESSION.md`, `VERIFY.md`, `REVIEW.md`, `PROTECTED-FOLLOWUPS.md` (cited, not
  restated).
- changelog-entry: exit 0
- lesson: skipped — the orchestrator declined promotion during the unattended batch (parallel PRs collide on lesson
  ids).
- deferred:
  - an addition to L37's provenance: R3 was L37's class recurring, a ★ HOOK test title restating a two-guard bound
    only its main-checkout half had probed (`REVIEW.md`, "Lesson candidate").
- PROTECTED-FOLLOWUPS: `LIMITS.md` §6 ("Older partial backstop", a fifth bound) and §3a ("a changed file" → "a file
  the run changed"). They are human-only edits, proposed with exact current and replacement text.
- Named follow-ups: `regress-base-pre-run-overlay` and `pre-run-snapshot-single-source`.

_chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate._
