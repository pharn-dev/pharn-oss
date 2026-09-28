# SHIP — orchestrator-context

An advisory roll-up of the `/pharn-dev-ship` chain for this increment: `/pharn-loop` and `/pharn-ship` keep their
`--quick` deltas and their stop procedure in four part files, each read at one named point (6.32.0). It records that
the chain ran and its floor verdicts. It is not an approval, a "shipped" and not a `PHARN ✓ reviewed` seal.

## Where the run ended

**GATE 2**, after `/pharn-dev-review`, one GATE-2 fix and a merge of `origin/main`. The merge/fix/abandon decision is
the human's.

## Stages, in order

1. `/pharn-dev-plan` → `PLAN.md`. **GATE 1: approved by the orchestrator** under the maintainer's instruction in the
   invocation ("an implementation task. Do not stop at an audit or a proposed PLAN"). A model decision, not a human
   approval.
2. `/pharn-dev-grill` → `GRILL.md` (advisory, 12 concerns, 0 blocking, folded into the plan as G1–G12).
   `check-plan-lessons.mjs` exit **0**.
3. `/pharn-dev-build` → `BUILD.md`. `node pharn/floor/validate.mjs .` exit **0**.
4. `/pharn-dev-regress` → `regression-report.json` `.verdict`: **`no-regressions`** (base `9490b1b`).
5. `/pharn-dev-verify` → `verify-report.json` `.verdict`: **`PASS`** (7 gates, reconcile CLEAN).
6. `/pharn-dev-review` → `REVIEW.md` (an independent opus context): **2 floor-gate findings** (claims that the tests
   pinned a pointer's load condition and not-loaded rule, and where each line lives — each reproduced by a mutant that
   left the suite green), plus advisory findings. Read `REVIEW.md`; its findings are not restated here.
7. **GATE-2 fix** (`d2a059d`, under the plan's scope, `--amend-scope` amendment 3): FG1 fixed by pinning, FG2 by
   narrowing the claims; the advisory findings applied or stated are listed in `BUILD.md`, "After the review".
8. **Merge of `origin/main`** (`656d60b`, 6.31.2; merge commit `e7c8c98`). Conflicts only in `CHANGELOG.md`, the README
   badge and `SKILLS_VERSION`; main's `[6.31.2]` section and everything below it are byte-identical to `origin/main`'s.

## Verdicts after the merge

The regress and verify stages were not re-run over the merged tree. `main`'s commit touches no command file and none
of this increment's paths but `run-marker.test.mjs` (an appended test, merged cleanly). What ran instead, on HEAD
`e7c8c98`:

- `npm run check` → **exit 1 at `check:reconcile`**, every gate before it GREEN (format, lint, lint:md, docs, markers,
  badge `6.32.0`, changelog, contributing). The 5 escapes are exactly files `main`'s 6.31.2 changed outside this plan's
  scope (set difference: 0 escapes that main did not change). The build's epoch cannot attribute a `git merge`'s
  writes; CI holds no baseline and reads `NO_BASELINE`. The baseline was not edited.
- `npm test` (run separately, since the chain stops at reconcile) → **4267 tests, 4266 pass, 1 fail**: 6.31.2's own
  `★ L6: projectRoot() follows CLAUDE_PROJECT_DIR when cwd is a subdirectory`, which fails the same way on a clean
  export of `origin/main` on macOS (`/var` resolves to `/private/var`) — not this increment's; flagged as its own task.
  Before the merge, the fix's targeted files passed 980 / 980.
- `node pharn/floor/validate.mjs` on a clean export of HEAD → **GREEN — 36 capabilities** (base: 36). `BUILD.md`'s
  first "37" counted a scratch file under `.pharn/`; corrected there.

## Recorded lines

- changelog-entry: exit 0
- lesson: skipped
- deferred: REVIEW.md's candidate ("a sentence saying what a TEST pins is written from the test's pin list, never from
  the plan's test design — probe it with one mutant per noun"), declined for canon by the human at 2b.3 and kept as
  evidence for L64: the L37 → L64 class recurred a third time, here in claims about what a test pins.
- GATE 2 (partial, by the human through the 2b.3 form): push the branch and open a pull request. Merging stays the
  human's.

## Pointers

- `REVIEW.md` — the review's findings (free text quoted there as data).
- `GRILL.md` — the grill (advisory).
- `BUILD.md` — what landed, the measurement, the installer check, and "After the review".

_Chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate._
