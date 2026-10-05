# SHIP — thin-caller-background-timeout

This is a small follow-up in the 2026-10-05 "make `/pharn-loop` fast" batch. It closes the thin-caller residual that
`orchestrator-direct-stage-calls` named in its SHIP.md. The stages ran as split `/pharn-dev-ship` stages in an isolated
worktree. **Every gate below was decided by the orchestrating model under the user's delegation. None was a human
approval.**

## Stages, in order, and where the run ended

1. `/pharn-dev-plan` → `PLAN.md`. `check-plan-lessons` GREEN, with L31, L37, L50, L60 and L64 cited.
2. **GATE 1:** the orchestrator approved under delegation. It accepted the guard as the named follow-up
   `stage-script-in-flight-guard`, said to fit the bullet inside the byte ceiling, and accepted the 600 s behaviour
   labelled advisory. Recorded in `PLAN.md` under "Decisions (GATE 1)".
3. `/pharn-dev-grill` → `GRILL.md`. `check-plan-lessons` GREEN. Both findings, P5 and P0, were taken as plan
   amendments.
4. `/pharn-dev-build` → `validate` **GREEN**.
5. `/pharn-dev-regress` → `.verdict` **`no-regressions`**, base `936078d`.
6. `/pharn-dev-verify` → **`PASS`**, reconcile `CLEAN`.
7. Merged `origin/main` twice as it moved: #316 (6.44.0), then #317 (6.45.0). Main's CHANGELOG sections were kept
   byte-for-byte, and `[6.46.0]` sits directly above `[6.45.0]`. PR #318 was opened against `main`, and CI is green on
   `e21a279`.
8. Review: the orchestrator read the diff itself, with no separate reviewer agent, and reported no findings.
   Recorded in `REVIEW.md`.
9. **GATE 2:** the orchestrator decided under the user's delegation. **Merge: by the orchestrator, under the user's
   authorisation.**

## What shipped

- `/pharn-regress` and `/pharn-verify` say that a call the Bash tool reports as moved to the background is STILL
  RUNNING:
  - wait for its completion notice and branch on the exit code it reports, never on the notice's wording;
  - never run `--resume` or another fresh line while it runs;
  - resume a call once, and only when it is gone;
  - when unsure, stop and say so.
- `stage-exit.md` no longer gives "a harness timeout" as its example of a kill. A new paragraph, labelled ADVISORY,
  says a Bash-tool timeout does not kill the script.
- `command-hygiene.test.mjs` adds the `THIN_CALLER_BACKGROUND` pin.

## Gate records

- `changelog-entry: exit 0`
- `lesson: skipped`: the orchestrator declined promotion during the unattended batch, because parallel PRs collide on
  lesson ids.
- deferred:
  - A lesson candidate that clears L20's bar, since this is its second occurrence after #314's R1: "A Bash-tool call
    at its timeout is moved to the background, not killed — every 'on timeout, resume/retry' instruction starts a
    concurrent second run; sweep all such prose." It is held for a later `/pharn-dev-memory-promote`.
  - The follow-up `stage-script-in-flight-guard`.

## Named residuals

- The stage scripts, when called directly, take no in-flight lock (`stage-script-in-flight-guard`).
- `TIMEOUT_RESUME` catches one spelling only.
