# SHIP — plan-scope-hardening

Branch `fix/plan-scope-hardening`, base `dd0bb3d3` (`origin/batch/audit-2026-11-03` = `main`). The run ended at
**GATE 2**.

## Stages, in order

1. `/pharn-dev-plan` → `PLAN.md`. **GATE 1: decided by the batch orchestrator (a model) under the owner's delegation,
   2026-11-03** — not a human approval. Decisions 1–5 approved (1 with plan-time conditions), 6 changed (`core.hooksPath`
   is fail-closed only in an installed project); two further revision rounds came from the orchestrator after
   adversarial reviews (round 2: absolute/escape entries, comment semantics, raw HTML, lone CR, the one-contiguous-list
   rule; round 3: quote/control/token checks, NUL-safe Step 2b, item-marker and indent rules).
2. `/pharn-dev-grill` → `GRILL.md`. Lessons declaration (FLOOR, `check-plan-lessons.mjs`): exit `0`. Interrogation:
   advisory, 6 concerns, 0 blocking.
3. `/pharn-dev-build` → `BUILD.md`. The guard hook `set-writes-scope.cjs` was applied by the maintainer (owner ran the
   round-3 `apply.py`; the AFTER hash `ecd2812e…` was verified on disk; `apply.py` was deleted, never committed),
   committed as `df3f5620` "plan-scope-hardening: maintainer-applied human patch"; Step 0 (setter, then `--anchor`)
   was re-run after that commit; then the Step 2b glob fix (`472e2dbc`). `validate` → exit `0`.
4. `/pharn-dev-regress` → `regression-report.json` `.verdict`: **`no-regressions`** (exit `0`; `REGRESSION.md`).
5. `/pharn-dev-verify` → `verify-report.json` `.verdict`: **`PASS`** (exit `0`, `reconcile` `CLEAN`; `VERIFY.md`).
6. `/pharn-dev-review` → `REVIEW.md` (advisory; cited, not restated): GREEN, 0 floor-gate findings. One **important**
   advisory finding holds the human's attention — Step 2b's symlinked-parent gap, with a fix proven in a lab copy and
   not applied, because applying it needs `--allow-claude-dir`, which the agent does not add itself.

## Gate 2 records

- `changelog-entry: exit 0` — `CHANGELOG-ENTRY: GREEN — 4 new entr(ies) against the base (--merge-base origin/main
(dd0bb3d39449))`.
- Not a ship input, recorded as expected: `npm run check:surface-bump` is **RED** (`NOT_BUMPED`, 7 product-surface
  paths, `SKILLS_VERSION` still `7.2.1`) — by the batch's rule this branch does not bump; the integration branch cuts
  `7.3.0`.
- `lesson: none` — no candidate clears L20's bar: each of the four adversarial rounds' catches was remedied by a code
  change with a test pin, never by "remember next time" (`REVIEW.md`, "Lesson candidate"). No human could be asked
  at 2b.3 in this delegated run; with no candidate there was nothing to ask.
- `deferred: none`

## Pointers

`PLAN.md` · `GRILL.md` (advisory) · `BUILD.md` · `REGRESSION.md` · `VERIFY.md` · `REVIEW.md` · `DOCS-PROPOSAL.md`
(trusted-doc wording for a human to apply).

_chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate._
