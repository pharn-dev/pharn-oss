# SHIP — scanner-redos-sweep-2

Gated `/pharn-dev-ship`, run by a batch agent under the orchestrator's delegation of both human gates (2026-10-20
brief). Both gate decisions below are **model decisions under that delegation, not human approvals**.

## Stages, in order

1. `/pharn-dev-plan` → `PLAN.md`; `check-plan-lessons.mjs` exit 0 (L24, L60, L74, L19).
2. **GATE 1** — approved by the model under delegation: the plan matches the discovery notes' approach (one-pass
   stack, precomputed indicator starts + binary search, newline offsets, merged intervals, per-line `.catch(` memo)
   and has no open design question.
3. `/pharn-dev-grill` → `GRILL.md`; floor verdict `check-plan-lessons.mjs` exit 0; 3 advisory concerns (all harness
   mechanics, folded into the build).
4. `/pharn-dev-build` → `validate` exit **0** (GREEN, 37 capabilities), before and after the merge of `origin/main`.
5. `/pharn-dev-regress` → `regression-report.json` `.verdict`: **`no-regressions`** (`tests` red at both base and head,
   so pre-existing).
6. `/pharn-dev-verify` → `verify-report.json` `.verdict`: **`FAIL`**, `failing_gates: ["test"]`. All 3 failing tests
   are in `pharn/floor/entry-base-evidence.test.mjs`, one of the brief's known load-timing suites. Every other gate was
   exit 0, including `reconcile` (`CLEAN`). Under the brief's delegation ("a local verify FAIL that is only the known
   load-timing tests may proceed — CI measures"), the run proceeded to review instead of stopping. That is a model
   decision under delegation; CI is the measurement.
7. `/pharn-dev-review` → `REVIEW.md`: 0 floor findings; 6 advisory findings from an independent reviewer subagent
   (about 750k old-vs-new probes, 0 divergences), 5 fixed and 1 accepted.
8. **GATE 2** — decided by the model under delegation: the review findings were fixed (one important: a missing ★ row
   for the per-op range loop), `origin/main` (6.71.1, #376) was merged and the version renumbered to **6.71.2**, and
   the PR was opened: <https://github.com/pharn-dev/pharn-oss/pull/377>. Merging is the orchestrator's call.

Advisory artifacts: `GRILL.md`, `REVIEW.md` (cited, not restated), `MEASUREMENTS.md`.

changelog-entry: exit 0

lesson: skipped — the batch brief defers every lesson ("record `lesson: deferred` with the candidate text; do NOT
promote canon in this batch"). Candidate (from REVIEW.md, "Proposed lesson candidate"): a ★ timeout row pins a cost
only for the slow steps its shape reaches; when several quadratic steps are fixed at once, restore each one alone in a
mutant and show some ★ row is killed by it — L60's per-property negative control applied to cost. Source: REVIEW.md
finding 1, `pharn/floor/scan-code-missing-error-handling.test.mjs:415`.

deferred: none

_Chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate._
