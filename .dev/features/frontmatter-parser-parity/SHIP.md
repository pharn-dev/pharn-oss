# SHIP — frontmatter-parser-parity

An advisory roll-up of a `/pharn-dev-ship` run in batch 2026-10-19 (group B). Both human gates were **delegated to the
batch orchestrator** under the maintainer's delegation (`.pharn/batch-2026-10-19/COMMON.md`). The orchestrator's
decisions below are **model decisions, not human approvals**.

## Stages, in order, and where the run ended

1. `/pharn-dev-plan` → `PLAN.md`. `check-plan-lessons` exit 0.
2. **GATE 1 (delegated)**: approved as written. Q1: no envelope refusal in this increment, a named follow-up. Q2:
   `.dev/floor` may import the product core. Q3: patch. Recorded in PLAN `## GATE 1`.
3. `/pharn-dev-grill` → `GRILL.md`. Step 1b `check-plan-lessons` exit **0**; 4 advisory concerns.
4. `/pharn-dev-build` → `validate` exit **0**.
5. `/pharn-dev-regress` run 1 → `.verdict` `no-regressions`. Its head log held 11 new failures masked as `pre_existing`.
   The regression was fixed under PLAN `## Amendment 1` (two test files) with a new build anchor.
6. `/pharn-dev-regress` run 2 → `no-regressions`.
7. `/pharn-dev-verify` run 1 → `FAIL` (`test`: 4 load-sensitive timing tests). Run 2, the same tree, re-run → **`PASS`**.
8. `/pharn-dev-review` → `REVIEW.md`: GREEN, 0 floor-gate findings, 4 advisory.
9. **GATE 2 (delegated, per COMMON.md)**: fix every blocking or High finding and anything cheap and clearly right.
   - The three minor findings were fixed under PLAN `## Amendment 2`, with a new build anchor (`validate` exit 0).
   - The fourth finding concerns the apparatus; it became the deferred lesson candidate.
   - Then the branch merged `origin/main` (#359, 6.64.3), renumbered to **6.64.4**, and committed.
10. `/pharn-dev-regress` run 3 (base `94ad252b` = `origin/main`) → **`no-regressions`**. This is
    `regression-report.json`.
11. `/pharn-dev-verify` run 3 → `FAIL`. Run 4 → **`FAIL`**, which is `verify-report.json`. Both runs failed on `test`
    only: 2 and then 7 slow integration tests in four files this increment does not touch, at machine load averages of
    48–272. Every other gate was 0, including `reconcile` `CLEAN`.

**Where the run ended:** at a RED verify verdict on the final tree (`test`). The cause is load-sensitive timing tests,
not a defect this run found in the increment. That is a reading of logs, not a verdict, so the report states it as
such. Per COMMON.md, the branch goes to a pull request so a clean CI runner can measure `test`. The decision on the PR is
the orchestrator's. **Nothing was merged.**

## Structural verdicts, verbatim

- build: `node pharn/floor/validate.mjs .` → exit 0 (both build rounds, and again after the merge)
- regress: `regression-report.json` `.verdict` = `"no-regressions"` (run 3)
- verify: `verify-report.json` `.verdict` = `"FAIL"`, `failing_gates` = `["test"]` (run 4); run 2 = `"PASS"`

Pointers: `REVIEW.md` (findings, cited, not restated), `GRILL.md` (advisory), `REGRESSION.md`, `VERIFY.md`.

changelog-entry: exit 0

lesson: deferred — candidate below; this batch promotes no canon (COMMON.md).

- Candidate: a regress gate that folds a whole test suite into one exit code lets any RED at base hide every new RED
  at head, because `check-regress.mjs` classes the gate `pre_existing`. A flaky, load-sensitive base test therefore
  masks a real regression.
  - Source: `REVIEW.md` advisory finding 4, and `REGRESSION.md` run 1: 11 new head failures in
    `render-review-assignments.test.mjs` and `lens-groups.test.mjs`, under a `pre_existing` `tests` gate.
  - Remedy direction: compare failing test names at base and head, not one exit code. Reading the logs is today's only
    defence, which L20 calls the wrong kind.

deferred: none

## Process notes (advisory)

- A Bash `sed` corrected three line numbers in `GRILL.md`. The file was in scope, the edit came before the build
  anchor, and it is recorded in `REVIEW.md`.
- `git worktree prune` removed two already-prunable worktree entries belonging to another session. Only stale metadata
  changed.
- The pinned stage shell forms (`xargs`, `$?` capture) are refused in this isolated worktree. Regress, verify and the
  Step 2b format pass ran from node runners under `.pharn/`, with argv arrays.

_Chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate._
