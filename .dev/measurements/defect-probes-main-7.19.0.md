# Defect probe set — catch count on `main` (7.19.0)

**Result: 10 of 12 runs caught their planted defect: 9 by the grill and triage, 1 at the plan stage.** One run stopped
at the plan stage without citing the defect's line (`stopped-at-plan-unanchored`, neither a catch nor a miss). One run
was a miss: its triage file failed its own check. Every probe was caught at least once. Measured 2026-11-17 by the user,
12 runs in 28 headless sessions, USD 19.91, 50.9 session-minutes. Advisory beyond the count itself: two runs per probe,
one project, one model per stage.

## Pre-registration (written before any run)

- Probe set: `.dev/probes/defect-probes/manifest.json`, sha256
  `bfbad24957154b4514a2a8ec3ea4fbe84affbcbabe91e84f2f397266cf0c9a22`, committed in pull request #455 (`ddbc7e2a`)
  before any run. The manifest pins the sha256 of every probe input and of the fixture tree. The kit pinned the
  manifest's sha256 in its `score.txt`, and the tally below ran with that pin.
- Catch rule, anchors and bounds: `.dev/probes/defect-probes/README.md`. A run catches its probe when at least one valid
  finding's `file` matches an anchor and the valid triage gives that finding a disposition other than `proceed`.
  Expected dispositions: p1–p4 `replan`, p5–p6 `spec` (reported, not counted).
- Arm: `main` at `155d12057815e74769e30e785f007924e273eae3` (SKILLS_VERSION 7.19.0).
- Runs: 2 per probe, 12 in all.
- Stages and models (today's routing, `pharn.config.json` `models.stages`): plan opus/high, grill opus/high, triage
  sonnet/high. Every session got `--permission-mode acceptEdits`, the kit's `--allowedTools`, `--strict-mcp-config`,
  `--setting-sources project` and `--max-budget-usd 12`.
- Claude Code: 2.1.323 at kit time.
- Estimated cost: about USD 64.

## A scoring rule added after the runs, before scoring

Both p5 plan sessions refused to plan. Each named the planted contradiction between AC-2 and AC-8 and wrote no
`PLAN.md`, so the grill and triage had nothing to read. The pre-registered rule could only score that as
`findings-missing`. Before any run was scored, two outcomes were added (orchestrator decision under the user's
delegation; the manifest is unchanged):

- `caught-at-plan`: the plan session's `result` cites the probe's `SPEC.md` at a line range overlapping an anchor.
- `stopped-at-plan-unanchored`: it cites no such line.

The catch count became `caught` + `caught-at-plan`. Both outcomes read model free text and are advisory; the floor part
is only the line overlap.

## Results

Scored with `node .dev/floor/defect-probe-score.mjs tally --manifest .dev/probes/defect-probes/manifest.json
--manifest-sha256 bfbad249… --runs .dev/features/defect-probe-set/run-outputs`. The output is
`.dev/features/defect-probe-set/run-outputs/tally.json`, over the committed run files.

| probe | planted defect                       | r1                                         | r2                                             | caught |
| ----- | ------------------------------------ | ------------------------------------------ | ---------------------------------------------- | ------ |
| p1    | cross-tenant lookup                  | caught (10 findings, 2 matched, `replan`)  | **triage-invalid** (10 findings, 1 matched)    | 1 / 2  |
| p2    | float money vs the SPEC's constraint | caught (11, 1, `replan`)                   | caught (15, 1, `replan`)                       | 2 / 2  |
| p3    | renamed field, no migration          | caught (11, 2, `replan`)                   | caught (10, 4, `replan`)                       | 2 / 2  |
| p4    | omission: AC-4 uncovered             | caught (11, 1, `replan`)                   | caught (8, 1, `replan`)                        | 2 / 2  |
| p5    | AC-8 contradicts AC-2                | **caught-at-plan** (cites `SPEC.md:46-68`) | **stopped-at-plan-unanchored** (no line cited) | 1 / 2  |
| p6    | unobservable criterion               | caught (12, 1, `spec`)                     | caught (9, 1, `spec`)                          | 2 / 2  |

- **Catch count: 10 of 12.** That is `caught` 9, `caught-at-plan` 1, `stopped-at-plan-unanchored` 1 and missed 1. In
  each caught grill run, at least one matched finding carried the expected disposition.
- **The miss (p1/r2):** the grill caught the planted lookup (finding `G1-1`). The triage then copied the skeleton's
  `findings_sha256` with one hex digit dropped, a 63-character value. `grill-triage.mjs check` refused it on its first
  call and again after the session's repair; the session ended without a verdict and reported it. Under the
  pre-registered rule that is `triage-invalid`, not a catch. The defect lies in how the triage stage carries the
  digest, not in what it detected: a candidate follow-up (the triage retypes a 64-hex value the skeleton could have
  written for it).
- **p5:** both plan sessions stopped in 35–40 s with a clear refusal. r2 named AC-2 and AC-8 in prose but cited no
  `SPEC.md` line, so the line rule cannot see it. A stricter reading is the reason the outcome is not counted. The
  grill and triage sessions that followed ran 9–19 s each on nothing (USD 0.27 per run).
- **Chance matches:** across the four p1/p2 runs scored against the other probe's planted lines, one finding fell
  there (p1/r1 `G1-10` on p2's lines), and it was triaged `proceed`. No escalated chance match.

### Time and cost per run

| run   | minutes | USD  | run   | minutes | USD  |
| ----- | ------- | ---- | ----- | ------- | ---- |
| p1/r1 | 3.6     | 1.56 | p4/r1 | 4.0     | 1.63 |
| p1/r2 | 4.6     | 1.71 | p4/r2 | 3.4     | 1.49 |
| p2/r1 | 4.5     | 1.81 | p5/r1 | 1.0     | 0.56 |
| p2/r2 | 4.4     | 1.71 | p5/r2 | 1.1     | 0.57 |
| p3/r1 | 3.9     | 1.59 | p6/r1 | 8.2     | 2.75 |
| p3/r2 | 3.8     | 1.59 | p6/r2 | 8.3     | 2.94 |

Per session:

- grill: 166–259 s, USD 1.32–1.66, on `claude-opus-5-5`;
- triage: 30–66 s, USD 0.17–0.27, on `claude-sonnet-5-5`;
- plan (p6): 191–238 s, USD 0.89–1.23.

None of the 28 sessions had `is_error`. The estimate of USD 64 was about three times the spend, because the fixture
plans are smaller than the plans the grill cost was measured on.

### The p4/r1 incident

A duplicate copy of the runner started at 08:09 and re-ran p4/r1 on top of the finished run. It overwrote all four of
that run's 07:39 files: `grill.session.json`, `grill-findings.json`, `grill-triage.json` and `triage.session.json`. The
run was redone from a clean copy of the arm at 09:29–09:34 (USD 1.63). The contaminated directory, which cost USD 1.75,
is kept aside, and its cost is not in the totals above. The overwritten original's cost was lost with its files.

## What this record may claim (P0)

- **Floor:** the manifest's sha256, and each run's outcome and the count, as `tally` computes them from the committed
  run files (`tally.json` carries each file's sha256).
- **Advisory:**
  - that a matched finding, or a plan session's citation, is the planted defect;
  - that two runs per probe describe the arm beyond those runs;
  - realism: the probe plans are 6–8 KB, against 15–30 KB for real plans;
  - every time and cost figure, which comes from the sessions' own JSON.
- **Not compared yet:** this is a baseline. A later arm compares with it by the README's rule: the same manifest, the
  same runs per probe, per-probe pairs side by side.
