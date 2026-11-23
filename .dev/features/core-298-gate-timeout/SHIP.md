# SHIP — core-298-gate-timeout

`/pharn-dev-ship core-298-gate-timeout` (Linear CORE-298, epic CORE-294). SKILLS_VERSION 7.22.0 → 7.22.1.

## Stages, in order

1. `/pharn-dev-plan` → `PLAN.md` (`026b5344`). `check-plan-lessons` GREEN; `set-writes-scope --check --from-plan`
   exit 0 (21 paths).
2. **GATE 1: a model decision under delegation (orchestrator), not a human approval.** Approved, with answers: keep
   `bad-gate-timeout` and keep the closed sets, `stage-exit.md` and the tests in lockstep; the build gate raises its
   budget and the stage scripts do not, and that asymmetry and the `--resume` behaviour go in `gate-run-record.md`
   and the PR body; the targeted gate takes the declared value; `/pharn-test`'s red run stays pinned.
3. `/pharn-dev-grill` → `GRILL.md` (advisory: 4 concerns, 0 blocking). Each was answered in the build: the
   second config read is stated as a bound; the background move is labelled an observed harness behaviour; the trigger
   is cited as a review finding; the timing margins are widened.
4. `/pharn-dev-build` → `97d0b5f4`. Step 0 anchored at `ed2032e0`; floor GREEN; 21 paths formatted.
5. `/pharn-dev-regress` (base `ed2032e0`, build commit `97d0b5f4`) → `no-regressions`. Run 1 read `regressions` (one
   load-timing test outside the change, `entry-gates.test.mjs` "CLI cache (AC3)", which passed 3/3 alone). Under the
   STOP rule the stage was re-run with both sides started at load < 40; both runs are recorded in `REGRESSION.md`.
6. Merged `origin/main` (`302f26f8`: CORE-302 #462, prettier 3.10.1 #459) and #464's `9a29df8a`
   (`origin/fix/prettier-3.10.1-format`, at the orchestrator's instruction), with `npm ci`. The CHANGELOG conflicts
   were resolved by moving both new `[Unreleased]` entries into `[7.22.1]`. `pharn-install.json` stayed GREEN.
   `/pharn-dev-build` Step 0 then re-anchored at `fb738d30` (the build was committed, so it wrote nothing), because a
   merge from a branch other than `origin/main` reads as a reconcile escape.
7. `/pharn-dev-verify`. Run 1's `test` gate exited 1 with three failures in this increment's own test files: two
   closure-count tests and a too-tight budget slack. They were fixed within `## Files` (`35e70821`), and the stage
   re-ran from `init`. Run 2 → `PASS` (`0bdf9c04`), every gate 0, `reconcile` 0.
8. `/pharn-dev-review` → `REVIEW.md`: GREEN, 0 floor-gate findings, 3 advisory.
9. **GATE 2: a model decision under delegation (orchestrator), not a human approval.** Green verdicts → open the
   pull request. Not merged.

**Disclosed: the standing regress verdict predates two later changes.** It was measured on `97d0b5f4`, before the
merges and before `35e70821`.

- `35e70821` changes only three test files inside the feature (`build-gate.test.mjs`, `stage-regress.test.mjs`,
  `stage-verify.test.mjs`), which regress's outside-gate set excludes.
- The merged upstream bytes are `origin/main`'s and #464's, not this increment's. Comparing them against `ed2032e0`
  would read them as inside changes this plan does not declare.

Verify run 2 covers the final tree whole: `npm test`, `validate`, `lint`, `format:check`, `lint:md`,
`instruction-growth` and `reconcile`.

## Verdict block

verdict-grill: exit 0
verdict-build: exit 0
verdict-regress: no-regressions
verdict-verify: PASS
run-ended: GATE 2

changelog-entry: exit 0

lesson: none — one candidate surfaced (run every test file that imports a closed registry when adding a member). It
restates L29 / L36 (the enumeration is the deliverable; a presence set is not a closed set) closely enough that it does
not clear L20's bar as a new lesson, and no human was available under delegation to answer 2b.3.

deferred: closed-registry-test-sweep (the candidate above, `REVIEW.md` § Proposed lesson candidate);
build-gate-timeout-pin (`REVIEW.md` L-floor, first finding).

Pointers: `REVIEW.md` (findings, advisory), `GRILL.md` (advisory), `REGRESSION.md`, `VERIFY.md`.

_Chain ran; the named floor verdicts are as shown. This is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate._
