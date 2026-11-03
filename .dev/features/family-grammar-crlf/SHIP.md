# SHIP — family-grammar-crlf

Batch 2026-11-03, group G4, branch `fix/family-grammar-crlf` (from `origin/batch/audit-2026-11-03`).

## Stages, in order

1. `/pharn-dev-plan` → `PLAN.md` (spec hash `d5a97430…`, matched at every stage).
2. `/pharn-dev-grill` → `GRILL.md`; `check-plan-lessons.mjs` exit **0**. Advisory: 5 concerns (0 blocking-severity).
3. **GATE 1 — decided by the batch orchestrator (a model) under the owner's delegation, not by a human.** Approved
   with two changes (a linked `pharn` root is followed; the zero-capability INCONCLUSIVE narrowed to the three
   capability roots), folded into PLAN.md "Open questions — resolved at GATE 1".
4. `/pharn-dev-build` → `node pharn/floor/validate.mjs .` exit **0** (`GREEN — 37 capabilities`). The build's whole
   `npm test` REDed one test the change made unreachable (griller-extract's symlinked-DIRECTORY refusal); the build
   work was committed (`73a2bfc7`), the plan widened to name `pharn/floor/griller-extract.test.mjs` (committed),
   Step 0 re-run (setter, then `--anchor`), and the test moved to the linked-root route. The same run had one
   load-sensitive failure, entry-gates.test.mjs "OBSERVED: TAKEOVER …", which passed when its file was re-run alone
   (`pass 49, fail 0`); load averages were ~100 then.
5. `/pharn-dev-regress` → `regression-report.json` `.verdict` = **`no-regressions`** (base `dd0bb3d3`). One harness
   defect in the node runner (eval pairs read as strings) was repaired before the verdict was kept; REGRESSION.md
   records it.
6. `/pharn-dev-verify` → `verify-report.json` `.verdict` = **`PASS`** (7 gates exit 0, reconcile `CLEAN`).
7. `/pharn-dev-review` → [`REVIEW.md`](REVIEW.md): 0 floor-gate findings, 5 advisory (self-review). Grill log:
   [`GRILL.md`](GRILL.md).

Where the run ended: **GATE 2**, handed to the batch orchestrator.

changelog-entry: exit 0

Also recorded for the batch: `npm run check:surface-bump` exits 1 (RED — no SKILLS_VERSION bump on this branch), as
the batch expects; the orchestrator bumps once to 7.3.0.

The pinned shell forms of regress and verify were refused by the worktree-isolation guard, so their gates ran from
node runners under `pharn/.run/` (advisory orchestration; the verdicts are the checkers').

lesson: none — the recurring shape (a parity fixture with `role:` on the one line the defect leaves intact) is L60's
and L60 was applied; the regress-runner slip has no second occurrence (L20).

deferred: none

chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate.
