# SHIP — lesson-heading-parser

Batch 2026-11-03, group G9, branch `fix/lesson-heading-parser` (from `origin/batch/audit-2026-11-03` @ `fb997e4b`).

## Stages, in order

1. `/pharn-dev-plan` → `PLAN.md`; `check-plan-lessons` GREEN (14 cited ids).
2. **GATE 1 — decided by the batch orchestrator (a model) under the owner's delegation; not a human approval.**
   Decisions 1–5 and 7 as recommended; 6 approved except `pharn/floor/merge-findings.mjs` (G8's, left alone). The
   PLAN records them.
3. `/pharn-dev-grill` → `GRILL.md`; Step 1b `check-plan-lessons` exit **0**; 6 advisory concerns, folded into the
   PLAN at GATE 1.
4. `/pharn-dev-build` → `BUILD.md`; `validate` exit **0** (`FLOOR: GREEN — 37 capabilities`).
5. `/pharn-dev-regress` → `regression-report.json` `.verdict` = **`no-regressions`** (base `fb997e4b`).
6. `/pharn-dev-verify` → `verify-report.json` `.verdict` = **`PASS`** (all 7 gates exit 0, reconcile `CLEAN`).
7. `/pharn-dev-review` → `REVIEW.md`: one floor-gate finding (R1, check-provenance's unclosed-block rule) FIXED in
   `6cb9abd8`, after which regress (`no-regressions`) and verify (`PASS`) were re-run; 3 advisory findings remain.

Ended at **GATE 2**.

- changelog-entry: exit 0
- lesson: none — R1 is a first occurrence of its mechanism (L56's family, caught by review before merge), below L20's
  bar; the canon L14 correction is an owner decision carried in `DOCS-PROPOSAL.md`, not a lesson-extract candidate.
- deferred: none

Pointers: `REVIEW.md` (findings, cited not restated), `GRILL.md` (advisory), `DOCS-PROPOSAL.md` (canon L14,
owner-applied).

Other gates run at GATE 2 (not proceed/stop inputs): `format:check`, `lint`, `lint:md`, `docs:check`,
`check:markers`, `check:badge`, `check:changelog`, `check:contributing`, `check:reconcile` all exit 0;
`check:surface-bump` exit 1 (expected in this batch: product paths changed, no `SKILLS_VERSION` bump — the
orchestrator bumps once to 7.3.0).

## GATE 2 decision

**Decided by the batch orchestrator (a model) under the owner's delegation; not a human approval:** MERGE into
`batch/audit-2026-11-03` at integration. Canon L14: **Option B** (a new correction entry, as L77 corrected L31/L35;
canon is not rewritten in place) — the integrator folds it into the owner's docs script and renumbers if needed.
REVIEW R2 and R3 stay advisory.

_Chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that
is the human's call at the post-review gate._
