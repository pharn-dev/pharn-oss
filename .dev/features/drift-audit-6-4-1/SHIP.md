# SHIP — drift-audit-6-4-1

A thin, **advisory** roll-up of one gated `/pharn-dev-ship` run. It records that the chain ran and what each floor verdict read; it is not a self-issued "shipped", an approval, or a `PHARN ✓ reviewed` seal.

## Stages that ran, in order, and where the run ended

`/pharn-dev-plan` → **GATE 1** (approved as written) → `/pharn-dev-grill` (run 1) → a scope question to the maintainer, who chose to amend → `/pharn-dev-plan` amended (v2) → **GATE 1 again** (approved as written) → `/pharn-dev-grill` (run 2) → `/pharn-dev-build` → `/pharn-dev-regress` → `/pharn-dev-verify` → `/pharn-dev-review` → Step 2b lesson-extract (promoted) → this roll-up.

**The run ended at GATE 2**, not at a RED-verdict STOP. No stage's floor verdict came back non-GREEN.

## Structural verdicts read, verbatim

| stage                | verdict read                                                                              | value                                  |
| -------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------- |
| `/pharn-dev-grill`   | `check-plan-lessons.mjs` exit code (both runs; the only deterministic stop in that stage) | `0`                                    |
| `/pharn-dev-build`   | `node pharn/floor/validate.mjs .` exit code                                               | `0` (`FLOOR: GREEN — 36 capabilities`) |
| `/pharn-dev-regress` | `regression-report.json` `.verdict`                                                       | `"no-regressions"`                     |
| `/pharn-dev-verify`  | `verify-report.json` `.verdict`                                                           | `"PASS"` (all seven gates `0`)         |

`/pharn-dev-review` has no structural verdict and this roll-up does not invent one: `REVIEW.md` is advisory.

## Pointers (not restated here)

- `REVIEW.md` — 0 floor-gate findings, 3 advisory findings (A1–A3), an errata section, and the lesson candidate.
- `GRILL.md` — run 2, with run 1's five concerns and their dispositions preserved.
- `PLAN.md` — the approved v2. Its Trigger rows 8 and 9 over-attribute the cause of two dead cites; that is corrected in `REVIEW.md`'s errata and in the CHANGELOG, and the plan is left as approved.
- `proposed/APPLY.md` — the human-apply hand-off and the L26 verification record.

## Changes made to the tree after `/pharn-dev-verify` ran — stated so the verdict above is not read as covering them

Three things landed after the verify verdict was computed. None is executable, but they are listed because "verify PASS" describes the tree as it was, not as it now is.

1. **A CHANGELOG correction.** The entry over-attributed two dead cites to #166; it now states three origins. The gates a prose edit to that file can affect were re-run GREEN.
2. **`REVIEW.md` labels and an errata section.**
3. **`lesson: promoted L50`** — one entry appended to `.dev/memory-bank/lessons-learned.md`, and `docs/lessons-index.md` regenerated. After it, `format:check`, `lint`, `lint:md`, `docs:check`, `check:markers`, `check:badge`, `check:changelog`, `check:contributing`, `validate` and the **full suite** (2169 tests, 0 skipped) were all re-run and are GREEN, and `check-bash-reconcile.mjs` read `CLEAN` with 0 escapes.

## The `lesson:` line

lesson: promoted L50

`L50` was read from the `## L50` heading in canon after the promote returned, not from any printed prose. The promote ran under its own scope and floor checks and halted for its own explicit accept, which was given. The entry is a **pending-remedy** lesson and says so; whether it is true, general and worth canonizing is the human's judgment, not the floor's.

deferred: none

## What is still the human's to do at GATE 2

- **Apply the four patches in `proposed/APPLY.md`, then commit, then run `npm run check`** — in that order. The `6.4.2` bump and the CHANGELOG entry already in the tree assert that those trusted-doc corrections exist, and nothing detects a skipped patch.
- Decide **merge / fix / abandon**. This run performed no git operation: nothing was committed, pushed or sealed.
- Optional follow-ups the review named: A1 (a one-line README wording), and updating the "PENDING" note in `.dev/features/model-routing-limit/proposed/APPLY.md` after the marker patch is applied.
- **Side effects to know about:** the build stage's anchor replaced the stale local reconcile baseline (a copy of the old epoch is in the session scratchpad), and `origin/docs/drift-audit-6.4.1` exists on the remote, empty, from before this run.

_Chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is the human's call at the post-review gate._
