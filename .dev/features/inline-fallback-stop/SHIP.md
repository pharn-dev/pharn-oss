# SHIP — inline-fallback-stop

Linear CORE-105 (epic CORE-13). Gated `/pharn-dev-ship`, not `--loop`.

## Stages, in order

1. `/pharn-dev-plan` → `PLAN.md`, then **GATE 1**.
2. `/pharn-dev-grill` → `GRILL.md`: lessons declaration GREEN; 2 advisory concerns (1 important, 1 minor).
3. `/pharn-dev-build` → `BUILD.md`; floor GREEN. The build re-ran its Step 0 once, after the first epoch reconciled
   CLEAN, to add `README.md` (the version badge) to `## Files` before writing it.
4. `/pharn-dev-regress` → `regression-report.json`, `REGRESSION.md`.
5. `/pharn-dev-verify` → `verify-report.json`, `VERIFY.md`. Attempt 1's `test` gate was killed by a signal (exit 137)
   on a saturated machine; the stage was re-run from `init` and attempt 2 is the verdict below (`VERIFY.md` records
   both).
6. `/pharn-dev-review` → `REVIEW.md`: 0 floor-gate findings, 3 advisory (minor).

## The gates' decisions (delegated, never human approvals)

- **GATE 1 (plan approval):** approved as written, 2026-11-12, by the orchestrating model under the maintainer's
  delegation of every decision in this batch. Q1: accept and ignore the old flag (one stderr note, a duplicate copy
  refused with exit 2, the ignored path pinned by a test), with the edited-6.73.2 bound stated once in the residual and
  once in the CHANGELOG. Q2: removing the rule 6.74.0 kept is a model decision under delegation, citing
  `.dev/measurements/loop-baseline-2026-11-11.md` §4 (643k against 267k tokens per orchestrator request). Q3: minor
  bump to 7.11.0, `MIN_CLI` unchanged. Criterion 4 ships as pending the maintainer's observation.
- **GATE 2 (post-review):** delegated to this run under the batch rule (proceed to the PR only when verify is PASS,
  regress is clean and review has zero floor-gate findings). All three hold, so the decision is **proceed to the pull
  request**, made by the orchestrating model under that delegation. Advisory findings: two minor ones are recorded
  and not fixed (`ignored-note-wording`; the plan's G1 wording stays in the approved record), and the optional
  `pharn/LIMITS.md` §8 sentence goes to the PR body as a proposal (`limits-8-main-session-wait`).

## Verdicts

verdict-grill: exit 0
verdict-build: exit 0
verdict-regress: no-regressions
verdict-verify: PASS
run-ended: GATE 2

changelog-entry: exit 0

lesson: none — the one surprise (the README badge missing from `## Files`) was caught by an existing floor check
(`check:badge`), and L1 already names the meta-doc sweep; one miss does not meet L20's bar.

deferred: none

## Pointers

- Review: `.dev/features/inline-fallback-stop/REVIEW.md` (findings not restated here).
- Grill (advisory): `.dev/features/inline-fallback-stop/GRILL.md`.
- Acceptance criterion 4 (one real main-session run): **not met by this increment — pending the maintainer's
  observation**; if the wait fails there, the change is reverted and the finding recorded.

_Chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate._
