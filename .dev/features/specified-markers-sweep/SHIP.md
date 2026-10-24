# SHIP — specified-markers-sweep

Audit 2026-10-12 **ENF-8** (LOW): `check:markers` gains direction 3, the marker sweep. Branch
`fix/specified-markers-sweep`. Run as agent E of the 2026-10-23 audit LOW batch.

## Stages, in order

1. `/pharn-dev-plan` → `PLAN.md`; `check-plan-lessons.mjs` exit 0.
2. **GATE 1, plan acceptance.** Decided by the batch orchestrator under the maintainer's delegation: a **model
   decision, not a human approval**. APPROVED, with Q1 = the git listing, Q2 = forward claims not swept, Q3 = whichever
   PR merges second adjusts the exemption (resolutions recorded in `PLAN.md`).
3. `/pharn-dev-grill` → `GRILL.md`. Floor verdict: `check-plan-lessons.mjs` exit 0 → proceed. Advisory: 4 concerns
   (1 important: the worktree-skip assumption was unmeasured; it is now measured in a test).
4. `/pharn-dev-build` → `node pharn/floor/validate.mjs .` exit **0** (GREEN).
5. `/pharn-dev-regress` → `regression-report.json` `.verdict` = **`no-regressions`** (base `5e0c8e06`; 170 outside test
   files, per test 0 new failures).
6. `/pharn-dev-verify` → `verify-report.json` `.verdict` = **`PASS`** (test, validate, lint, format:check, lint:md,
   reconcile all 0; reconcile `CLEAN`).
7. `/pharn-dev-review` → `REVIEW.md`: 0 floor-gate findings, 4 advisory.
8. **GATE 2, post-review decision.** Delegated to the orchestrator as a model decision, not a human approval, per the
   batch brief: fix the important finding and the cheap, clearly right ones. Applied: the TRUST paragraph rewritten,
   the RED headline renamed to `finding(s)`, and two bounds stated in the header. Merging, pushing and opening the PR
   follow the brief; the merge decision stays with the orchestrator.

## After the review fixes and the merge of origin/main (6.72.3)

The fixes changed only a header comment and one output string in the checker, which is inside the feature's scope.
They were re-checked by the checker's suite (95/95), eslint and `check:markers`. Regress was not re-run: its outside
gates cannot flip on an inside-only text change. Verify's gate set was then covered by a full `npm run check` on the
merged tree, exit **0** (5924 passed, 0 failed, reconcile `CLEAN`), plus `validate.mjs` exit **0**.
`check:surface-bump`: GREEN, no product-surface path changed.

- changelog-entry: exit 0
- lesson: deferred — the batch brief forbids promotion in this run. Candidate: "A checker whose new direction widens its
  input set must re-derive its own TRUST/scope header: the 'no untrusted input' sentence became false the moment the
  sweep read untracked files" (L33's expiry pattern applied to a checker's own header; source: `REVIEW.md` L-trust
  finding).
- deferred: none

Artifacts: `PLAN.md`, `GRILL.md`, `REGRESSION.md` + `regression-report.json`, `VERIFY.md` + `verify-report.json`,
`REVIEW.md` (findings cited there, not restated).

Chain ran; the named floor verdicts are as shown. This is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate.
