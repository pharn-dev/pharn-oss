# SHIP — core-299-reap-start-time (Linear CORE-299, epic CORE-294, 7.22.2)

## Stages, in order

1. `/pharn-dev-plan` wrote `PLAN.md`; `check-plan-lessons` exit 0 and `set-writes-scope --check` exit 0.
   **GATE 1:** the plan was approved on 2026-11-23. This was a model decision under delegation (orchestrator), not a
   human approval. The orchestrator confirmed `etime` over `lstart`, the 10 s tolerance, the stderr note, and the new
   leader-exited limit.
2. `/pharn-dev-grill` wrote `GRILL.md`, with 4 advisory concerns and 0 blocking. Two timing notes were folded into the
   build: `Date.now()` is taken before `ps`, and liveness is re-checked after a delay.
3. `/pharn-dev-build`: the floor came back GREEN. It ran twice:
   - The first run was anchored on 476882bc.
   - After the merges of `origin/main` (302f26f8) and #464 (`origin/fix/prettier-3.10.1-format`, 9a29df8a), build
     Step 0 was re-run to re-anchor, as the orchestrator instructed. The build was already committed, so the re-run
     wrote nothing. The baseline was never edited.
4. `/pharn-dev-regress` ran against base 9a29df8a (main plus #464): `no-regressions`, per-test 7061/0 failed at HEAD.
5. `/pharn-dev-verify` returned PASS on all 7 gates, measured by the runner.
6. `/pharn-dev-review` wrote `REVIEW.md`: GREEN, 3 minor advisory findings.

**Advisory deviation:** the harness refuses the pinned `xargs` / `$VAR` shell forms in this isolated worktree, so
regress and verify used node runners under `pharn/.run/` that run the same pinned steps. Both stages say this in their
artifacts. The batch load rule held before every whole-suite run (1-minute load below 40, no other `node --test`).

## Verdict block

verdict-grill: exit 0

verdict-build: exit 0

verdict-regress: no-regressions

verdict-verify: PASS

run-ended: GATE 2

changelog-entry: exit 0

lesson: none — the increment applied existing canon (L34, L37, L41, L64, L67, L84), and nothing recurred that canon
lacks.

deferred: none

## Pointers

- `REVIEW.md` holds the findings (cited, not restated).
- `GRILL.md` is advisory.

**GATE 2:** open the PR. This is a model decision under delegation (orchestrator), for a green run. The PR is not
merged here.

The chain ran, and the named floor verdicts are as shown. This is NOT a judgment that the increment is good or wise;
that is the human's call at the post-review gate.
