# Defect probe set — catch count on `main` (7.19.0)

**Status: pending.** The probe set, the scorer and the kit are built; the runs are the user's to start (a headless
`claude -p` session cannot be launched from an agent session in this repository). This record holds the
pre-registration now and the results after the runs.

## Pre-registration (written before any run)

- Probe set: `.dev/probes/defect-probes/manifest.json`, sha256
  `bfbad24957154b4514a2a8ec3ea4fbe84affbcbabe91e84f2f397266cf0c9a22`, added by the pull request that adds this record and
  committed before any run. The manifest pins the sha256 of every probe input and of the fixture tree; the kit pins the
  manifest's sha256 in its `score.txt`, so a manifest changed after the runs is refused.
- Catch rule, anchors and bounds: `.dev/probes/defect-probes/README.md`. In short: a run catches its probe when at least
  one valid finding's `file` matches an anchor and the valid triage gives that finding a disposition other than
  `proceed`. Expected dispositions: p1–p4 `replan`, p5–p6 `spec` (reported, not counted).
- Added after the runs, before scoring, and stated as such: a SPEC probe whose plan stage stopped without a `PLAN.md`
  is scored `caught-at-plan` when the plan session's `result` cites an anchored `SPEC.md` line, else
  `stopped-at-plan-unanchored` (neither a catch nor a miss). Both read model free text and are advisory; the catch
  count is `caught` + `caught-at-plan`. The trigger: both p5 plan sessions refused to plan, naming the planted
  contradiction, which the pre-registered rule could only have scored as `findings-missing`. The manifest is unchanged.
- Arm: `main` at `155d12057815e74769e30e785f007924e273eae3` (SKILLS_VERSION 7.19.0).
- Runs: 2 per probe, 12 in all, one at a time.
- Stages and models (today's routing, `pharn.config.json` `models.stages`): plan opus/high, grill opus/high, triage
  sonnet/high. Every session: `--permission-mode acceptEdits`, the kit's `--allowedTools`, `--strict-mcp-config`,
  `--setting-sources project`, `--max-budget-usd 12`.
- Claude Code: 2.1.323 at kit time; the version the runs used is recorded below.
- Estimated cost: about USD 64 (grill USD 3.1 and triage USD 0.5 from the loop-grill-triage measurements; the plan stage
  assumed at USD 5, unmeasured as a headless session).

## Results

Pending: per-probe pairs, the catch count, expected-disposition hits, chance matches, and time and cost per session.
Raw outputs and the scorer's tally will be committed under `.dev/features/defect-probe-set/runs/`.

## What this record may claim (P0)

- **Floor:** the manifest's sha256 above, each run's outcome and the count, as `defect-probe-score.mjs tally` computes
  them from the committed run files.
- **Advisory:** that a matched finding is the planted defect; that two runs per probe describe the arm beyond those runs;
  the cost estimate.
