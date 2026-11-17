# SHIP — defect-probe-set

`/pharn-dev-ship defect-probe-set` for Linear CORE-90: a fixed defect probe set, a per-finding scorer and a run kit.
This is build apparatus only. `SKILLS_VERSION` stays 7.19.0, and nothing under `pharn/` or `.claude/` changed.

## Stages and gates

1. `/pharn-dev-plan` wrote `PLAN.md`, and its floor checks passed: `check-plan-lessons` GREEN, and
   `set-writes-scope --check` set 34 paths from 34 bullets.
   **GATE 1** was not a human approval. The orchestrator decided it as a model decision under the user's delegation
   ("You make all decisions"), taking the recommended option on all seven questions. It set three conditions:
   - commit the PLAN at once (`5347ed43`);
   - prove from the configuration whether unloaded fixture source counts against the 100% diff-coverage gate (it does
     not: PLAN, "Amendments after the grill");
   - check every `claude` flag against `claude --help` 2.1.323 (all exist; none was dropped).
2. `/pharn-dev-grill` wrote `GRILL.md`, with the lessons declaration GREEN. Its five advisory concerns changed the
   design before the build, and the PLAN records the changes in "Amendments after the grill":
   - token anchors for SPEC probes;
   - the omission anchor's stated miss;
   - a per-session spend cap and a fixed session environment;
   - test-file coverage discipline.
3. `/pharn-dev-build`: the floor is GREEN, with every file inside `## Files`.
4. `/pharn-dev-regress` gave `no-regressions` (`REGRESSION.md`).
5. `/pharn-dev-verify` gave `PASS` (`VERIFY.md`).
6. `/pharn-dev-review`: GREEN, with 0 floor-gate findings (`REVIEW.md`). Its first pass found an unquoted `--model`
   value in the kit's shell line. That was fixed inside `## Files`, and regress and verify were re-run on the fixed
   tree. The reports here are those re-runs; the first runs also read `no-regressions` and `PASS`.

**GATE 2** was not a human approval. It was this agent's model decision under the orchestrator's delegation, under the
rule verify PASS ∧ regress clean ∧ zero floor-gate review findings. All three hold, so the next step is a pull request.
The PR is not merged.

verdict-grill: exit 0
verdict-build: exit 0
verdict-regress: no-regressions
verdict-verify: PASS
run-ended: GATE 2

changelog-entry: exit 0

lesson: none — the one recurring failure seen (a `**` glob in `## Files` silently dropped by the scope setter) is
canon already as L71 and is the orchestrator's separate follow-up; the unquoted model name was a first occurrence,
caught and fixed in this run.

deferred: none

## Pointers

- `REVIEW.md`: the findings, five of them advisory.
- `GRILL.md`: the grill's concerns, all advisory.
- The record, still `pending`: `.dev/measurements/defect-probes-main-7.19.0.md`. It pre-registers the manifest's
  sha256 `bfbad249…` before any run.

## Orchestration deviations (advisory)

- `/pharn-dev-regress` Steps 1–3 ran through a scratch `spawnSync` runner under `pharn/.run/`, because the isolated
  worktree refuses the pinned `xargs` and `git worktree` shell forms. The base side used a symlinked `node_modules`
  instead of `npm ci`.
- The Bash formatter passes ran only on each stage's own artifacts and on the build's scoped paths, as the commands
  prescribe.

## Acceptance criteria (CORE-90)

1. **Met (floor at verify).** The manifest lists each probe's input sha256, planted line range and expected
   disposition. It is pinned in git before any run, and `npm test` re-hashes it.
2. **Met.** The scorer decides from the two JSON files. A SPEC probe also reads its run's `PLAN.md`, and only for its
   plan tokens; that extension is stated. Its tests run without a model.
3. **Met.** Scoring is per finding, on `file` and `disposition` only.
4. **Pending.** The kit builds 2 runs per probe and `tally` prints the per-probe pairs; the user runs the sessions.
5. **Pending.** The record is in place and the count comes after the runs.
6. **Met.** No file was added under `pharn/` or `.claude/commands/`.

## Follow-ups

- **L71 recurrence.** `set-writes-scope --check --from-plan` exits 0 while silently dropping `**` glob bullets (10 of
  12 here, on a first draft). The orchestrator handles it separately.
- **Probe size.** The probe PLANs are 6–8 KB against the 12–18 KB the plan targeted. A larger second probe set would be
  a new manifest and a new baseline.
- **Chance-match control for p3–p6.** No control exists for these probes yet.

chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate.
