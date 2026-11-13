# SHIP — gate-evidence-cache

Linear CORE-86 (epic CORE-13). Gated `/pharn-dev-ship`, not `--loop`.

## Stages, in order

1. `/pharn-dev-plan` → `PLAN.md`, then **GATE 1**. Before the build, `origin/main` moved to 71cf56e6 (a maintainer
   chore with one `[Unreleased]` CHANGELOG entry); it was merged in with no force-push, and that entry moved byte for
   byte into this PR's `## [7.14.0]` section.
2. `/pharn-dev-grill` → `GRILL.md`: lessons declaration GREEN; 7 advisory concerns (3 important, 4 minor). Folded into
   the build: errors in the lookup are caught as misses, the record's feature name is slug-gated, the cleanup after a
   hit is tested. Declined with a reason: a success line at `--wait` (an existing test pins its empty stderr).
3. `/pharn-dev-build` → floor GREEN (`validate.mjs` exit 0); `npm run check` exit 0 (6,747 tests, 0 failed).
   **Build amendment:** the first full test run found `pharn/floor/entry-base-evidence.test.mjs` re-running `--start` on
   a red tree, which is now a cache hit by design. The path was added to `## Files` (`PLAN.md`, "Build amendment"), the
   build's Step 0 (setter, then anchor) was re-run, and that test's second start became the `--refresh` line. A model
   decision under the maintainer's delegation.
4. `/pharn-dev-regress` → `no-regressions` (base `356094ba`).
5. `/pharn-dev-verify` → `PASS`.
6. `/pharn-dev-review` → `REVIEW.md`: 0 floor-gate findings; 2 cheap P2/P5 fixes found (gate ids must be ALLOWLIST
   members, so a forged record cannot put free text in the stop line; a live tree with no HEAD is
   `inputs-unavailable`).
7. Iteration 2 (GATE 2's fix rule): both fixes applied inside `## Files`, then regress and verify re-run; both
   `no-regressions` / `PASS`, as iteration 1 was.
8. Iteration 3 (a red CI check on the pull request): pharn-ci's diff-coverage gate measured 97.75% (608 of 622 added
   lines) against its 100% threshold. The uncovered lines were four catch blocks that no input reaches (every callee
   already returns its failure; a thrown defect would be `main`'s `crashed`, exit 2, which callers go on past) and two
   failure notes. The catches were removed and the notes tested (a record that cannot be written; a clear that fails
   in a read-only git dir), inside `## Files`; nothing was excluded and the gate was not touched. A local coverage run
   over the changed files estimates 618 of 618 added lines covered. Regress (base `ae310f3e`) and verify were re-run on
   the final tree; the verdicts below are iteration 3's.

## The gates' decisions (delegated, never human approvals)

- **GATE 1 (plan approval):** approved as written, 2026-11-12, by the orchestrating model under the maintainer's
  delegation. Scope decision recorded with it: **reds only** — the baseline (`.dev/measurements/loop-baseline-2026-11-11.md`
  §6, §7, §12) rates the task needs-evidence and shows no use for cached greens, and the ticket caches greens only if
  the baseline shows a use. Answers: non-style reds only; the repo-relative prefix bound, the absolute path advisory and
  unbound; a fixed 24-hour age limit, no config key; a new row S14c (`blocked: gates-red-cached`); one record per
  repository, last writer wins (a clear only ever removes a hit); a red run with an unmeasured gate is not cached. The
  three build checks it named: exit 4 was free on `--start` (its codes were 0, 3 and 2; the loop mapped only 3) and
  means red as on `--wait`/`--peek`; a missing or unwritable git dir is a returned miss or a stderr note (storage tests
  pin both); `pharn-loop.md` is 89,079 bytes against its 93,184-byte ceiling, so no ceiling moved.
- **GATE 2 (post-review):** delegated to this run under the batch rule (proceed to the pull request only when verify is
  PASS, regress is clean and review has zero floor-gate findings). All three hold on the final tree, so the decision is
  **proceed to the pull request**, made by the orchestrating model under that delegation. The two advisory findings
  left are follow-ups: `entry-cache-install-records` (package managers whose install state is not one of the four
  named records) and `entry-cache-forgery-detection` (a Bash-forged record is undetected; bounded: it can only stop a
  run). An automated PR reviewer (CodeRabbit) suggested stripping `GIT_DIR`-style variables from the new test
  fixtures' environment; not applied, because the sibling suites (`entry-gates.test.mjs`, `entry-base-evidence.test.mjs`)
  inherit the environment the same way and CI sets none of them; named as follow-up `test-fixture-git-env` for all of
  them at once.

## Verdicts

verdict-grill: exit 0
verdict-build: exit 0
verdict-regress: no-regressions
verdict-verify: PASS
run-ended: GATE 2

changelog-entry: exit 0

lesson: none — the one surprise (a test outside `## Files` that re-ran a command on unchanged state and so encoded the
old behaviour) is a first occurrence, caught by the build's own full test run; below L20's bar.

deferred: none

## Human-only edits

None. No hook script, settings file, trusted doc or the SPEC template changes. An optional `pharn/LIMITS.md` sentence
naming the cross-run stop goes into the PR body as a proposal only.

## Pointers

- Review: `.dev/features/gate-evidence-cache/REVIEW.md` (findings not restated here).
- Grill (advisory): `.dev/features/gate-evidence-cache/GRILL.md`.

_Chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate._
