# SHIP — entry-verdict-early-read

Branch `feat/early-entry-verdict`, from `main` at `ba7b5bb2`. Stages run, in order: `/pharn-dev-plan` (GATE 1 — two
design questions asked and answered, plan approved as written) → `/pharn-dev-grill` → `/pharn-dev-build` →
`/pharn-dev-regress` → `/pharn-dev-verify` → `/pharn-dev-review` → Step 2b (lesson) → Step 2c (CHANGELOG entry) →
GATE 2, where the human chose **fix** for the four advisory review findings. The fix ran as one more iteration:
build scope re-set from the plan (no re-anchor), the fixes inside `## Files`, then `/pharn-dev-regress` →
`/pharn-dev-verify` → re-review → Step 2c again. The run ended at GATE 2 again.

The verdict lines below are the fix iteration's (the last).

verdict-grill: exit 0
verdict-build: exit 0
verdict-regress: no-regressions
verdict-verify: PASS
run-ended: GATE 2

changelog-entry: exit 0

lesson: promoted L84

deferred: none

## Iterations

| iteration      | regress (base)                | verify | what changed                                 |
| -------------- | ----------------------------- | ------ | -------------------------------------------- |
| 1 (build)      | `no-regressions` (`ba7b5bb2`) | PASS   | the increment                                |
| 2 (GATE 2 fix) | `no-regressions` (`b751399c`) | PASS   | the four advisory review findings, all fixed |

Iteration 2's first regress scope call exited 1: the L84 promotion's canon write and index regeneration were in the
uncommitted diff and outside `## Files`. At the human's choice they were committed alone (`b751399c`, a
`memory(L84)` commit on this branch); the scope call was then re-run, not hand-filtered (`REGRESSION.md`, "Runs").

## Pointers

- `REVIEW.md` — GREEN, 0 floor-gate findings; its 4 advisory findings are fixed and re-reviewed there. Not restated
  here.
- `GRILL.md` — advisory; 1 blocking-severity concern, fixed in the build (below).
- `REGRESSION.md` / `regression-report.json`, `VERIFY.md` / `verify-report.json` (both iterations recorded).

## Deviation from the plan's literal text (recorded per GRILL.md)

The plan described the in-progress view as the record with `finalized: true`, `fingerprint.final` and the
in-progress keys dropped. The grill found that `validateStamp`'s coverage check would refuse that view on every real
partial run, so the build also narrows `required` to the required ids that have run (`inProgressStampView`, inside the
declared `entry-gates-core.mjs`). A test asserts the state has unrun required gates before peeking, and a mutation at
build (no narrowing) failed three peek tests. Since the fix iteration the in-progress keys are carried rather than
dropped (`validateStamp` reads none of them), and `partialGateCount` was added for the `k of n` count.

## Other notes

- `pharn-loop.md`'s byte ceiling was raised 74,752 → 82,944 (75,158 B measured + 10%, rounded to 512) in
  `.dev/floor/command-hygiene.test.mjs`; the stuck-point table's padding widened with the S14/S14b rows.
- `.dev/floor/stage-load-budget.test.mjs` was declared but needed no change (the totals stayed under their ceilings).
- `MIN_CLI` stays `0.14.0`.
- Only the L84 commit is made; the increment itself is uncommitted.

chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate.
