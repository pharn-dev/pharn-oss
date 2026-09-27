# SHIP — cost-ledger-run-scope

An advisory roll-up of the `/pharn-dev-ship` chain for this increment. A run's `cost.json` now counts only its own
run's requests — the context that ran it and the agents that context spawned during it — and says membership is
unknown when the transcript cannot tell (6.29.0, membership `run-window/2`). This file records that the chain ran and
its floor verdicts. It is not a "shipped" claim, an approval or a seal.

- stage: `/pharn-dev-ship` Steps 2b, 2c and 3 — opus, by the maintainer's instruction for this batch (not a
  `pharn.config.json` route).
- where the run ended: **GATE 2 → MERGE**, the orchestrator's decision, after fixes. This file is committed with the
  increment; the branch is then merged with `origin/main`, pushed, and a pull request opened against `main`. This run
  does not merge the pull request.

## Stages run, in order, and on which model

Every stage ran inline in one agent, which the orchestrator spawned; the batch forbids spawning a stage agent. All of
them ran on opus by the maintainer's instruction for this batch.

1. `/pharn-dev-plan` → `PLAN.md`.
2. **GATE 1**, approved 2026-09-27 by the orchestrator, with three requirements (R1–R3) and the plan's three open
   questions resolved (`PLAN.md`, "Open questions" and "Build carry-overs").
3. `/pharn-dev-grill` → `GRILL.md`: G1–G8 folded into `PLAN.md` before the build.
4. `/pharn-dev-build` → `BUILD.md`.
5. `/pharn-dev-regress` → `REGRESSION.md`, `regression-report.json`. A first attempt stopped before any gate ran;
   `REGRESSION.md` says why.
6. `/pharn-dev-verify` → `VERIFY.md`, `verify-report.json` (the test gate needed a third run; `VERIFY.md` says why).
7. `/pharn-dev-review` → `REVIEW.md`.
8. Steps 2b and 2c, then **GATE 2 → MERGE after fixes** (orchestrator).
9. The GATE 2 fixes (`BUILD.md`, "GATE 2 fixes"), then `validate` and `npm run check` again, then this file.

## Decisions, and whose

**The orchestrator's**, made under the maintainer's delegation for this batch. These are model decisions, not human
approvals:

- GATE 1, approved: agents count only if spawned during the run (IN); a legacy contaminated ledger is RED under
  `--verify-transcript` and GREEN with a WARN in plain mode; `ship-record.json`'s session-scoped block is OUT; plus
  R1 (pin both delivery shapes of a quoted marker line), R2 (the printed line is load-bearing, pinned by a differential
  and stated in `mark-phase.mjs`'s header) and R3 (built-code before/after counts, and `bb54cf03`'s absence, stated).
- GATE 2 = **MERGE after fixes**: the important review finding and every wording minor, including rule 6's statement
  that a fabricated context-unknown membership passes both modes. The two build-time changes to the approved plan —
  `contexts` reported over the contexts named by the window's end, and the run report's `unrecognized` label — were
  **accepted as build-time amendments** (`BUILD.md`, decisions 1 and 4).
- The Step 2b answer below.

**The maintainer's own:** the delegation of both gates to the orchestrator for this batch, and the instruction to run
it on opus.

## Structural verdicts, as read

- `/pharn-dev-grill` → `check-plan-lessons.mjs`: **exit 0**, GREEN.
- `/pharn-dev-build` → `node pharn/floor/validate.mjs .`: **exit 0** (`FLOOR: GREEN — 36 capabilities checked`).
- `/pharn-dev-regress` → `regression-report.json` `.verdict`: **`no-regressions`**. The base is `70cb51c` (6.28.2):
  28 paths inside, none escaped; 115 outside test files, `validate` and the trust-fence structural pair exit 0 at the
  base and at the head.
- `/pharn-dev-verify` → `verify-report.json` `.verdict`: **`PASS`**. All seven gates exit 0 on the recorded run,
  reconcile `CLEAN`.

After the GATE 2 fixes, on that tree: `validate` exit 0, and `npm run check` exit 0 with 4,119 of 4,119 tests passing.

## The review

Cited, not restated (P4); read `REVIEW.md`: "**GREEN — 0 floor-gate (blocking) findings.** Advisory: 1 important, 5
minor." It is a self-review. The important finding and the wording minors were fixed at GATE 2; the P2 and P3 minors
needed no action.

## Named, not built

- `cost-ledger-workflow-agents`, `cost-ledger-mention-only`, `cost-ledger-shared-markers-file`,
  `cost-ledger-spawn-batched`: `pharn/pharn-contracts/cost-ledger.md`, "Residual", each pinned by a test of today's
  behaviour.

## Ship-stage records

changelog-entry: exit 0

- `CHANGELOG-ENTRY: GREEN` against the merge-base `70cb51c`; this pull request opens `## [6.29.0] - 2026-09-27`.

lesson: skipped

- The candidate ("a cited temporal lesson still recurs in the plan that cites it", drafted in `REVIEW.md`) was
  declined by the orchestrator under the maintainer's delegation, not by a human at the 2b.3 form. The reason: its
  remedy already exists as a mechanism — the `--verify-transcript` GROWTH CLOSURE test in
  `pharn/floor/check-cost-ledger.test.mjs` — so a canon entry would add cost to every future plan's sweep without
  adding a mechanism.

deferred:

- An assertion whose expected outcome is a fail-closed refusal is overdetermined: it passes under a mutant of the
  rule it names whenever another rule also refuses, so the scenario must make the named rule the only barrier (two
  instances in `BUILD.md`'s negative-control table, M7 and M6b).

## Commit

- One commit on `cost-ledger-run-scope` carries the increment and this file, followed by a merge of `origin/main`
  (`1b0ac3b`, 6.28.4); 6.29.0 stays the next version.

_Chain ran; the named floor verdicts are as shown. This is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate._
