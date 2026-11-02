# SHIP — reconcile-state-root

Issue [#408](https://github.com/pharn-dev/pharn-oss/issues/408). Run as an isolated subagent under an orchestrator
session; the human gates are relayed by the orchestrator.

## Stages, in order

1. `/pharn-dev-plan`: `PLAN.md`; `check-plan-lessons.mjs` exit 0. **GATE 1:** approved as written by the human
   maintainer, relayed by the orchestrator (recorded in `PLAN.md` § GATE 1 decision).
2. `/pharn-dev-grill`: `GRILL.md`; Step 1b `check-plan-lessons.mjs` **exit 0** → proceed. Four advisory concerns
   (0 blocking-severity), presented, none gating.
3. `/pharn-dev-build`: `validate` **exit 0** (`FLOOR: GREEN — 37 capabilities checked`). `docs:check`, `format:check`,
   `lint`, `lint:md` were clean.
4. `/pharn-dev-regress`: `regression-report.json` `.verdict` **`"no-regressions"`** (`new_failures: []`;
   `tests` pre-existing red at base and head, `still_failing: 12`).
5. `/pharn-dev-verify`: `verify-report.json` `.verdict` **`"FAIL"`**, `failing_gates: ["test"]`. **RED-verdict STOP.**
6. `/pharn-dev-review`: **not run.** The chain stops at the first non-GREEN verdict.

## Where the run ended

**RED-verdict STOP at `/pharn-dev-verify`** (`test` gate exit 1). Every other verify gate is 0, `reconcile` included
(`CLEAN`, 0 escapes). Per `VERIFY.md`, 12 of the 13 failing tests also fail at the base commit `607d82c2` and are
deterministic. Their fixtures copy `validate.mjs` / `count-lenses.mjs` without `capability-files-core.mjs`, which #407
added in the base commit. The 13th (`entry-gates.test.mjs` TAKEOVER, 10.1 s) is a timing failure under load. None of
the 13 is in a file this increment touched. The fix is outside this plan's `## Files`, so it was not made here.

## Re-anchor record (run 1 → run 2)

The human/orchestrator chose to resume after the sibling fix `0b18864b` (on `fix/issues-407-411`), which fixes the 12
deterministic failures. The steps, in order:

1. **Before the fast-forward**, run 1's verify reconcile on the epoch anchored at `2026-11-02T15:18:50.070Z`
   (`anchored_by: pharn-dev-build`, `anchored_head` `607d82c2`) was **`CLEAN`**: 12 paths reconciled, `escapes: []`,
   no warnings.
2. `git merge --ff-only 0b18864b`: fast-forward `607d82c2..0b18864b`. `git diff --name-only 607d82c2 0b18864b`:

   ```text
   .dev/features/issues-407-411-small/PLAN.md
   pharn/floor/lens-groups.test.mjs
   pharn/floor/render-review-assignments.test.mjs
   pharn/floor/validate.test.mjs
   ```

3. **After the fast-forward**, `check-bash-reconcile.mjs --base . --require-baseline` gave exit 1, `ESCAPE`,
   `reconciled: 16`, `merged: []`. Its `escapes`, verbatim:

   ```json
   [
     {
       "file": ".dev/features/issues-407-411-small/PLAN.md",
       "denied_by": "writes-scope (snapshot)",
       "scope_set_by": ".dev/features/reconcile-state-root/PLAN.md"
     },
     {
       "file": "pharn/floor/lens-groups.test.mjs",
       "denied_by": "writes-scope (snapshot)",
       "scope_set_by": ".dev/features/reconcile-state-root/PLAN.md"
     },
     {
       "file": "pharn/floor/render-review-assignments.test.mjs",
       "denied_by": "writes-scope (snapshot)",
       "scope_set_by": ".dev/features/reconcile-state-root/PLAN.md"
     },
     {
       "file": "pharn/floor/validate.test.mjs",
       "denied_by": "writes-scope (snapshot)",
       "scope_set_by": ".dev/features/reconcile-state-root/PLAN.md"
     }
   ]
   ```

   The escapes are exactly the four paths the diff lists, nothing more. Before the fast-forward, reconcile was CLEAN.

4. **Why a re-anchor, and why it was not a way to silence a RED.** `reconciliation-record.md` §2a's `merged` class
   covers only upstream bytes. `refs/remotes/origin/HEAD` → `origin/main` = `4faed62e`, and the merge base of HEAD
   and origin/HEAD is `4faed62e`. The anchored head `607d82c2` already contains that base, so §2a's "a merge base M
   that X does not contain" fails. `git branch -r --contains 0b18864b` is empty: the fix is on no remote. The
   orchestrator, relaying the human, chose **option (c)**: re-run `/pharn-dev-build` Step 0 (setter, then
   `--anchor`) on top of `0b18864b`, then `/pharn-dev-regress`, `/pharn-dev-verify` and `/pharn-dev-review`. The
   baseline was never edited or deleted by hand; the anchor command writes the new epoch. Nothing escaped in run 1's
   window (step 1), so the new epoch hides none of this increment's writes.

## Run 2 (on `0b18864b`, epoch `2026-11-02T16:59:19.246Z`)

1. `/pharn-dev-build` Step 0: setter `--from-plan` (12 paths), then `--anchor --by pharn-dev-build`. `validate`
   **exit 0** (`FLOOR: GREEN — 37 capabilities checked`). The spec hash is unchanged
   (`d5a97430…64f33a5`).
2. `/pharn-dev-regress`: `regression-report.json` `.verdict` **`"no-regressions"`**. Base `0b18864b`: `tests`,
   `validate` and `structural` are 0 at both base and head. Per test: 0 failed on either side, `new_failures: []`.
3. `/pharn-dev-verify`: `verify-report.json` `.verdict` **`"PASS"`**, `failing_gates: []`. `npm test` ran 6158 tests:
   6157 passed, 0 failed, 1 skipped. `reconcile` was `CLEAN` (6 reconciled, 0 escapes). The entry-gates TAKEOVER timing
   test did not fail this run, so no single-file re-run was needed.
4. `/pharn-dev-review`: `REVIEW.md`, verdict **GREEN — 0 floor-gate findings, 4 advisory (all minor)**.

**Where the run ended: GATE 2** (the human decides merge / fix / abandon). Run 1's stop is kept above as history.

## Pointers

- `REVIEW.md` (findings; not restated here), `GRILL.md` (advisory), `REGRESSION.md`, `VERIFY.md`, `HUMAN-PATCH.md`
  (proposed `pharn/LIMITS.md §6` text for a human).

changelog-entry: exit 0

lesson: pending — the human chose Promote at 2b.3 (2026-11-02, asked by the orchestrator) for the candidate in
`REVIEW.md` § Proposed lesson candidate (L41 recurred through a fixture's inherited `.gitignore`).
`/pharn-dev-memory-promote` runs after this branch merges, outside every build window, and its own gate decides; that
change replaces this line with `promoted L<n>` or `skipped`.

deferred:

- §2a's `merged` class covers only `origin/HEAD` commits, so a fast-forward onto a local sibling-branch fix mid-window
  reads as escapes (observed once, this run).

chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate.
