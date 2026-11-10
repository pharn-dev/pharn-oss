# SHIP — grill-finding-ids

Part 1 of 3 of restore-loop-grill (SKILLS_VERSION 7.6.0). An advisory roll-up of the dev chain; it records that the
stages ran and their floor verdicts. It is not an approval and carries no seal.

## How the chain ran (stated, because it was not the standard order)

The stages were invoked one by one at the maintainer's request, not by a `/pharn-dev-ship` run:

1. `/pharn-dev-plan` → `PLAN.md`; four open questions resolved by the maintainer through selectable forms; plan
   approved as written.
2. `/pharn-dev-build` — at the maintainer's request it ran **before** the grill. `validate.mjs` GREEN.
3. `/pharn-dev-regress` → `no-regressions`.
4. `/pharn-dev-verify` → PASS.
5. `/pharn-dev-review` → GREEN, 0 floor-gate findings, 4 advisory. The maintainer chose to fix A1 (per-code repair
   hints, measured on 161 real `GRILL.md` files) before committing; regress and verify were re-run after it.
6. `/pharn-dev-grill` — run **after** the build, for this record. Its lessons stop was GREEN; its interrogation found
   that the build had skipped a hygiene pin the plan promised (the Step 4 line order). The pin was added inside the
   plan's `## Files`, and verify was re-run a third time over the final tree.

Regress was **not** re-run after the grill's fix: that fix adds one test inside `.dev/floor/command-hygiene.test.mjs`
(declared in `## Files`, inside the changed scope) and changes no outside file, so no outside gate can flip. Its last
run covers the tree with the A1 fix.

## Verdicts

verdict-grill: exit 0
verdict-build: exit 0
verdict-regress: no-regressions
verdict-verify: PASS
run-ended: GATE 2

- `verdict-grill` is `check-plan-lessons.mjs`'s exit in the (post-build) grill; `verdict-build` is `validate.mjs`'s
  exit at the build; the regress and verify lines are copied verbatim from `regression-report.json` and
  `verify-report.json` (verify's third run, stamp `229748cf…`).
- Not part of the block: the per-PR `check:surface-bump` was GREEN against `origin/main` at the build.

changelog-entry: exit 0

## Pointers (advisory; not restated — P4)

- Review: `.dev/features/grill-finding-ids/REVIEW.md` — A1 fixed; A2, A3, A4 open.
- Grill: `.dev/features/grill-finding-ids/GRILL.md` — 4 concerns; the ordering pin is fixed, the others are open.
- Verify: `.dev/features/grill-finding-ids/VERIFY.md`; regress: `.dev/features/grill-finding-ids/REGRESSION.md`.

lesson: none — the one recurring failure found (a checker modelling an external producer from the inputs its author
pictured, review A1) is a recurrence of L67, already canon; per L20 a second recurrence in part 2 would be the trigger
for a floor remedy.

## Deferred

- Review A2: `grill-findings-core.mjs`'s "no I/O" header is true of its own code, not of its imports.
- Review A3: the rendered GRILL.md findings list is flat, no longer grouped by axis.
- Review A4 / plan Q3: the P7 evidence lines (the reauth and GDPR runs) are owed before part 2's plan.
- Grill (comprehension): the four bounds (round ≤ 99, 500 findings, 2,000 characters, 4 MiB) carry no stated reason.
- Grill (coupling): the grill's validator imports its enum rules from `/pharn-review`'s merge module; the ripple is
  unnamed in the plan.
- Part 2 (from review A1): measure the first-pass RED rate of a real full grill under the new wording before the loop
  gates on the check.

Chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate.
