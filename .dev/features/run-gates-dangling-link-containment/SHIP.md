# SHIP — run-gates-dangling-link-containment

## Stages that ran, in order

1. `/pharn-dev-plan` wrote `PLAN.md`. `check-plan-lessons` was GREEN.
   - The defect was reproduced at `daaa999` before planning: an uncaught `ENOENT` from `mkdirSync`, exit 2,
     no document.
   - **GATE 1** was approved by the model under the user's standing delegation for `/pharn-dev-ship` runs.
     It is recorded as such, not as a human approval.
2. `/pharn-dev-grill`: Step 1b `check-plan-lessons.mjs` exit `0`. The setter parsed 5 paths against 5
   declared bullets. There were 2 advisory concerns, both minor, and both were applied in the build:
   - the refusal comment says "cannot prove safe", not "escape";
   - the test says which assertions carry the red.
3. `/pharn-dev-build`: `validate` exit `0`. The new test was red on the unfixed code first (L4).
4. `/pharn-dev-regress`: `"no-regressions"`.
5. `/pharn-dev-verify`: `"PASS"` (`reconcile` CLEAN, 2594/2594 tests).
6. `/pharn-dev-review`: 0 floor-gate findings and 2 advisory ones, both minor and both left as recorded.
7. **GATE 2:** the decision was **merge**, taken under the same delegation, once CI is green.

## Build note

`assertContained` in `pharn/floor/run-gates.mjs` now treats `lstat`'s own ENOENT as the only proof of
absence (L54). A dangling link, a file component and a dangling state root are each refused with a closed
`path-containment` document, where before they crashed `init`. One CONTAINMENT test iterates all three,
with the ordinary-path control. `SKILLS_VERSION` moves 6.12.0 → 6.12.1, with the badge and CHANGELOG.

## Pointers

- `REVIEW.md` — not restated here.
- `GRILL.md` — advisory.
- `VERIFY.md` — the measured red-before-green.

lesson: none — this run applied L54's own remedy to its instance (1). Nothing new failed or surprised.

deferred:

- `PLAN.md` "Deliberately NOT in scope": `run --next` reads `state.json` before its containment check (a
  read, with no observed failure).

Chain ran; the named floor verdicts are as shown. This is NOT a judgment that the increment is good or
wise; that is the human's call at the post-review gate.
