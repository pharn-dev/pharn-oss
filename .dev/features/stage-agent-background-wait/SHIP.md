# SHIP — stage-agent-background-wait

`/pharn-dev-ship`, run by a stage agent in its own worktree, branch `fix/stage-agent-background-wait`.

## GATE 1 — plan acceptance (the human's decision, relayed by the orchestrating session, 2026-10-25)

Approved, every open question answered with the plan's recommendation (verbatim from the human's AskUserQuestion
answers): Q1 "Inside finish (Recommended)"; Q2 "Every call (Recommended)"; Q3 "Yes, TaskStop (Recommended)"; Q4 + Q5
"Approve as planned (Recommended)". Recorded in `PLAN.md`, "GATE 1 — the human's decision".

## The chain — each stage's structural verdict

| stage                | verdict read                           | result                                                  |
| -------------------- | -------------------------------------- | ------------------------------------------------------- |
| `/pharn-dev-grill`   | `check-plan-lessons.mjs` exit          | 0 (GREEN); 5 advisory concerns, 0 blocking-severity     |
| `/pharn-dev-build`   | `node pharn/floor/validate.mjs .` exit | 0 (`FLOOR: GREEN — 37 capabilities`); `npm run check` 0 |
| `/pharn-dev-regress` | `regression-report.json` `.verdict`    | `no-regressions` (base `1d34805c`, 168 outside tests)   |
| `/pharn-dev-verify`  | `verify-report.json` `.verdict`        | `PASS` (7 gates, `reconcile` CLEAN)                     |
| `/pharn-dev-review`  | none (advisory)                        | GREEN — 0 floor findings, 2 advisory, 1 style fix       |

The grill's two important concerns were folded into the build (the backgrounded-`finish` paragraph; the wait tests
assert exits under a spawn timeout, never elapsed time). The review's two advisory findings stand for GATE 2: an
anchor `ts` later than the clock reads `unanchored` (no wait, S9), and the `TaskStop` grant is unscoped.

## GATE 2

Handed to the orchestrating session for the merge / fix / abandon decision. The PR (#393) is opened, never merged, by
this run.

**Decision (the human, relayed by the orchestrating session, 2026-10-25), verbatim:** "GATE 2: accept PR #393 as is;
keep the TaskStop grant and clock-skew points as named follow-ups. I'll merge when CI is green." So: accepted as is,
and the human merges.

Named follow-ups (not built):

- `loop-background-wait-measure` — re-run the interactive `claude --permission-mode auto` `/pharn-loop` attempt on
  6.74.0: does the Agent call omit the parameter and run in the foreground, and when it does not, does `finish` wait
  the agent out (and does TaskStop reach it)?
- `taskstop-grant-scope` — the `TaskStop` grant in `/pharn-loop`'s `allowed-tools` is unscoped: it pre-approves
  stopping any background task of the session, with an operand read from the Agent tool's free text.
- `anchor-clock-skew` — a stage-start marker `ts` later than the clock at `finish` time reads `unanchored`, so a
  background-launched stage gets no wait and stops S9; the `stage-agent-background` residual does not name it.

Lesson: none proposed (the setter's dropped glob bullets are L71, already canon).
