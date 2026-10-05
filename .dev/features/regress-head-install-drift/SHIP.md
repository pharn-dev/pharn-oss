# SHIP — regress-head-install-drift

This is batch item 4 of the 2026-10-05 "make `/pharn-loop` fast" batch, run as split `/pharn-dev-ship` stages in an
isolated worktree. **Every gate below was decided by the orchestrating model under the user's delegation — never a
human approval.**

## Stages, in order, and where the run ended

1. `/pharn-dev-plan` → `PLAN.md` (`check-plan-lessons`: GREEN).
2. **GATE 1** — approved with one change by the orchestrator (delegated). An absent `dev`/`peer`/`optional`/
   `devOptional` entry is `missing_unchecked`, never drift. Every `not-checked` state fails open. Option (b) is
   declined and named as a follow-up. This is recorded in `PLAN.md`, "GATE 1".
3. `/pharn-dev-grill` → `GRILL.md`.
   - Step 1b `check-plan-lessons`: GREEN.
   - 13 grillers applied inline. They raised 7 advisory concerns: 5 were taken as plan amendments, and G4 and G7 were
     declined with reasons.
4. `/pharn-dev-build` → floor `validate`: **exit 0** (GREEN).
   - One build amendment added `.dev/floor/command-hygiene.test.mjs` to the plan's `## Files`, with `--amend-scope`
     (L48).
5. `/pharn-dev-regress` → `regression-report.json` `.verdict`: **`no-regressions`**.
6. Merged `origin/main` d8fd005 (6.38.1), resolving conflicts by keeping both sides. The provisional version went from
   6.41.0 to 6.42.0.
7. `/pharn-dev-verify` (iteration 1) → **`PASS`** (4683 tests).
8. Pushed; PR #312 opened against `main`. The orchestrator then assigned the version **6.40.0**, renumbered by diff.
9. Independent review (a separate Opus agent, relayed by the orchestrator) → `REVIEW.md`. It reported 0 floor-gate
   findings and 5 advisory findings (R1–R5), all fixed.
   - R1 refines GATE 1's rule: an absent member of a dev/peer/devOptional class that was installed is now drift.
10. Merged `origin/main` 43c09ba (6.39.0, #309), with `[6.39.0]` kept directly below `[6.40.0]`.
11. `/pharn-dev-verify` (iteration 2, after the fixes and the merge) → `verify-report.json` `.verdict`: **`PASS`**
    (4723 tests).
12. **GATE 2** — PR #312 is open against `main`. **Merge: left to the maintainer, or to the orchestrator under the
    user's stated authorisation to merge green PRs.**

## Records

- Pointers (cited, not restated): `PLAN.md`, `GRILL.md`, `BUILD.md`, `REGRESSION.md`, `VERIFY.md`, `REVIEW.md`.
- changelog-entry: exit 0 (`--merge-base origin/main`).
- lesson: skipped. The orchestrator declined promotion during the unattended batch, because parallel PRs collide on
  lesson ids.
- deferred:
  - When a refusal exempts a class of entries to avoid a permanent stop, the exemption should be conditioned on
    evidence that the class was omitted, not on the class itself (REVIEW.md, "Lesson candidate"). This is its first
    occurrence, below L20's bar.
- PROTECTED-FOLLOWUPS: none. No trusted-doc sentence is made stale by this change.
- Named follow-ups:
  - `entry-preflight-install-drift`: call the exported `readInstallCheck` at `/pharn-loop` and `/pharn-ship` entry.
  - `head-install-opt-in`: an opt-in install at HEAD, declined here.

_chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate._
