# SHIP — loop-autonomous

An advisory roll-up of the `/pharn-dev-ship` run that rebuilt the product `/pharn-loop` as an unattended run.
Nothing was committed, pushed or merged; the work is an uncommitted working tree on `feat/loop-autonomous`
over `9bafa0e7fd2593b7efc2f8c8acca64adf34dd6fb`.

## Stages, in order, and where the run ended

1. **`/pharn-dev-plan`** — written in an earlier session on 2026-09-14, which halted at GATE 1 with two open
   questions.
2. **GATE 1 (human)** — approved; major bump to `6.0.0`; commit on `STOP_GREEN` only.
3. **`/pharn-dev-grill`** — 21 advisory concerns, 2 of blocking severity (`GRILL.md`). The human chose to
   revise the plan before building and decided three more questions (a reconcile red is terminal; the SPEC
   reverts to `Draft` unless the stop is a committed `STOP_GREEN`).
4. **`/pharn-dev-build`** — 11 planned files; floor GREEN.
5. **`/pharn-dev-regress`** — `no-regressions`.
6. **`/pharn-dev-verify`** — `PASS`, reconcile `CLEAN`.
7. **`/pharn-dev-review`** — GREEN, 0 floor-gate findings, 10 advisory (5 important) (`REVIEW.md`).
8. **GATE 2 (human)** — **fix now**. Every finding was addressed inside the plan's `## Files`; `/pharn-dev-regress`
   and `/pharn-dev-verify` were re-run and `REVIEW.md` records each disposition.
9. **Step 2b** — the proposed lesson was promoted through `/pharn-dev-memory-promote` at its own gate.

**Where the run ended: GATE 2**, after the fix pass. The merge / abandon decision is the human's.

## Structural verdicts read, verbatim

| stage                         | verdict source                      | value            |
| ----------------------------- | ----------------------------------- | ---------------- |
| `/pharn-dev-grill`            | `check-plan-lessons.mjs` exit       | `0`              |
| `/pharn-dev-build`            | `pharn/floor/validate.mjs .` exit   | `0`              |
| `/pharn-dev-regress` (re-run) | `regression-report.json` `.verdict` | `no-regressions` |
| `/pharn-dev-verify` (re-run)  | `verify-report.json` `.verdict`     | `PASS`           |

Pointers, not restatements: `.dev/features/loop-autonomous/GRILL.md` (advisory) and
`.dev/features/loop-autonomous/REVIEW.md`.

lesson: promoted L44

deferred:

- Pathspecs built from an untrusted list must be literal (`GIT_LITERAL_PATHSPECS=1`) — the second candidate
  `REVIEW.md` surfaced; the fix is applied in `/pharn-loop`, the lesson is not promoted.

## Follow-ups this run could not close

- **`LIMITS.md §1d` needs a human edit.** It still describes a self-stamped `Approved` only as a forgery; a
  shipped command now does it by design. Human-only (fix #2).
- **`CLAUDE.md:211`** still says `/pharn-loop` writes `LOOP.md` "at every stop"; outside this plan's `## Files`.
- **`/pharn-verify`'s trust note** treats project gate commands as user-trusted on the premise of
  human-approved intent, which an unattended `/pharn-loop` run does not satisfy.

Chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or
wise; that is the human's call at the post-review gate.
