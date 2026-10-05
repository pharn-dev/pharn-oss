# SHIP — gate-exclusion-config (6.36.0)

## Stages run, in order

1. `/pharn-dev-plan` → `PLAN.md` (`spec_content_hash` d831d30d…, `applied_lessons` 11 ids; `check-plan-lessons.mjs`
   exit 0). **GATE 1 — delegated.** Approved by the orchestrating model under the user's delegation (batch "make
   /pharn-loop fast", 2026-10-05). That is a model decision, not a human approval. The answers are recorded in the
   plan's "GATE 1" section.
2. `/pharn-dev-grill` → `GRILL.md`, run by an independent read-only Opus agent. Floor verdict: `check-plan-lessons.mjs`
   exit **0**. Interrogation: 12 concerns (0 blocking, 5 important, 7 minor, all advisory). All were taken into the
   plan as "Grill amendments". The build had started while the grill ran; that is recorded in the plan and the grill
   log.
3. `/pharn-dev-build` → `validate.mjs` exit **0** (`FLOOR: GREEN — 36 capabilities checked`). The full `npm run check`
   chain passed: ten gates, 4540 tests, 0 failing.
4. `/pharn-dev-regress` → `regression-report.json` `.verdict` = **`no-regressions`**. Base `ea0234b`; the 120 outside
   tests, validate and the one eval pair were 0 → 0.
5. `/pharn-dev-verify` → `verify-report.json` `.verdict` = **`PASS`**. Every gate was 0: test, validate, lint,
   format:check, lint:md, structural and reconcile. It was re-run after the review fixes, over the tree stacked on
   `main` 6.35.1, and was PASS again.
6. Review → `REVIEW.md`, an independent read-only Opus agent run by the orchestrator. It found **0 floor-gate
   findings** and 6 advisory findings, R1–R6, all fixed and tested under the orchestrator's delegated decisions.
   Verdict: **GREEN**.

**Where the run ended:** GATE 2.

- `changelog-entry: exit 0` (`node .dev/floor/check-changelog-entry.mjs --merge-base origin/main .` →
  `CHANGELOG-ENTRY: GREEN — 1 new entr(ies) … this PR opens "## [6.36.0] - 2026-10-05"`)
- `lesson: none` — no candidate clears L20's bar. The review's R4 (a guard keyed on a different reading than its
  consumer) is one instance of the shape L35 already names. R1 (a restatement left unconditional) is L64's. Neither is
  a second occurrence of a new mechanism.
- `deferred: none`

## Follow-ups named (not closed here)

`gate-exclusion-base-compare`, `gate-exclusion-summary-disclosure`, `gate-exclusion-bootstrap-pin`,
`gate-exclusion-build-gate`. Each one's reason is in `PLAN.md`, "Named residuals". They are not restated here (P4).

## Flags for the maintainer (human-only)

- `LIMITS.md §5`: "`/pharn-verify` re-runs the project's own gates" is now incomplete, not an overclaim. A replacement
  is proposed in `PROTECTED-FOLLOWUPS.md`. The file is human-only and was not edited.

**GATE 2 — the decision is the human's** (merge / fix / abandon). Merge: left to the maintainer. The branch is pushed
and its pull request is open, stacked as the orchestrator directs. Nothing was merged.

_chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate._
