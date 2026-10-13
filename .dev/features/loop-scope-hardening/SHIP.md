# SHIP — loop-scope-hardening

**Where the run ended:** GATE 2 (after `/pharn-dev-review`), on the second pass through build → regress → verify →
review. The first pass stopped on a RED at `/pharn-dev-regress`.

## Stages and verdicts (verbatim)

| stage                       | verdict read                                                                       |
| --------------------------- | ---------------------------------------------------------------------------------- |
| `/pharn-dev-plan`           | halted at GATE 1                                                                   |
| GATE 1                      | approved — delegated (below)                                                       |
| human patch 1               | applied by the human maintainer (below)                                            |
| `/pharn-dev-grill`          | `check-plan-lessons.mjs` exit 0                                                    |
| `/pharn-dev-build` (pass 1) | `validate.mjs .` exit 0                                                            |
| `/pharn-dev-regress` (1)    | `regressions` — STOP                                                               |
| fix decision                | FIX via a new build pass — delegated (below)                                       |
| `/pharn-dev-build` (pass 2) | `validate.mjs .` exit 0                                                            |
| `/pharn-dev-regress` (2)    | `no-regressions`                                                                   |
| `/pharn-dev-verify`         | `PASS` (`failing_gates: []`; `reconcile` CLEAN)                                    |
| `/pharn-dev-review`         | GREEN — 0 floor-gate findings, 6 advisory (1 important, 5 minor) — see `REVIEW.md` |

- **GATE 1** — delegated: decided by the orchestrating model under the maintainer's 2026-10-13 delegation, not a
  human approval. Answers in `PLAN.md` § GATE 1.
- **Human patch 1** — `.claude/hooks/set-writes-scope.cjs` was applied by the human maintainer, outside the agent
  loop, from `.pharn/loop-scope-hardening/human-patch/apply-set-writes-scope.py` (pre-image sha256 `fa566784…`,
  post-image `a7f84911…`, verified by the orchestrator), and committed as `a809c32` before the first build's anchor
  (L68). That is a human step.
- **Fix decision after the regress RED** — delegated: decided by the orchestrating model under the maintainer's
  2026-10-13 delegation: fix through a fresh build pass (the consumer test added to `## Files` before that pass's
  anchor), re-run regress, renumber to 6.61.0, and prepare human patch 2. `PLAN.md` § Fix-loop pass 1.
- **Human patch 2** — comment-only: removes the release numbers from the hook header's three new sections.
  `.pharn/loop-scope-hardening/human-patch/apply-set-writes-scope-2.py` (pre `a7f84911…`, post `9fd5f30a…`), verified
  on a throwaway copy and at a real repo path (prettier, eslint); reviewed by the orchestrator and applied by the human
  maintainer after GATE 2, outside the agent loop (a human step), then committed on its own.
- **GATE 2** — delegated: decided by the orchestrating model under the maintainer's 2026-10-13 delegation, not a
  human approval. Decision: MERGE. The five minor advisories in `REVIEW.md` are accepted as follow-ups named in the PR
  body (including a header sentence on the `pharn/features/..` spelling, which needs another hook patch).
- **Merge order** — after the grill-trim PR (6.60.0) and one no-bump PR; this increment ships as 6.61.0, renumbered by
  diff if `main` moves again.
- Artifacts: `PLAN.md`, `GRILL.md` (advisory), `REGRESSION.md` + `regression-report.json`, `VERIFY.md` +
  `verify-report.json`, `REVIEW.md` (advisory).

changelog-entry: exit 0

lesson: skipped

A candidate was proposed (`REVIEW.md` § Proposed lesson candidate, kept there as the draft) and declined for
promotion in this batch — delegated decision at GATE 2: parallel PRs would collide on the next `L<n>` number; the
orchestrator lists the draft for the maintainer.

deferred: none

Chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate.
