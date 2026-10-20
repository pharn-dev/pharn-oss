# SHIP — envelope-duplicate-keys

`/pharn-dev-ship` ran in an isolated agent worktree on `fix/envelope-duplicate-keys`, delivered as PR #378. **Both
human gates were delegated to the batch orchestrator.** The GATE 1 and GATE 2 decisions below are model decisions
made under the maintainer's delegation. They are not human approvals.

## Stages, in order

1. `/pharn-dev-plan` → `PLAN.md`. `check-plan-lessons` exit 0 (L6, L29, L31, L35, L52, L60).
2. **GATE 1 (delegated): APPROVED** by the orchestrator. Q1 → any key. Q2 → patch, renumbered at PR time. Q3 → fall
   through to the derived outcome, with the run report's reason made true. That reason change was made before the
   build anchor, recorded in PLAN "GATE 1 — decision".
3. `/pharn-dev-grill` → `GRILL.md`. Floor verdict: `check-plan-lessons` exit 0. Advisory: 3 concerns (0 blocking),
   all carried into the build.
4. `/pharn-dev-build` → `BUILD.md`. Floor verdict: `validate` exit 0, GREEN.
5. `/pharn-dev-regress` → `regression-report.json` `.verdict` = **`no-regressions`**. The outside `tests` gate was red
   at both base and head with the same six named timing tests, so it is `pre_existing`.
6. `/pharn-dev-verify` → `verify-report.json` `.verdict` = **`FAIL`**, `failing_gates: [test]`. Seven
   timing-sensitive tests outside the increment failed under shared-machine load.
7. `/pharn-dev-review` → `REVIEW.md`. 0 floor-gate findings and 4 advisory. R1 was fixed by adding a sentence to
   `cost-ledger.md`, added to the plan after the anchor as PLAN "Amendment 1". R2 and R3 are accepted bounds; R4 is
   noted.
8. `origin/main` merged (6.71.2: #376, #377, #362), and the branch is renumbered to **6.71.3**. Main's released
   sections are byte-for-byte unchanged, and its `[Unreleased]` entry moved into 6.71.3.
9. Verify run 2, after the fix and the merge: `test` 0 (5878/5879, 1 skipped), `validate` 0, `format:check` 0,
   structural 0. `lint` and `lint:md` were 1 only on this run's own gitignored scratch, and are 0 after deleting it.
   `reconcile` 1, the accepted `plan-widened-after-anchor` on `cost-ledger.md`. Details in `VERIFY.md`.

**Where the run ended: GATE 2 (delegated).** The orchestrator's standing rule allows a load-timing-only verify FAIL
to proceed. Run 1's FAIL was exactly that. Run 2's FAIL is the accepted plan widening plus scratch-only lint, both
re-measured clean. Proceeding to the PR was a model decision under that delegation. Review: `REVIEW.md`. Grill
(advisory): `GRILL.md`.

## Floor verdicts, verbatim

- build: `validate` exit 0
- regress: `no-regressions`
- verify (run 1, `verify-report.json`): `FAIL` (`test`)
- verify (run 2): `FAIL` (`lint`, `lint:md`, `reconcile`), explained above

changelog-entry: exit 0

lesson: deferred — one candidate, not promoted in this batch, per the brief. Candidate text: "A whole-suite `tests` gate
red at both BASE and HEAD under shared-machine load is classified `pre_existing` and masks any head-only failure
inside it. When the gate is red on both sides, compare the named failure lists, not just the exit codes." It does not
yet clear L20's bar: this is a first occurrence, and the comparison was done by hand here.

deferred: none

## Discipline notes, stated

- Bash wrote four tracked paths inside an active scope: `SKILLS_VERSION` (`printf`), the README badge (`sed`), and
  line numbers in `GRILL.md` and `REVIEW.md` (`sed`). None was a guard bypass, because each path was in the scope at
  the time and `reconcile` reported none of them. They should still have gone through Edit, as `BUILD.md` says.
- The merge resolution took main's side of `CHANGELOG.md`, `README.md` and `SKILLS_VERSION` with
  `git checkout --theirs`, then applied this branch's changes with Edit.
- `PLAN.md` and `BUILD.md` keep "6.71.1", the number planned at the time. Product and guide bytes say 6.71.3.
- CI on the first push: `floor` failed on `run-gates.test.mjs` "audit P3-P" (`kill ESRCH`, a process race in a file
  this PR does not touch). CodeQL flagged a misleading regex alternation in this PR's
  `check-loop-decision.test.mjs:143`, which is fixed by splitting it into two assertions.

Chain ran; the named floor verdicts are as shown. This is NOT a judgment that the increment is good or wise. That is
the human's call at the post-review gate.
