# SHIP — ac-gate-plan-scope

An advisory roll-up of the `/pharn-dev-ship` chain for this increment, which closes two AC-gate holes (6.30.0):

- **H2:** a PLAN can no longer put in scope the test infrastructure the AC gate judges it by. That covers this
  feature's `AC-TESTS.md` and lock, the root package-manager configs, and every file a level gate's script names.
- **H2, continued:** the test-infra pin (`ac-tests-lock/4`) covers the chained scripts, the named files, the `jest` key
  and those configs.
- **M6:** a flaky, expected-failure or duplicate test outside an AC's mapped files no longer voids the whole AC record.

This file records that the chain ran and its floor verdicts. It is not a "shipped" claim, an approval or a seal.

- stage: `/pharn-dev-ship` Steps 2b, 2c and 3 — Claude Opus 5.5 (`claude-opus-5-5`), by the maintainer's instruction for
  this batch (not a `pharn.config.json` route).
- where the run ended: **GATE 2 → FIX, then PR**, the orchestrator's decision. This file is committed with the
  increment, pushed, and a pull request opened against `main`. This run does not merge the pull request.

## Stages run, in order, and on which model

Every stage ran inline in one agent, which the orchestrator spawned; the batch forbids spawning a stage agent. All of
them ran on Opus.

1. `/pharn-dev-plan` → `PLAN.md`.
2. **GATE 1**, approved by the orchestrator with the A3 amendment and the A9 statement (`PLAN.md`, the grill
   resolutions).
3. `/pharn-dev-grill` → `GRILL.md`: 8 concerns (4 important, 4 minor), folded into `PLAN.md` before the build.
4. `/pharn-dev-build` → `BUILD.md`, plus the staged human-only patch under `proposed/`.
5. `/pharn-dev-regress` and `/pharn-dev-verify`, first on the pre-merge tree (base `70cb51c`).
6. `/pharn-dev-review` → `REVIEW.md`.
7. Steps 2b and 2c, then **GATE 2 → FIX, then PR** (orchestrator).
8. The GATE 2 fixes (`BUILD.md`, "GATE 2 — the FIX round"). Then `validate` and `npm run check` again (exit 0,
   4101/4101 tests), and the L65 promotion through `/pharn-dev-memory-promote`.
9. `git merge origin/main` (`c1bf663`, #290 released 6.29.0), renumbered to 6.30.0, the command byte ceilings
   re-checked (the COMMAND BUDGET tests pass).
10. `/pharn-dev-regress` and `/pharn-dev-verify` re-run on the merged tree → the current `REGRESSION.md`,
    `regression-report.json`, `VERIFY.md` and `verify-report.json`.

## Decisions, and whose

**The orchestrator's**, made under the maintainer's delegation for this batch. These are model decisions, not human
approvals:

- **GATE 1:** approved.
  - The `jest` key is pinned canonically.
  - Chained scripts are pinned through one closed literal token pass: with pre/post, transitive, depth-bounded and
    own-property only.
  - `.npmrc` is pinned by hash only, and naming it in the PLAN is RED.
  - The in-process bound is stated once in `test-infra-core.mjs`'s header and restated in `ac-tests.md`.
- **GATE 2 = FIX, then PR:**
  - F1–F3 and every minor finding are fixed.
  - F4 stays the named follow-up `verify-rechecks-test-stage`, stated as a bound.
  - The post-GATE-1 refinements are accepted as build-time amendments (`BUILD.md`, "Build-time amendments to the
    approved plan").
  - The `LIMITS.md §9` patch stays in `proposed/` as an optional staged human edit.
  - The version is renumbered to 6.30.0.
- **Step 2b.3:** promote LC1 as drafted. The accept at `/pharn-dev-memory-promote`'s own gate was also delegated to the
  orchestrator, who accepted it.

**The maintainer's own:** the delegation of both gates, and of the promote accept, to the orchestrator for this batch,
and the instruction to run it on Opus.

## Structural verdicts, as read

- `/pharn-dev-grill` → `check-plan-lessons.mjs`: **exit 0**, GREEN.
- `/pharn-dev-build` → `node pharn/floor/validate.mjs .`: **exit 0** (`FLOOR: GREEN — 36 capabilities checked`). It
  still reads exit 0 on the merged tree.
- `/pharn-dev-regress` → `regression-report.json` `.verdict`: **`no-regressions`**.
  - The base is `c1bf663`; 42 paths are inside and none escaped.
  - The 113 outside test files, `validate` and the trust-fence structural pair all exit 0 at the base and at the head.
- `/pharn-dev-verify` → `verify-report.json` `.verdict`: **`FAIL`**, failing gate `reconcile`. The other six gates exit
  0 (4170/4170 tests).
  - The build anchored the reconcile epoch before the merge. The 50 escapes are all files `origin/main` changed in
    `70cb51c..c1bf663` (#286, #287, #290).
  - Escapes minus that list is the empty set (`VERIFY.md`). The orchestrator said to expect this red and to confirm it
    this way.
  - The baseline was not re-anchored or edited to turn it green.
  - The pre-merge verify on the same increment read `PASS`, reconcile `CLEAN`.

## The review

Cited, not restated (P4); read `REVIEW.md`: "GREEN at the floor — 0 floor-gate (blocking) findings. 12 advisory
findings: 4 important, 8 minor." It is a self-review. F1–F3 and the minors were fixed at GATE 2; F4 is the follow-up
below.

## Named, not built

- `verify-rechecks-test-stage` (F4): `pharn/pharn-contracts/ac-tests.md`, "What it proves", Bounded.
- The optional human-only edit to `LIMITS.md §9`:
  - It is staged in `proposed/` (`APPLY.md`, `apply.sh`, `human-only.patch`, `human-only.sha256`).
  - A human may apply it after the merge on its own branch.
  - Nothing depends on it.

## Ship-stage records

changelog-entry: exit 0

- `CHANGELOG-ENTRY: GREEN — 2 new entr(ies)` against `origin/main` (`c1bf663`); this pull request opens
  `## [6.30.0] - 2026-09-27`.

lesson: promoted L65

- "A pin is only as strong as the scope around its record — a stage allowed to write the record a later gate compares
  it against certifies itself" (type `floor`), read from the `## L65` heading in `.dev/memory-bank/lessons-learned.md`.
- The accept was the orchestrator's, under the maintainer's delegation, not a human's at the promote gate.
- The id was checked against `origin/main` at promote time and again after the merge: `c1bf663`'s last id is L64, so
  L65 does not collide.

deferred:

- Fail-closed at the wrong granularity is a denial of service: M6's whole-record refusal turned one unrelated duplicate
  into an unmeasurable AC gate for every feature (`REVIEW.md`, the lesson section).

## Commit

- The increment is `e3d0ca2` and the merge of `origin/main` (`c1bf663`) is `ab80f37`. The renumber to 6.30.0 is
  `8e81f85`.
- One more commit carries the post-merge regress and verify records and this file.

_Chain ran; the named floor verdicts are as shown. This is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate._
