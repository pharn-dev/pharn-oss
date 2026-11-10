# SHIP — loop-grill-triage

Part 2a of restore-loop-grill (SKILLS_VERSION 7.7.0). An advisory roll-up of the dev chain; it records that the
stages ran and their floor verdicts. It is not an approval and carries no seal.

## How the chain ran (stated, because it was not the standard order)

The stages were invoked one by one at the maintainer's request, not by a `/pharn-dev-ship` run:

1. `/pharn-dev-plan` → `PLAN.md`; four open questions resolved through selectable forms (split 2a/2b/3; triage through
   `default`; the five-grill measurement; no `proceed` for a `blocking` finding); plan approved as written. Q3's
   measurement ran before the build: 5 real full grills, 0 RED (`GRILL-CHECK-MEASUREMENT.md`). The maintainer's
   trusted-doc text was committed before the build anchored (`5be51931`, L68).
2. `/pharn-dev-build` — validate GREEN. Mid-build the main checkout was switched to `main` from outside this session;
   the build moved to its own worktree (`~/Projects/pharn-oss-worktrees/loop-grill-triage`) and re-anchored there,
   with three files the plan had missed added first.
3. `/pharn-dev-regress` → `no-regressions`, on its second run: the first was RED on two `entry-gates.test.mjs` pins
   anchored on a removed loop line; the file joined `## Files` and the epoch was re-anchored after a `CLEAN` reconcile.
4. `/pharn-dev-verify` → PASS.
5. `/pharn-dev-review` → GREEN, 0 floor-gate findings, 4 advisory; the maintainer chose to fix all four (A4 added two
   paths after a `CLEAN` reconcile and a fourth anchor), and verify was re-run over the final tree.
6. `/pharn-dev-grill` — run **after** the build, for this record: lessons stop GREEN, 4 concerns.

Regress was **not** re-run after review's fixes: they changed inside paths only (one new floor module, two CLIs that
now import it, one test, the close part and the CHANGELOG), no outside file, so no outside gate can flip; verify's
second run covers the final tree.

## Verdicts

verdict-grill: exit 0
verdict-build: exit 0
verdict-regress: no-regressions
verdict-verify: PASS
run-ended: GATE 2

- `verdict-grill` is `check-plan-lessons.mjs`'s exit in the (post-build) grill; `verdict-build` is `validate.mjs`'s
  exit at the build; the regress and verify lines are copied verbatim from `regression-report.json` and
  `verify-report.json` (verify's second run, stamp `0db23173…`).
- Not part of the block: the per-PR `check:surface-bump` is GREEN against `origin/main` (20 product paths, 7.6.0 →
  7.7.0).

changelog-entry: exit 0

## Pointers (advisory; not restated — P4)

- Review: `.dev/features/loop-grill-triage/REVIEW.md` — A1–A4 fixed.
- Grill: `.dev/features/loop-grill-triage/GRILL.md` — 4 concerns, all open as follow-ups.
- Verify: `.dev/features/loop-grill-triage/VERIFY.md`; regress: `.dev/features/loop-grill-triage/REGRESSION.md`;
  measurement: `.dev/features/loop-grill-triage/GRILL-CHECK-MEASUREMENT.md`.

lesson: none — the one recurring failure found (a removed command line still pinned by a test outside the plan) is
L72's shape, already canon; per L20 a further recurrence is the trigger for a floor remedy.

## Deferred

- Grill (P1): measure the triage producer against `grill-triage.mjs check` on real grills before part 2b adds more
  rounds that gate on it — the grill side was measured, the triage side was not.
- Grill (P7): state what a re-run after S16 is (a reverted SPEC, an existing feature directory, which stages repeat).
- Grill (P0, minor): state that a customized `default` makes `pharn-triage.md` disagree in an agreement check.
- pharn-cli: add `triage` to its `PRODUCT_STAGES` port and refresh the vendored checker, so a user may add a `triage`
  key without the CLI refusing the block (L31; no `MIN_CLI` change).
- Part 2b (automatic re-plan rounds) and part 3 (supervisor).

Chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate.
