# SHIP — plan-declared-deletions

Advisory roll-up of one `/pharn-dev-ship` run. Its stages ran as separate agent turns in one worktree, with the
orchestrating agent relaying each gate. The run ended at **GATE 2 with a decision to merge**.

## Stages, in order, with each structural verdict verbatim

1. `/pharn-dev-plan` → `PLAN.md`; `check-plan-lessons.mjs` exit 0 (GREEN, 19 cited ids). `d882792`.
2. **GATE 1: approved by the human, in chat, relayed by the orchestrating agent**, with the recommended answer to each
   of Q1–Q4 (`PLAN.md`, "Resolved questions (GATE 1)"). `45fd710`.
3. `/pharn-dev-grill` → `GRILL.md`. Its one stop, `check-plan-lessons.mjs`, exited 0 (GREEN). It raised four advisory
   concerns; G1 and G2 were taken into the plan before the build. `dc7ac03`.
4. `/pharn-dev-build` → `validate.mjs` exit 0 (`FLOOR: GREEN — 37 capabilities checked in "."`). `8a85699`.
5. `/pharn-dev-regress` (iteration 1) → `.verdict` `"no-regressions"`. `d5b4095`.
6. `/pharn-dev-verify` (iteration 1) → `.verdict` `"PASS"`, `failing_gates: []`. `b22a225`.
7. `/pharn-dev-review` (independent) → `blocked-with-1-floor-finding`; recommendation **fix-first**. GATE 2 decided
   fix-first. The blocking finding: on APFS, `LIMITſ.md` (U+017F) deleted `LIMITS.md`. `a230886`.
8. Review fixes F1–F7, inside the plan's `## Files`; `validate.mjs` exit 0 after them. `292730c`.
9. `/pharn-dev-regress` (iteration 2) → `.verdict` `"regressions"`, `regressions: ["tests"]`. The cause was a 30 s
   timeout in `.claude/hooks/protect-trusted-paths.test.cjs:1098`, a file this diff does not touch. Load averages
   were 26.95 / 59.75 / 68.11, and the test passed in 128 ms when run alone. The verdict was not overridden; the stage
   was re-run. `40fe1e5`.
10. `/pharn-dev-regress` (iteration 3, after the load fell below 10) → `.verdict` `"no-regressions"`, `regressions: []`.
    `6476837`.
11. `/pharn-dev-verify` (iteration 3) → `.verdict` `"PASS"`, `failing_gates: []`; `npm test` 5288 tests, 5287 pass,
    0 fail, 1 skipped; reconcile `CLEAN`. `78adb0d`.
12. Re-review after fix-first → **GREEN: 0 floor findings outstanding**; recommendation **merge**. `ba73c86`.
13. **GATE 2: merge.** This was a **MODEL decision** by the orchestrating agent under the human's explicit in-chat
    delegation ("you're in charge and you decide"). It is **not a human approval**.

Pointers: `REVIEW.md` holds the review and the re-review, and is cited here, not restated. `GRILL.md` is advisory.
`REGRESSION.md` and `VERIFY.md` keep every iteration.

changelog-entry: exit 0

lesson: skipped — not taken to /pharn-dev-memory-promote: the human delegated GATE 2 to the model and was not present to
answer 2b.3; the model does not self-promote canon. Candidate carried under deferred: for the human.

deferred:

- Lesson candidate, from `REVIEW.md`'s proposed lesson and its blocking finding: "a refusal guarding a filesystem
  action should compare on-disk identity — the `realpath.native` spelling or dev/ino — not the lexical spelling". No
  duplicate was found in `.dev/memory-bank/lessons-learned.md` (no entry on `realpath` or case-insensitive identity).
  The 6.31.1 hook change that judges the filesystem's target was never promoted as a lesson.
- Follow-up `apply-deletions-core-extract`: move the always-reconciled set's loader and matcher out of
  `check-bash-reconcile.mjs` into a core both modules import.
- Follow-up `reconcile-index-removed-deletion`: an undeclared `git rm` deletion is only a reconcile WARN (the scope
  checks still catch a tracked one).
- Follow-up `plan-declared-directory-deletion`: a marked directory is refused; files are listed one by one.
- Follow-up `loop-fix-list-undeleted`: `/pharn-loop`'s rebuild hand-off does not list `.completeness.undeleted[]`.
- Optional human note for `LIMITS.md §6`: a deletion staged with `git rm` is a reconcile WARN rather than judged.

_chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate._
