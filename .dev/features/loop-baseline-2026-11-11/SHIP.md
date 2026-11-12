# SHIP — loop-baseline-2026-11-11

An advisory roll-up of the dev chain for a measurement-only increment (no `SKILLS_VERSION` bump). It records that the
stages ran and their floor verdicts. It is not an approval and carries no seal.

## How the chain ran

The maintainer invoked `/pharn-loop` with a brief that asked to stop at a plan-approval gate and forbade a
`/pharn-loop` run; the session ran `/pharn-dev-ship` instead, as the repository's rule asks for every task.

1. `/pharn-dev-plan` → `PLAN.md`. Lessons index GREEN; `check-plan-lessons` GREEN; `set-writes-scope --check` GREEN
   after the `## Files` paths were put in back-ticks. GATE 1 through a selectable form: G1–G3 accepted as recommended,
   per-gate time recorded as a gap, scripts kept in the scratchpad, plan approved as written.
2. `/pharn-dev-grill` → `GRILL.md`: lessons declaration GREEN; scans clean; 13 grillers applied (by a sonnet
   subagent over the extract) plus the built-in axes; 8 advisory concerns (3 important, 5 minor), 0 blocking.
3. `/pharn-dev-build` → the record and the CHANGELOG entry; scope from the plan, epoch anchored after the setter;
   `validate` GREEN. The grill's B2 was answered before any per-run figure was read, by freezing the benchmark rules
   (below); R1 by running `scan-plan-secrets` and `scan-plan-pii` over the record (both `found:false`).
4. `/pharn-dev-regress` → `no-regressions` (base `39ec5825` = HEAD on a dirty tree; 189 outside test files per test,
   6,646 passed at head, 0 new failures).
5. `/pharn-dev-verify` → PASS (`test`, `validate`, `lint`, `format:check`, `lint:md`, `instruction-growth`,
   `reconcile` all 0; completeness 0).
6. `/pharn-dev-review` → GREEN, 0 floor-gate findings, 3 advisory (`REVIEW.md`).
7. GATE 2: the maintainer chose to fix A1 first. The record's section 11 now says the rules were frozen before the
   analysis read any per-run figure, names what discovery had seen, and calls the freeze advisory. Verify was re-run
   over the final tree: PASS, every gate 0 (stamp `1f905211…`). Regress was not re-run: the fix changed one inside
   markdown file, which no outside gate reads. A2 (disclosure) and A3 (labelled inference) were left as they are.

## Verdicts

verdict-grill: exit 0
verdict-build: exit 0
verdict-regress: no-regressions
verdict-verify: PASS
run-ended: GATE 2

changelog-entry: exit 0

lesson: none — the one surprise (the brief's cost split weighted every cache write as a 1-hour write) is a single slip
in one ad-hoc script, not a recurring mechanism failure (L20's bar).

deferred: none

## The benchmark rules, as frozen before the per-run analysis

Stated in the session right after the build's anchor, before `analyze.mjs` read any per-run figure (discovery had seen
ledger counts by version, the green run's request count and a crude criteria count):

- three or fewer criteria: the run that reached the furthest stage; ties by most requests, then the earliest window;
- large: of the runs that reached build, the most criteria; ties by most `PLAN.md` bytes;
- a population other than 36 (6 + 30) halts the build; a brief figure "matches" when a count is equal, a share is
  within 1 percentage point and a median agrees at its stated precision.

## Pointers

- Findings: `REVIEW.md` (cited, not restated). Advisory interrogation: `GRILL.md`.
- Record: `.dev/measurements/loop-baseline-2026-11-11.md`.

_Chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate._
