# SHIP — stage-git-maxbuffer

An advisory roll-up of the `/pharn-dev-ship` chain for this increment. The stage scripts' git calls no longer die past
1 MiB of output, and a `git-failed` detail names why git failed (6.28.3). It records that the chain ran and its floor
verdicts. It is not a "shipped" claim, an approval or a seal.

- stage: `/pharn-dev-ship` Steps 2b, 2c and 3 — opus, by the maintainer's instruction for this batch (not a
  `pharn.config.json` route).
- where the run ended: **GATE 2 → MERGE**, the orchestrator's decision, with no fixes. This file is committed with the
  increment; the branch is then pushed and a pull request opened against `main`. This run does not merge.

## Stages run, in order, and on which model

Every stage ran inline in one agent, which the orchestrator spawned; the batch forbids spawning a stage agent. All of
them ran on opus by the maintainer's instruction for this batch, not through a `pharn.config.json` route.

1. `/pharn-dev-plan` → `PLAN.md`.
2. **GATE 1**, approved 2026-09-27 by the orchestrator (`PLAN.md`, "Decisions at GATE 1").
3. `/pharn-dev-grill` → `GRILL.md`. G4 was folded into `PLAN.md`; the other five were dispositioned for the build.
4. `/pharn-dev-build` → `BUILD.md`.
5. `/pharn-dev-regress` → `REGRESSION.md` and `regression-report.json`. A first attempt stopped before any exit code
   was recorded; `REGRESSION.md` says why.
6. Three comment and CHANGELOG wording edits (`BUILD.md`, "Deviations"), then `/pharn-dev-verify` → `VERIFY.md` and
   `verify-report.json`, on the final tree.
7. `/pharn-dev-review` → `REVIEW.md`.
8. Steps 2b and 2c, then **GATE 2 → MERGE** (orchestrator).
9. This file, then the commit, the push and the pull request.

## Decisions, and whose

**The orchestrator's**, made under the maintainer's delegation for this batch. These are model decisions, not human
approvals:

- GATE 1, approved, with these answers:
  - Q1: include the review emitter's merge-base diff ceiling;
  - Q2: keep both closure tests with their mutation controls, and state their bounds where they live;
  - Q3: leave the argv-size limit out, recorded under the existing follow-up `regress-inside-echo-list` rather than a
    new name;
  - the claims stay worded as "a big repo with a modest change", and the version is 6.28.3.
- GATE 2 = **MERGE**, no fixes required. The review's minor items stay as `REVIEW.md` records them, with no new
  follow-up names.
- The Step 2b answer below.

**The maintainer's own:** the delegation of both gates to the orchestrator for this batch, and the instruction to run
it on opus.

## Structural verdicts, as read

- `/pharn-dev-grill` → `check-plan-lessons.mjs`: **exit 0**, `GREEN`. All 14 cited ids resolve in
  `.dev/memory-bank/lessons-learned.md` and are referenced in the plan body. The interrogation raised 6 minor
  concerns, advisory.
- `/pharn-dev-build` → `node pharn/floor/validate.mjs .`: **exit 0** (`FLOOR: GREEN — 36 capabilities checked`).
- `/pharn-dev-regress` → `regression-report.json` `.verdict`: **`no-regressions`**. The base is `70cb51c` (6.28.2):
  17 paths inside, none escaped. The 117 outside test files, `validate` and the trust-fence structural pair exit 0 at
  the base and at the head.
- `/pharn-dev-verify` → `verify-report.json` `.verdict`: **`PASS`**, on the final tree. Test (4,072 of 4,072),
  validate, lint, format:check, lint:md, the structural pair and reconcile all exit 0; reconcile is `CLEAN`.

After the review, on the same tree, `npm test` ran once more: exit 0, 4,072 tests, 4,072 pass, 0 skipped. Every other
gate in `npm run check` exited 0 too.

## The review

Cited, not restated (P4); read `REVIEW.md`: "**GREEN — 0 floor-gate (blocking) findings.** Advisory: 1 important, 3
minor." It is a self-review: the agent that planned and built the increment reviewed it inline, because the batch
forbids spawning a reviewer. `GRILL.md` holds the grill log, advisory.

## Named, not built

No new names. Each item is recorded where it lives:

- `regress-inside-echo-list`, extended with the argv-size limit: `PLAN.md` ("Named, not built"), the comment above
  `assertRepresentable` in `pharn/floor/stage-regress.mjs`, and `CHANGELOG.md` `[6.28.3]`.
- The regress `test` gate passes its outside test files on argv: `BUILD.md`, "Deviations". Unmeasured; noted for the
  maintainer, not filed.
- The review emitter's refusal can still name the wrong cause: `REVIEW.md`, "L-floor" (minor).

## Ship-stage records

changelog-entry: exit 0

- `CHANGELOG-ENTRY: GREEN` against `origin/main` `70cb51c`; this pull request opens `## [6.28.3] - 2026-09-27`.

lesson: skipped

- The candidate ("a present-tense 'unchanged' claim is dated", drafted in `REVIEW.md`) was declined by the orchestrator
  under the maintainer's delegation, not by a human at the 2b.3 form. The reason: it is a first occurrence, caught at
  build and never shipped false, and every canon entry costs every future plan's sweep.

deferred: none

- Step 2b surfaced one candidate, the one recorded above.

## Commit

- One commit on `stage-git-maxbuffer` carries the increment and this file. `origin/main` read `70cb51c` when this file
  was written (`git ls-remote`).

_Chain ran; the named floor verdicts are as shown. This is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate._
