# SHIP — loop-cost-6-73-2

Advisory roll-up of a gated `/pharn-dev-ship` run. Nothing reads this file.

## Stages, in order, and where the run ended

1. `/pharn-dev-plan` → `PLAN.md`. **GATE 1: delegated.** After the first halt the user wrote "do what I said, if you
   need to run something do it"; the plan was accepted by the model under that delegation, not by a human.
2. `/pharn-dev-grill` → `GRILL.md`. `check-plan-lessons.mjs` exit **0** (L19, L40, L64, L66).
3. `/pharn-dev-build` → `node pharn/floor/validate.mjs .` exit **0** (GREEN, 37 capabilities).
4. `/pharn-dev-regress` → `regression-report.json` `.verdict` **`no-regressions`**. Four pre-existing untracked paths
   were left out of `--changed`, with evidence in `REGRESSION.md`.
5. `/pharn-dev-verify` → `verify-report.json` `.verdict` **`PASS`** on the clean map. The raw working-tree map read
   **`FAIL`** (`lint:md`, a gitignored scratch file only); see `VERIFY.md`.
6. `/pharn-dev-review` → `REVIEW.md`: GREEN, 0 floor-gate findings, 4 advisory.

The run ended at **GATE 2**. Under the same delegation, the model takes the merge/fix/abandon decision only as far as
opening the PR; merging is the user's.

- changelog-entry: exit 0
- lesson: none — every failure met here already has a lesson (L61) or a named residual (`stage-agent-background`)
- deferred: none

The two loop runs, the void attempts and the worktree resets happened outside this repository, before and during the
build; they are listed in `PLAN.md`, "Outside this repository".

Chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate.
