# SHIP — ac-tests-style-gate (issue #409)

Run as one `/pharn-dev-ship` increment inside an isolated worktree, driven by an orchestrator session. The human
maintainer is reached only through that orchestrator.

## Stages, in order, and where the run ended

1. `/pharn-dev-plan` → `PLAN.md`. GATE 1: the human APPROVED it, relayed by the orchestrator. Answers: Q1 (a) and Q2
   (keep all three defaults), recorded in the plan.
2. `/pharn-dev-grill` → `GRILL.md`. Lessons declaration `check-plan-lessons.mjs` **exit 0**. Advisory interrogation: 4
   concerns (0 blocking-severity).
3. `/pharn-dev-build` → `validate` **exit 0** (`FLOOR: GREEN — 37 capabilities checked`).
4. `/pharn-dev-regress` → `regression-report.json` `.verdict` **`"no-regressions"`**.
5. `/pharn-dev-verify` → `verify-report.json` `.verdict` **`"PASS"`** (`failing_gates: []`).
6. `/pharn-dev-review` → `REVIEW.md` (advisory; 0 floor-gate findings).

**Ended at GATE 2.**

**Mid-run event (recorded in PLAN.md, "Notes — mid-run fast-forward and re-anchor").** After the first regress run
(base `607d82c2`: `no-regressions`, with 12 pre-existing `tests` failures from #407's scratch-tree fixtures), the
orchestrator had this worktree fast-forwarded to `0b18864b`, which fixes those failures. Before the fast-forward,
reconcile was `CLEAN` with `escapes: []`. The orchestrator chose a re-anchor, because §2a `merged` covers only upstream
commits. The build's Step 0 was re-run (setter, then `--anchor`), and regress and verify then ran again on the new
epoch. The verdicts above are from that second pass.

## Verdicts (verbatim)

- `/pharn-dev-grill` → `check-plan-lessons.mjs` exit `0`
- `/pharn-dev-build` → `node pharn/floor/validate.mjs .` exit `0`
- `/pharn-dev-regress` → `.verdict`: `"no-regressions"` (base `0b18864b`; `tests` 0/0, `validate` 0/0, `structural` 0/0;
  per-test `new_failures: []`)
- `/pharn-dev-verify` → `.verdict`: `"PASS"` (test, validate, lint, format:check, lint:md, structural, reconcile all `0`;
  reconcile `CLEAN`, `escapes: []`)

changelog-entry: exit 0

## Pointers

- Review findings: `.dev/features/ac-tests-style-gate/REVIEW.md` (advisory; not restated here).
- Grill log: `.dev/features/ac-tests-style-gate/GRILL.md` (advisory).

## Lesson

lesson: pending — the human chose Promote at 2b.3 (2026-11-02, asked by the orchestrator) for the candidate in
`REVIEW.md` (a hand-listed scratch-tree module copy breaks on a new import). `/pharn-dev-memory-promote` runs after
this branch merges, outside every build window, and its own gate decides; that change replaces this line with
`promoted L<n>` or `skipped`.

deferred: two concurrent agents shared one scratchpad directory, and a sibling's `regress-base` worktree already held
the name this run first chose. This run used unique names; the convention is not written down anywhere.

---

The chain ran, and the named floor verdicts are as shown above. This is NOT a judgment that the increment is good or
wise; that is the human's call at the post-review gate.
