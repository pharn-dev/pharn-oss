# SHIP — regress-base-reuse

An advisory roll-up of the `/pharn-dev-ship` chain for this increment. Within one `/pharn-loop` or `/pharn-ship` run,
a later `/pharn-regress` reuses the BASE-side evidence an earlier one left, when tested code shows it agrees with the
current BASE requirement. The HEAD side always runs (6.33.0). This file records that the chain ran and its floor
verdicts. It is not an approval, not a "shipped" and not a `PHARN ✓ reviewed` seal.

## Where the run ended

**GATE 2**, after `/pharn-dev-review` and the GATE-2 review fixes. Nothing is committed, pushed or merged. The
merge/fix/abandon decision is the human's.

## Stages, in order

1. `/pharn-dev-plan` → `PLAN.md`. **GATE 1: approved by the orchestrator** under the maintainer's instruction in the
   invocation ("Do not stop after writing a PLAN. Complete implementation, validation and final diff review."). This is
   a model decision made under delegation, **not a human approval**.
2. `/pharn-dev-grill` → `GRILL.md`. It was run by an independent read-only opus context and is advisory: 13 findings
   (5 important, 8 minor), all accepted and folded into the plan before the build (PLAN.md, "Grill amendments").
   `check-plan-lessons.mjs` exit **0** (re-run at this step: exit 0).
3. `/pharn-dev-build` → the plan's `## Files`, with the reconcile baseline anchored `--by pharn-dev-build`.
   `node pharn/floor/validate.mjs .` exit **0** (GREEN, 36 capabilities).
4. `/pharn-dev-regress` → `regression-report.json` `.verdict`: **`no-regressions`**.
   - Base `a2b5f6b`; 3 outside gates, 0/0 on both sides; `escaped: []`.
   - Run at iteration 1 and again at iteration 3, over the final tree.
5. `/pharn-dev-verify` → `verify-report.json` `.verdict`:
   - iteration 1: **`FAIL [lint]`**, an unused import in `stage-regress.test.mjs`, removed under the plan's scope;
   - iteration 2: stopped before its verdict, because the review fixes changed the tree;
   - iteration 3: **`PASS`**. 7 gates were 0; `npm test` passed 4394 / 4394; reconcile was CLEAN, with 23 paths
     reconciled and no escapes.
6. `/pharn-dev-review` → `REVIEW.md`, from an independent read-only opus context.
   - **2 floor-gate findings**, both claim sentences in shipped text: a provenance claim labelled floor (L43), and
     "a standalone regress never reuses".
   - 3 minor findings. One of them, A2, was a real publication gap: a root-level HEAD file edited while a budgeted
     chain was paused could get bound to evidence produced under its old content.
   - All five were fixed inside the plan's `## Files`. A2 has a unit case and an end-to-end control, and each fails
     with the fix line deleted. `REVIEW.md` "Disposition" lists each fix. The findings are not restated here.
   - **GATE 2 fix-before-present: a model decision under the same delegation**, not a human one.

## Measurement

`MEASUREMENT.md`, 3 repetitions each.

- On `main`, every invocation makes 1 worktree checkout, 1 install, 3 base gate runs and 3 head gate runs, in about
  10.1–10.6 s.
- On this branch, the second invocation of one run makes 0 checkouts, 0 installs, 0 base gate runs and 3 head gate
  runs, in about 4.4 s.
- The decision itself costs about 17–18 ms.
- No token saving is claimed.

## Recorded lines

- changelog-entry: exit 0
- lesson: none. The review's two floor-gate findings are another occurrence of L43 (agreement, never provenance),
  plus an absolute that dropped a bound its own CHANGELOG entry named. L43 already covers the class, so no remedy
  reduces to "remember next time" beyond it.
- deferred: `regress-paused-chain-integrity`. The base side's in-progress scratch is write-tool reachable while a chain
  is paused at `continue`. It is a named residual, not built here.
- deferred: the other named residuals in PLAN.md "Named residuals" (Bash forgery of record + evidence, a stale ≤ 24 h
  marker binding a later regress, retention stretching check J's window, a leftover `*.tmp-<pid>` after a kill).
  Each is stated in the contract or the module headers.

## Pointers

- `PLAN.md` — the design, the requirement, the predicate, the tests and the named residuals.
- `GRILL.md` — the grill (advisory).
- `REVIEW.md` — the review's findings (free text quoted there as data) and their disposition.
- `REGRESSION.md` / `VERIFY.md` — the stage renders; `regression-report.json` / `verify-report.json` — the verdicts.
- `MEASUREMENT.md` / `measure.mjs` — the before/after counts and timings.
