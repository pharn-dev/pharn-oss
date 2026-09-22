# SHIP — docs-sync-6-11

## Stages that ran, in order

1. `/pharn-dev-plan` wrote `PLAN.md`. `check-plan-lessons` was GREEN.
   - The sweep read all 20 commits (`a3ecc48` … `0bf10f4`) against every hand-written doc surface. It
     found five stale sentences, and it named the surfaces that were already current.
   - The install claims were probed in `pharn-cli@f853390`'s source, not taken from README.
   - **GATE 1** was approved by the model under the user's written delegation for this batch. It is
     recorded as such, not as a human approval.
2. `/pharn-dev-grill`: Step 1b `check-plan-lessons.mjs` exit `0`. There were 3 advisory concerns, 0 of
   them blocking-severity. All three were folded in before the build by a delegated re-decision of
   GATE 1:
   - the `MIN_CLI` argument is bounded to CLIs that honor the gate;
   - the Stop-guard sentence is split into a rule plus a dated fact, with a revision step in `APPLY.md`;
   - the new row carries the ran-at-all bound.

   The setter parsed 5 paths against 5 declared bullets.

3. `/pharn-dev-build`: `validate` exit `0`.
4. `/pharn-dev-regress`: `"no-regressions"`.
5. `/pharn-dev-verify`: `"PASS"` (`reconcile` CLEAN, 2591/2591 tests). The site-4 enumeration, re-run,
   finds no stale claim.
6. `/pharn-dev-review`: 0 floor-gate findings and 2 advisory ones, both minor and both left as recorded.
7. **GATE 2:** the decision was **merge**, taken under the same delegation, once CI is green.

## Build note

- **README:**
  - the install list and tree name the four trusted docs and the Stop guard, and the artifact directory
    sits under `pharn/` with all eleven artifact names;
  - a paragraph says the Stop guard is not a write guard and, as of 6.11.1, lands inert;
  - the guarantees table gains the gate-runner row and its bound;
  - the expired "not every design doc ships" limitation is gone.
- **`CLAUDE.md`:** the installer sentence now says all four docs land, for CLIs that honor `MIN_CLI`.
- **`SECURITY.md`:** hooks and checkers, plural.
- **`APPLY.md`:** a step to revise README's dated clause when the wiring ships.

There is no `SKILLS_VERSION` bump: every file is repo meta or dev apparatus.

## Pointers

- `PLAN.md` — the full sweep, including the surfaces found current.
- `REVIEW.md` — not restated here.
- `GRILL.md` — advisory.

lesson: none — site 4 recurs L33's own shape, and L33's remedy is what found it. No new lesson clears
the L20 bar.

deferred:

- `PLAN.md` "Deliberately NOT in scope": whether `.pharn/reconcile/` is a third load-bearing `.pharn/`
  entry, as `CLAUDE.md` and `CONTRIBUTING.md` say there are two. This predates the 20 commits and is a
  judgment call.

Chain ran; the named floor verdicts are as shown. This is NOT a judgment that the increment is good or
wise; that is the human's call at the post-review gate.
