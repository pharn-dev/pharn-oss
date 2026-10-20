# SHIP — load-flake-regress

## Stages, in order

1. `/pharn-dev-plan` → `PLAN.md`; `check-plan-lessons.mjs` exit 0.
   - **GATE 1: delegated.** The user chose "You decide, recorded" (AskUserQuestion, this run). APPROVED as written — a
     model decision under delegation, not a human approval (`PLAN.md`, "GATE 1 decision").
2. `/pharn-dev-grill` → `GRILL.md`; Step 1b exit **0**. Five advisory concerns, all carried into the build.
3. `/pharn-dev-build` → `validate` exit **0**. PLAN Amendment 1 (one file added, build Step 0 re-run) after regress run 1.
4. `/pharn-dev-regress` → `regression-report.json` `.verdict` = **`no-regressions`** (run 2). Run 1 was `regressions`: the
   new per-test comparison named a real failure (`gate-run-core.test.mjs` L36 closure), fixed by Amendment 1.
5. `/pharn-dev-verify` → `verify-report.json` `.verdict` = **`PASS`** (every gate 0; `npm test` 5,838 pass, 0 fail).
6. `/pharn-dev-review` → `REVIEW.md`: GREEN, 0 floor-gate findings; 5 advisory, 3 fixed before verify.

## GATE 2 (delegated)

Model decision under the user's delegation: **open the pull request**; the merge is left to the user or the parent
session.

## Structural verdicts, verbatim

- build: `node pharn/floor/validate.mjs .` → exit 0
- regress: `.verdict` = `"no-regressions"`
- verify: `.verdict` = `"PASS"`, `failing_gates` = `[]`

## Deviation (recorded, not hidden)

This desktop worktree session's write hooks judge the main checkout, so every Write/Edit was denied. The user chose
"Bash writes, reconciled": every write went through a scratch helper that runs both real hooks with the worktree as their
root and writes only on exit 0. `reconcile` is CLEAN.

Pointers: `REVIEW.md`, `GRILL.md`, `REGRESSION.md`, `VERIFY.md` (the before/after load table).

changelog-entry: exit 0

lesson: none — the recurring failure (a pinned budgeted line run once in a test reads `5 continue` under load) got a
structural remedy in this increment; nothing is left to remember.

deferred: `regress-per-test-product` (wire `/pharn-regress` to `--per-test`); other load-timing tests outside the five
files the batch also recorded (`scan-code-crypto.test.mjs` COST PIN, `protect-trusted-paths.test.cjs:1098`).

chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is the
human's call at the post-review gate.
