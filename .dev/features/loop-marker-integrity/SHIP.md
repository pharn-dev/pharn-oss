# SHIP — loop-marker-integrity

Batch audit-2026-11-03, group G2. Branch `fix/loop-marker-integrity` (from `origin/batch/audit-2026-11-03` ==
`dd0bb3d3`). Gates in this run were decided by the batch orchestrator (a model) under the owner's delegation. That is
recorded here as such, never as a human approval.

## Stages, in order

| stage                | result                                                                                                                                                                                               |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/pharn-dev-plan`    | PLAN.md; `check-plan-lessons` GREEN (12 lessons cited)                                                                                                                                               |
| `/pharn-dev-grill`   | lessons re-verification exit 0 (GREEN); GRILL.md: 5 advisory concerns (0 blocking), folded into the plan                                                                                             |
| GATE 1               | approved as planned (D1, D3 confirmed; item 8 won't-fix) — **decided by the batch orchestrator (a model) under the owner's delegation**                                                              |
| `/pharn-dev-build`   | `validate` exit 0 (GREEN). Amendments A1 (isolation flag only first) and A2 (an independent review of apply.py: write-tool deny on run state, `--close` refusal), both in PLAN.md                    |
| human patch          | `apply.py` run by the owner; AFTER hashes verified (`b9efeccb…`, `bdac155c…`); committed `bc9c9bc8`; `apply.py` deleted, never committed; build Step 0 re-run (setter, `--anchor`) after that commit |
| `/pharn-dev-regress` | `regression-report.json` `.verdict`: `no-regressions` (first scope run: 2 escapes, the two maintainer-applied hooks, resolved by listing them in `## Files` — see REGRESSION.md)                     |
| `/pharn-dev-verify`  | `verify-report.json` `.verdict`: `PASS` (test, validate, lint, format:check, lint:md, structural, reconcile all exit 0)                                                                              |
| `/pharn-dev-review`  | REVIEW.md: VERDICT GREEN — 0 floor-gate findings, 6 advisory                                                                                                                                         |

Where the run ended: **GATE 2** (handed to the batch orchestrator).

GATE 2 decision: **MERGE** into `batch/audit-2026-11-03` at integration — **decided by the batch orchestrator (a model)
under the owner's delegation**, not a human approval. Follow-ups it asked for, done after the decision: one sentence
each in CLAUDE.md hard constraint 1 and `.dev/guides/writes-scope.md` naming the run-state deny (both declared in
`## Files` first; the scope set with `--allow-claude-dir`, because `## Files` now lists the two maintainer-applied
hooks and the setter refuses them otherwise — `protect-trusted-paths.cjs` still denies the write tools both files);
`check-run-isolation.mjs:47` is left for integration; the lesson candidate stays in REVIEW.md, unpromoted.

## Structural verdicts, verbatim

- `/pharn-dev-build` → `node pharn/floor/validate.mjs .` exit `0`
- `/pharn-dev-regress` → `regression-report.json` `.verdict` = `no-regressions`
- `/pharn-dev-verify` → `verify-report.json` `.verdict` = `PASS`

Advisory: GRILL.md, REVIEW.md (cited, not restated).

changelog-entry: exit 0

lesson: error 2b.3 could not ask — this run is a subagent with no channel to a human; the one candidate (a guard that
closes one write route for a file must enumerate every writer of that file) is in REVIEW.md, handed to the
orchestrator to put to the owner

deferred: none

## Notes for the orchestrator

- `npm run check:surface-bump` exits 1 (product paths changed, `SKILLS_VERSION` unchanged) — expected in this batch.
- `pharn/floor/check-run-isolation.mjs:47` still says the Write tool reaches the witness; left for the group S merge.
- DOCS-PROPOSAL.md holds five owner-applied trusted-doc blocks (LIMITS ×4, THREAT-MODEL ×1).

_chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate._
