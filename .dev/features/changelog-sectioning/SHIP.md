# SHIP — changelog-sectioning

## The stages that ran, in order

1. `/pharn-dev-plan` wrote `PLAN.md`, and `check-plan-lessons.mjs` was GREEN (17 cited ids).
   - One adversarial self-review round ran before the build. An independent read-only agent falsified seven
     claims and found a new defect class, "above/below" references that flip when entries move between
     sections. Each correction is recorded inline in `PLAN.md`.
   - **GATE 1** was approved by the model under the user's standing delegation for `/pharn-dev-ship` batch
     runs. It is recorded as a delegated model decision, not as a human approval.
2. `/pharn-dev-grill` → `check-plan-lessons.mjs` **exit 0** (the one floor stop), and the spec hash matched.
   It raised 6 advisory concerns (0 blocking, 2 important, 4 minor) and reviewed all six overrides. Each
   concern is placed in `VERIFY.md`.
3. `/pharn-dev-build` → `node pharn/floor/validate.mjs .` **exit 0** (`FLOOR: GREEN — 36 capabilities`).
   - The scope was the plan's 7 paths, and the reconcile epoch was anchored after the setter.
   - `sectionize.mjs --write` ran against `main` = `e8b6da2`, then Step 2b's scoped formatter, which left
     both generated files unchanged. `--verify` was GREEN after it.
4. `/pharn-dev-regress` → `regression-report.json` `.verdict` = **`no-regressions`** (both iterations).
5. `/pharn-dev-verify` → `verify-report.json` `.verdict` = **`PASS`** (both iterations; 10 gates, including
   the full `npm run check` and `sectionize:verify`).
6. `/pharn-dev-review` → 0 open floor-gate findings. Round 1 was an independent read-only agent. It found
   5 floor-gate defects, all in prose the increment wrote about itself; none was in the migration:
   - a false 1.0.0 history sentence, from a first-parent view that cannot see the side branch where
     `126e2b3` created 1.0.0;
   - an off-by-one section count;
   - an over-broad claim that every line cite had moved;
   - a `--verify` that compared only one of the two generated files;
   - a tautological invariant half.

   There are 7 advisory findings in `REVIEW.md`.

7. **GATE 2 → fix, then merge.** Both decisions were taken by the model under the same delegation.
   - The fix loop stayed inside the plan's `## Files`. The scope was re-set from the plan and amended onto
     the epoch, `CHANGELOG.md` was restored to the pinned input and regenerated, and build, regress and
     verify re-ran as iteration 2.
   - The merge happens once CI is green, and only if the G1 precondition still holds (below).

## Floor verdicts (verbatim)

- **`/pharn-dev-grill`:** `check-plan-lessons.mjs` exit **0**.
- **`/pharn-dev-build`:** `validate.mjs` exit **0**, in both iterations.
- **`/pharn-dev-regress`:** `"no-regressions"` (`check-regress.mjs` exit 0).
- **`/pharn-dev-verify`:** `"PASS"` (`check-verify.mjs` exit 0). `failing_gates: []`.

## What shipped

`CHANGELOG.md` is now one `## [X.Y.Z] - YYYY-MM-DD` section per `SKILLS_VERSION` value on `main`'s
first-parent history, built from git by `.dev/features/changelog-sectioning/sectionize.mjs`:

- 142 entries were moved byte-for-byte into 84 sections. The reverted `[6.5.0]` keeps a placeholder.
- The ghost `[5.0.0]` heading is gone, and one committed conflict-marker line is dropped. `[1.0.0]` is
  untouched.
- The entry texts were never edited. Their stale versions, the 21 ghost names, and the 6 checked "above"
  and "below" flips are named in the migration's own `[Unreleased]` entry and in `MIGRATION.md`.
- There is no `SKILLS_VERSION` bump: only `CHANGELOG.md` and `.dev/**` change.

**G1, the merge precondition.** The migration is pinned to `e8b6da2`. Right before merge, `origin/main`
must still be `e8b6da2`. If another PR has landed a CHANGELOG entry first, the fix is:

1. rebase;
2. restore `CHANGELOG.md` from the new `main`;
3. re-run `--write` inside a re-scoped build;
4. re-review any newly flagged entry.

It is checked right before merge. At this writing, `origin/main` = `e8b6da2` and there are no open PRs.

## Pointers

- `REVIEW.md` — both rounds, the fixed floor-gate findings and the open advisory ones.
- `MIGRATION.md` — the version table, the assignments, the overrides, the positional list and the bounds.
  `--verify` holds it to the render.
- `VERIFY.md` — the per-gate table, coverage, and the red-before-green mutants.
- `GRILL.md` — advisory.

lesson: none — the one surprise, 1.0.0 dated from first-parent history, is the shape L40 and L32 already
name. Every stage re-derived the claim with the same first-parent view that produced it, so the re-derivation
confirmed it rather than tested it. `main`'s first-parent chain has only two true merges, both from June, so
this instance has no live recurrence path.

deferred:

- follow-up `changelog-per-pr` (REVIEW advisory, important): give each bump its own section. It covers the
  byte-preserved `[Unreleased]` intro comment and `CLAUDE.md:99–100`. Until it lands, the first bump after
  this merge re-creates the old shape. Merge order matters.
- follow-up: `README.md:555` ("Since `6.5.0`") and `CLAUDE.md`'s "COST LEDGER trio (added 6.5.0)" name the
  reverted 6.5.0. Its entry is filed under `[6.5.2]`. This is pre-existing text.
- follow-up (product surface, bumps): repair `pharn/floor/gate-run-core.mjs:15`'s dead `CHANGELOG.md:1817-1818`
  cite to `CHANGELOG.md §6.3.0`.
- decision for the human: fold the two 1.0.0-era entries into `[1.0.0]`, which would lift the "untouched"
  constraint. Today they are filed under `[1.1.0]`, with evidence.
- 28 unverified "above"/"below" references are listed in `MIGRATION.md`. Some may also point the wrong way
  now.
- The two new test files run in `npm test` permanently (about 4 s). Renaming them off the `*.test.mjs`
  glob is a one-line change if that cost is unwanted.
- Git tags and GitHub releases are still not cut. That was the other half of the old
  `changelog-release-sections` follow-up.

Chain ran; the named floor verdicts are as shown. This is NOT a judgment that the increment is good or
wise; that is the human's call at the post-review gate.
