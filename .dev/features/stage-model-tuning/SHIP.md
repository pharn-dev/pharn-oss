# SHIP — stage-model-tuning

`/pharn-dev-ship stage-model-tuning` for Linear CORE-112: per-stage model and effort arms on the defect probe set, a
pairing reader, and a kit fix so a stage override reaches the place Claude Code reads it. This is build apparatus only.
`SKILLS_VERSION` stays 7.19.0, nothing under `pharn/` or `.claude/` changed, and no shipped default changed. The branch
is cut from CORE-90's (#455) and must merge after it.

## Stages and gates

1. `/pharn-dev-plan` wrote `PLAN.md`, and its floor checks passed: `check-plan-lessons` GREEN, and
   `set-writes-scope --check` set 10 paths from 10 bullets. **GATE 1** was not a human approval. The orchestrator
   decided it as a model decision under the user's delegation ("You make all decisions"):
   - Q1 option (a): build and pre-register all four kits; run `plan-sonnet` + `control-spec` first, `grill-sonnet`
     second, and `grill-medium` only if at least USD 29 of USD 70 is left;
   - Q2: a new `stage-model-pairs.mjs`;
   - Q3: the sanity check is one real run of `grill-sonnet`'s first line.

   It also set conditions: the effort override goes through the same frontmatter rewrite and agreement check; a test
   proves the control's own sessions cannot satisfy `arm-not-applied`; a README line says the control kit's flags are
   redundant, not applied; and no CORE-90 file changes beyond the kit, its test and the README. All are met (PLAN,
   "Open questions — RESOLVED at GATE 1").

2. `/pharn-dev-grill` wrote `GRILL.md`, with the lessons declaration GREEN. It raised 6 advisory concerns (2 important),
   and the PLAN folded them before the build ("Amendments after the grill"):
   - the kit checks agreement with this repository's checker, never the arm's;
   - the record states the arm-order confound and that the one-loss rule is strict;
   - chain USD leads the saving test;
   - incomplete pairs are counted;
   - the GATE 1 `arm-not-applied` case is a named test.
3. `/pharn-dev-build`: the floor is GREEN, with every file inside `## Files`.
4. `/pharn-dev-regress` gave `no-regressions` (`REGRESSION.md`), with the style gates included because the increment
   touches two ignore lists.
5. `/pharn-dev-verify` gave `PASS` (`VERIFY.md`); `reconcile` was clean.
6. `/pharn-dev-review`: GREEN, with 0 floor-gate findings and 3 minor advisory ones (`REVIEW.md`).

**GATE 2** was not a human approval. It was this agent's model decision under the orchestrator's delegation, under the
rule verify PASS ∧ regress clean ∧ zero floor-gate review findings. All three hold, so the next step is a pull request.
The PR is not merged.

verdict-grill: exit 0
verdict-build: exit 0
verdict-regress: no-regressions
verdict-verify: PASS
run-ended: GATE 2

changelog-entry: exit 0

lesson: none — the frontmatter-override defect was inferred from a documented platform mechanism and has not yet been
observed in a run (the sanity run will show it), and its remedy's shape is canon already as L84 and L43.

deferred: none

## Pointers

- `REVIEW.md`: the findings, all advisory. The two minor P0 notes (an arm whose command set differs from this checkout;
  a session ended in error counted as a valid session) go into the record's results section once the runs exist.
- `GRILL.md`: the grill's concerns, all advisory.
- The record, still `pending`: `.dev/measurements/stage-model-tuning-2026-11-17.md`. It pre-registers the arms, the
  manifest sha256 `bfbad249…`, the kit and pairing commands, the reading rule, and the budget and stop rule before any
  run.

## Orchestration deviations (advisory)

- `/pharn-dev-regress` Steps 1–3 ran through a scratch `spawnSync` runner outside the repository, because the isolated
  worktree refuses the pinned `xargs`, `$VAR` and `git worktree` shell forms. The base worktree ran `npm ci` for the
  style gates. A first runner run died after the base suite on a runner bug and wrote no verdict; the stage was re-run
  in full (`REGRESSION.md`).
- `/pharn-dev-verify`'s seven `run --next` calls ran from one background scratch loop that stopped at
  `"finalized": true`.
- `/pharn-dev-build` Step 2b formatted the ten scoped paths by naming them explicitly, not through the pinned `xargs`
  pipeline; the effect is the same set of paths.
- The Bash formatter passes ran only on each stage's own artifacts and on the build's scoped paths, as the commands
  prescribe.

chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate.
