# SHIP — deletion-follow-ups

Advisory roll-up of one `/pharn-dev-ship` run. Its stages ran as separate agent turns in one worktree, with the
orchestrating agent relaying each gate. The run ended at **GATE 2 with a decision to merge**.

## Stages, in order, with each structural verdict verbatim

1. `/pharn-dev-plan` → `PLAN.md`; `check-plan-lessons.mjs` exit 0 (GREEN, 15 cited ids). `86e337b`.
2. **`LIMITS.md` §6 sentence committed by the human** (`83c5829`, human-applied, before the build anchor — Q4).
3. **GATE 1: approved by the human, in chat ("approve, implement"), relayed by the orchestrating agent**, with the
   recommended answer to each of Q1–Q5 (`PLAN.md`, "Resolved questions (GATE 1)"). `20c651f`.
4. `/pharn-dev-grill` → `GRILL.md`. Its one stop, `check-plan-lessons.mjs`, exited 0 (GREEN). Three advisory concerns
   (G1–G3), all taken into the plan before the build. `d407dd2`.
5. `/pharn-dev-build` → `validate.mjs` exit 0 (`FLOOR: GREEN — 37 capabilities checked in "."`). `41a2c49`.
6. `/pharn-dev-regress` (iteration 1) → `.verdict` `"no-regressions"`. `abd26d3`.
7. `/pharn-dev-verify` (iteration 1) → `.verdict` `"PASS"`, `failing_gates: []`. `9c26dbf`.
8. `/pharn-dev-review` (independent) → GREEN, 0 floor findings, 3 advisory (F1 important, F2/F3 minor); recommendation
   fix-first. **GATE 2 decided fix-first** — an orchestrator decision under the human's delegation. `153db2f`.
9. Review fixes F1–F3, inside the plan's `## Files`. `6f41fc3`.
10. `/pharn-dev-regress` (iteration 2) → `.verdict` `"regressions"`, `regressions: ["tests"]`. A real regression, not
    load: F1's own `spawnSync("git", …)` broke `stage-runtime.test.mjs`'s pinned `★ GIT CEILING` enumeration. Not
    overridden; the orchestrator chose remedy (a) — route `ignoredByGit` through the existing `git()` helper. `9a39952`.
11. F1 via the `git()` helper, inside `## Files`. `bdb75d3`.
12. `/pharn-dev-regress` (iteration 3) → `.verdict` `"no-regressions"`, `regressions: []`. `a2599d6`.
13. `/pharn-dev-verify` (iteration 3) → `.verdict` `"PASS"`, `failing_gates: []`; `npm test` 5303 tests, 5302 pass, 0
    fail, 1 skipped; reconcile `CLEAN`. `817a6b0`.
14. Re-review after fix-first → F1–F3 fixed, no new defect; recommendation **merge**. `fc10797`.
15. **GATE 2: merge.** This was a **MODEL decision** by the orchestrating agent under the human's delegation for this
    pipeline. It is **not a human approval**.
16. Step 2b: the human answered 2b.3 "Promote as new lesson" and accepted the rendered entry at
    `/pharn-dev-memory-promote`'s own gate ("Accept"). `9bc62c1`.

Pointers: `REVIEW.md` holds the review and the re-review, and is cited here, not restated. `GRILL.md` is advisory.
`REGRESSION.md` and `VERIFY.md` keep every iteration.

lesson: promoted L73

changelog-entry: exit 0

- Re-measured after merging `origin/main` (`2f0eaa2`, #339) into this branch as `52c4057`: exit 0, "2 new entr(ies)
  against the base (--merge-base origin/main (2f0eaa2e617f))". The first run (exit 0) was against `45107f7`, before the
  merge. Per CONTRIBUTING.md "CHANGELOG entries", #339's `[Unreleased]` entry moved into `[6.57.0]`; `SKILLS_VERSION` on
  `main` was still 6.56.0, so no renumbering. `npm run check` after the merge: exit 0 (`npm test` 5303 tests, 5302 pass,
  0 fail, 1 skipped); `check:reconcile` `CLEAN`, `merged: [".dev/features/positioning-copy/PLAN.md", "package.json"]`.

deferred:

- `plan-declared-directory-deletion` (GATE-1 Q5): not built. The evidence is in `PLAN.md` § C — six pre-6.56.0
  `pharn-starter` removal plans declared deletions at directory/glob granularity, and one (`local-checks-cleanup`) failed
  on it; per-file `(delete)` markers now cover that case. Reopen on the first post-6.56.0 run a per-file list cannot
  reasonably serve.
- O2 (re-review observation): a stale test message in `check-bash-reconcile.test.mjs` — the `ignoredByGit` row's
  "a leading dash is an operand after --" no longer describes the call (the path travels on stdin since the F1 rework).

_chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate._
