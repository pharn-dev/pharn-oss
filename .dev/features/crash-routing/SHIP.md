# SHIP — crash-routing

`/pharn-dev-ship` roll-up (gated mode, advisory). Two follow-ups 6.20.6 named (`loop-fresh-load-crash`,
`nested-child-crash`) and the straddle test 6.20.8's review asked for, closed in one increment and released as
**6.21.1**. Each gap was reproduced before the fix (PLAN.md, "Trigger").

## Stages that ran, in order, and where the run ended

| stage              | structural verdict read                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------ |
| /pharn-dev-plan    | GATE 1 (delegated, below); `check-plan-lessons.mjs` exit 0 (12 ids)                              |
| /pharn-dev-grill   | `check-plan-lessons.mjs` exit 0 → proceed; interrogation advisory ([`GRILL.md`](./GRILL.md))     |
| /pharn-dev-build   | `validate` exit **0** (GREEN)                                                                    |
| /pharn-dev-regress | `regression-report.json` `.verdict` = **`no-regressions`** (iteration 2, base `cf90897`)         |
| /pharn-dev-verify  | `verify-report.json` `.verdict` = **`PASS`** (iteration 2)                                       |
| /pharn-dev-review  | no structural verdict; [`REVIEW.md`](./REVIEW.md): GREEN, 0 floor-gate findings open after fixes |

The run ended at **GATE 2**. Before it, three things were iterated inside the approved plan's `## Files`, each recorded
in its stage's artifact:

- **Grill → plan amendment.** An inline pass and an independent read-only agent raised 14 concerns (GRILL.md). The
  plan's `## Amended after grill` took 13 and answered 1. The sharpest: the planned straddle test would not have caught
  the one straddle-specific mutation. The measured mutation now turns every world into a false STOP (BUILD.md). The
  grill also added `.claude/commands/pharn-ship.md` to the Files, so the build scope was re-set and amended onto the
  open reconciliation epoch.
- **Review → fixes → regress and verify re-run.** The independent reviewer found 1 important and 6 minor defects
  (REVIEW.md). The important one: the entry checked the in-memory object, so a RERUN with `stage_to_rerun: undefined`
  printed as exit 1 with no stage, the defect this increment closes. All seven were fixed. Regress iteration 2:
  `no-regressions` (2,917 / 2,917 outside tests at base and head). Verify iteration 2: `PASS` (3,308 / 3,308 tests,
  reconcile `CLEAN`).
- One scratch defect was caught by the reproduction script before any test existed: the stderr-excerpt regex could
  not match a plain `Error:` line (BUILD.md).

Deciding to fix and re-run rather than stop at GATE 2 with open review findings was a model decision under the
delegation below.

## Delegated gates (model decisions — NOT human approvals)

The user's instruction for this run: _"Use one `/pharn-dev-ship` increment … Open a PR and merge it only when CI is
green and the user has asked for it."_ It was read together with their standing preference for queued
`/pharn-dev-ship` prompts: plan approval delegated, and every delegated gate recorded as a model decision.

- **GATE 1 (plan):** approved by the model, with two corrections applied at build (PLAN.md, "GATE 1"). The plan was
  later amended after the grill. The independent grill agent flagged that this approval rests on a quoted instruction
  it could not verify, and that the plan changed after approval. Both are true, and the final report tells the user.
- **GATE 2 (merge / fix / abandon):** the model chose **fix** for the seven review findings (done), then **open a pull
  request**. **The merge is NOT delegated.** It waits for CI to be green and for the user to ask for it explicitly.

## Lines

- changelog-entry: exit 0
- lesson: none — the reviewer's candidate ("validate the bytes you emit, not the object you built") is a first
  occurrence of its class: L5 covers the input side, and L20's bar is a second occurrence. Its remedy already shipped as
  code plus a test (the entry judges its parsed-back output), not as discipline to remember. Nothing was written to
  canon.
- deferred: the reviewer's candidate above. If an output-boundary check that validates an object instead of its
  serialized bytes recurs, promote it through `/pharn-dev-memory-promote`, citing
  `.dev/features/crash-routing/REVIEW.md` finding 1.

## Recorded follow-ups (stated in headers and the contract, not built — P7)

- A crash one level below the shelled checkers (`check-spec-approved.mjs` / `check-spec.mjs` under
  `check-plan-spec-agree.mjs`, `check-spec.mjs` under `check-spec-approved.mjs`) is still read by its parent as that
  parent's RED. In the loop, check I's identical runs pre-empt it unless it does not reproduce. Outside the loop it is
  a refusal with the wrong remedy named.
- The entry cannot map its own file failing to load, a forced process exit, an unsettled top-level await or a signal.
  `/pharn-loop`'s exit-1 sentence (advisory) catches the first.
- `check-loop-fresh`'s older `usage-error` for a child checker that printed no JSON was left as is (not this axis).

No trusted doc needed a change, so there is no `PROTECTED-FOLLOWUPS.md`.

Coordination: `.claude/worktrees/agent-feedback-other-project-085ad9` holds an unmerged plan (`review-leftovers-0924`)
that also targets 6.21.1 and edits adjacent lines of `ac-tests.md` and `check-ac-tests.mjs`. Whichever merges second
rebases, takes 6.21.2 and resolves those lines.

chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate.
