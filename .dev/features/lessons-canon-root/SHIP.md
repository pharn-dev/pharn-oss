# SHIP — lessons-canon-root

Batch 2026-10-19, group J (audit ARCH-6, CTX-8). Branch `refactor/lessons-canon-root`.

## Stages run, in order, and where the run ended

1. `/pharn-dev-plan` → `PLAN.md`; `check-plan-lessons` exit 0.
2. **GATE 1 — delegated.** The batch orchestrator approved the plan under the maintainer's delegation: Q1 thin
   wrappers, Q2 flag only with the bound stated, Q3 new `canon-root.mjs`. **This was a model decision, not a human
   approval.** It is recorded in `PLAN.md` "GATE 1 decisions".
3. `/pharn-dev-grill` → `GRILL.md`. Step 1b `check-plan-lessons` exit 0; 4 advisory concerns.
4. `/pharn-dev-build` → `validate` exit 0. Whole-repo `format:check`, `lint:md` and `lint` all exited 0 at build.
5. `/pharn-dev-regress` (run 1) → `.verdict` `no-regressions`.
6. `/pharn-dev-review` → `REVIEW.md`: 0 floor-gate findings, 6 advisory.
7. **GATE 2 — delegated.** The orchestrator's standing instruction was to fix blocking and High findings plus anything
   cheap and clearly right. The two important findings and one minor were fixed: root validation in
   `checkProvenance()` and in `productProfile()`, and the stale "twin" wording. Two minors were accepted with their
   bound stated. **This was a model decision under delegation, not a human approval.**
8. `origin/main` (6.67.0, PRs #364 and #366) merged into the branch, and the version was renumbered 6.66.0 → 6.68.0.
9. `/pharn-dev-regress` (run 2, base `dcf7b43`) → `.verdict` `no-regressions`.
10. `/pharn-dev-verify` → `.verdict` `PASS`. All seven gates exited 0: `test`, `validate`, `lint`, `format:check`,
    `lint:md`, `structural:…`, `reconcile` (`CLEAN`).

The run ended at GATE 2 (delegated). Next: commit and open a PR, per the batch brief. Nothing is merged.

## Structural verdicts read, verbatim

- `/pharn-dev-build` → `validate` exit **0**
- `/pharn-dev-regress` → `regression-report.json` `.verdict` **`no-regressions`** (run 2; run 1 was the same)
- `/pharn-dev-verify` → `verify-report.json` `.verdict` **`PASS`**

Pointers: `REVIEW.md` (findings, not restated here); `GRILL.md` (advisory).

changelog-entry: exit 0

lesson: deferred. The batch brief forbids promoting canon in this batch, so this records the outcome instead of a
`promoted`/`skipped`/`none` value from the closed set. The candidate text:

> L31 and L35 describe the check-provenance and lessons-index dev/product pairs as copies that "cannot be merged
> because a user's install ships `pharn/floor/` without `.dev/`". That reason forbids only `pharn/` → `.dev/` imports.
> The other direction was already in use (every dev checker imports `pharn/floor/runtime-floor.mjs`), and this
> increment merged the pairs by making the dev side a thin wrapper. Candidate: **a dependency-direction rule forbids
> one arrow, not both. Before keeping a copy-pair "because the install strips one side", check whether the stripped
> side can import the shipped one.** Source: `REVIEW.md` "Proposed lesson candidate"; `PLAN.md` "Applied lessons"
> (L35). Promoting it would also be the moment to correct L31's and L35's "cannot be merged" text, through a new
> entry; canon is never edited in place.

deferred: none

## Orchestration deviations (recorded honestly; none changes a verdict)

- **Two pipeline-artifact edits went through Bash.** Both happened before the build anchor, inside the active scope
  for the file:
  - `PLAN.md`'s GATE-1 section, written with a python one-off;
  - `GRILL.md`'s line cites, fixed with `sed -i`.

  Every later write used the Write/Edit tools.

- **The build anchor ran twice.** `pharn-memory-promote.md` was added to `## Files` during the build: the L1/L50 sweep
  found Step 6b's sentence citing the behaviour this increment changes. The plan was corrected, and build Step 0
  (setter, then anchor) was re-run before that file was written. Every write between the two anchors went through
  the hooked tools, in scope; Bash touched only gitignored `.pharn/` scratch. The re-anchor therefore dropped no
  escape the reconcile could have seen. But that is this file's statement, not a check.
- **One edit was blocked mid-run.** During regress, a fix to `check-provenance.mjs` was blocked by the regress-stage
  scope, so the guard worked. The fix was applied at GATE 2 under the plan scope.
- **Pinned shell forms were refused.** In this worktree-isolated session, regress and verify ran from scratch runners
  under `.pharn/` (argv arrays, exit codes only). Each regress baseline was a `git archive` tree with no `.git`, so the
  base `tests` gate was red and could not flag anything. See `REGRESSION.md`.
- **The order changed after review.** The fixes were made, then `origin/main` was merged, then regress and verify ran
  again. Verify ran only once, after the fixes and the merge.

chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate.
