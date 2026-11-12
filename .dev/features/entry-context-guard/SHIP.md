# SHIP — entry-context-guard

Linear CORE-103 (epic CORE-13). Gated `/pharn-dev-ship`, not `--loop`.

## Stages, in order

1. `/pharn-dev-plan` → `PLAN.md`, then **GATE 1**. The ticket's probe criterion was run before the plan was final:
   the run-start-style line's tool result was on disk in this agent's transcript by the next Bash call, and
   `transcript-core.mjs` bound it to this agent's context alone. **Advisory evidence:** one client, one Claude Code
   version (`PLAN.md`, "The probe").
2. `/pharn-dev-grill` → `GRILL.md`: lessons declaration GREEN; 3 advisory concerns (2 important, 1 minor), all three
   folded into the plan before the build (walk order, not timestamps; the check as its own Bash call after the
   run-start result; the core header names its file reads).
3. `/pharn-dev-build` → floor GREEN (`validate.mjs` exit 0); `npm run check` exit 0 locally.
4. `/pharn-dev-regress` → `regression-report.json`, `REGRESSION.md`.
5. `/pharn-dev-verify` → `verify-report.json`, `VERIFY.md`.
6. `/pharn-dev-review` → `REVIEW.md`: 0 floor-gate findings, 4 advisory.
7. Iteration 2 (GATE 2's fix rule): review findings 1 and 2 fixed inside `## Files`; then `origin/main` moved twice
   (CORE-105 merged as 7.11.0, CORE-75 as 7.12.0), each merged in with no force-push, the released CHANGELOG sections
   kept byte for byte, and the bump renumbered 7.11.0 → 7.12.0 → 7.13.0. Regress and verify were re-run on the final
   tree (base `f47b94e1`); the verdicts below are that run's. Two interim runs were stopped when main moved under them
   and are not verdicts.

## The gates' decisions (delegated, never human approvals)

- **GATE 1 (plan approval):** approved, 2026-11-12, by the orchestrating model under the maintainer's delegation of
  every decision in this batch. Q1: default threshold 320,000 tokens (the 36-run stopped / let-through table and its
  margins in the floor-gates guide, summarized in the CHANGELOG). Q2: S15b, `blocked: context-too-large`. Q3: every
  unknown reason exits 0 and the run goes on, but the loop's Step 7 summary and `/pharn-ship`'s GATE-1 note quote an
  `unknown` line, so a malformed key is visible. Q4: a fourth inline projects-dir default, follow-up
  `projects-dir-default-one-owner`. The PR body names the unchecked point: whether pharn-cli refuses an unknown
  `budget` key.
- **GATE 2 (post-review):** delegated to this run under the batch rule (proceed to the PR only when verify is PASS,
  regress is clean and review has zero floor-gate findings). All three hold on the final tree, so the decision is
  **proceed to the pull request**, made by the orchestrating model under that delegation. Advisory findings 1 and 2
  were fixed; finding 3 is follow-up `entry-context-undecidable-holder-reason`; finding 4 is accepted as stated.

## Verdicts

verdict-grill: exit 0
verdict-build: exit 0
verdict-regress: no-regressions
verdict-verify: PASS
run-ended: GATE 2

changelog-entry: exit 0

lesson: none — no finding shows a recurring mechanism failure; the review's four findings are one-off precision slips,
below L20's bar.

deferred: none

## Pending human-only edit

- `pharn/LIMITS.md` §3g: one bullet (the entry-context figures, the S15b stop, its floor/advisory split), delivered as
  a Python patch script outside the repo, to be applied by the maintainer after this verify (L68). Not in this tree.

## Pointers

- Review: `.dev/features/entry-context-guard/REVIEW.md` (findings not restated here).
- Grill (advisory): `.dev/features/entry-context-guard/GRILL.md`.

_Chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate._
