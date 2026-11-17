# Per-stage model and effort on the defect probe set (2026-11-17)

**Status: measured.** The user ran all four kits on 2026-11-17, in two rounds; this agent cannot launch a headless
`claude -p` session from an agent session in this repository. Measured spend was USD 29.94 of the USD 70 cap, so by
the stop rule `grill-medium` ran too. One reading per arm, on the probe chain only:

- **grill model opus → sonnet:** `supports-change`, with 8 of 8 pairs comparable, no catch lost, and chain USD down
  43%.
- **plan model opus → sonnet:** `cannot-decide`. Only 4 of its 6 pairs are comparable, because two variant runs and one
  control run stopped at the plan stage without citing an anchor.
- **grill effort high → medium:** `does-not-support`, because one catch was lost (p4).

No shipped default changes in this task. A default change is a follow-up, needs E1's loop pairs, and is the human's
call (see "Defaults").

## Why

The 2026-09-29 audit requires paired runs before any per-stage model or effort change (C6 and experiment E1,
`.dev/measurements/pipeline-performance-audit-2026-09-29.md`). Plan and spec are the costliest stages before the build
(25.9% and 15.5% of weighted cost over 36 runs, `.dev/measurements/loop-baseline-2026-11-11.md` §9), and both run on
the most expensive model by default. CORE-90 built the probe set this record scores on
(`.dev/probes/defect-probes/`, record `.dev/measurements/defect-probes-main-7.19.0.md`).

## Scope, and what is out of it

- **In:** three one-axis variant arms on the defect probe set, each paired with CORE-90's control arm, scored per pair
  on catch, stage minutes, USD and weighted cost.
- **Out — E1 itself.** The audit's E1 is a whole-loop A/B on six measured-project tasks (completion, iterations,
  verify and regress verdicts, external-review findings). Those runs happen only on the user's machine, in the measured
  project, and are not part of this task. Every default whose evidence needs those loop pairs is "cannot decide" here.
- **Out — every stage this record does not vary:** spec, build, test, regress, verify, review, memory-promote, ship,
  loop, and triage. Their defaults are not measured here.

## A defect found and fixed before any run

`/pharn-grill` and `/pharn-plan` carry `model: opus` / `effort: high` in their command frontmatter. Claude Code takes a
directly invoked command's model and effort from that frontmatter for the turn
(`pharn/floor/check-model-config.mjs`, "TURN SCOPE"), and every kit session is a direct `/pharn-<stage>` invocation.
So CORE-90's kit flag `--model grill=sonnet` would most likely have run the grill on opus, and the tally would have
scored it as a sonnet result. The control arm is unaffected: its flags equal the frontmatter, so they are redundant,
not evidence that they applied. Since this increment, `defect-probe-kit.mjs` writes an overridden stage into each run
project's command frontmatter and `pharn.config.json` `models.stages`, and refuses the build unless this repository's
`check-model-config.mjs agreement` passes over the project. Each variant project therefore equals "the shipped
default changed", which is the counterfactual this record decides. `stage-model-pairs.mjs` reads what each session was
actually served (the `modelUsage` model with the most output tokens) and reads `cannot-decide` / `arm-not-applied`
when any session ran outside its expected family.

## Pre-registration (written before any run)

- **Probe set:** `.dev/probes/defect-probes/manifest.json`, sha256
  `bfbad24957154b4514a2a8ec3ea4fbe84affbcbabe91e84f2f397266cf0c9a22` (the control arm's manifest; the pairing reader
  refuses any other with `--manifest-sha256`).
- **Arm checkout:** `main` at `155d12057815e74769e30e785f007924e273eae3` (SKILLS_VERSION 7.19.0) for every kit, the
  control's own checkout (`$SCRATCH/core-90/kit/arm-main`).
- **Control arm:** CORE-90's main kit (`$SCRATCH/core-90/kit/main/`), 2 runs per probe: plan opus/high, grill
  opus/high, triage sonnet/high. Its runs are not repeated here; this record adds only the two control runs arm 2
  needs.
- **Every session:** `--permission-mode acceptEdits`, the kit's `--allowedTools`, `--strict-mcp-config`,
  `--setting-sources project`, `--max-budget-usd 12`, `--output-format json`. Claude Code 2.1.323 when the kits were
  built; the version each kit actually ran under is recorded below as the user reports it.

### Arms (one axis each)

| arm            | varied                     | probes × runs | pairs | control runs, in pairing order                    |
| -------------- | -------------------------- | ------------- | ----- | ------------------------------------------------- |
| `plan-sonnet`  | plan model opus → sonnet   | p5–p6 × 3     | 6     | CORE-90 main `r1`, `r2`, then `control-spec` `r1` |
| `control-spec` | none (two control runs)    | p5–p6 × 1     | —     | —                                                 |
| `grill-sonnet` | grill model opus → sonnet  | p1–p4 × 2     | 8     | CORE-90 main `r1`, `r2`                           |
| `grill-medium` | grill effort high → medium | p1–p4 × 2     | 8     | CORE-90 main `r1`, `r2`                           |

Kit commands (`<repo>` = a pharn-oss checkout holding this increment; `$SCRATCH` = the batch scratch directory; each
`--out` is a new, empty directory):

```sh
node <repo>/.dev/floor/defect-probe-kit.mjs build --arm $SCRATCH/core-90/kit/arm-main --out $SCRATCH/core-112/kit/plan-sonnet --runs 3 --probe p5 --probe p6 --model plan=sonnet
node <repo>/.dev/floor/defect-probe-kit.mjs build --arm $SCRATCH/core-90/kit/arm-main --out $SCRATCH/core-112/kit/control-spec --runs 1 --probe p5 --probe p6
node <repo>/.dev/floor/defect-probe-kit.mjs build --arm $SCRATCH/core-90/kit/arm-main --out $SCRATCH/core-112/kit/grill-sonnet --runs 2 --probe p1 --probe p2 --probe p3 --probe p4 --model grill=sonnet
node <repo>/.dev/floor/defect-probe-kit.mjs build --arm $SCRATCH/core-90/kit/arm-main --out $SCRATCH/core-112/kit/grill-medium --runs 2 --probe p1 --probe p2 --probe p3 --probe p4 --effort grill=medium
```

Pairing commands (`<sha>` = the manifest sha256 above):

```sh
node <repo>/.dev/floor/stage-model-pairs.mjs pair --manifest <repo>/.dev/probes/defect-probes/manifest.json --manifest-sha256 <sha> --control $SCRATCH/core-90/kit/main/runs --control $SCRATCH/core-112/kit/control-spec/runs --variant $SCRATCH/core-112/kit/plan-sonnet/runs --probe p5 --probe p6 --expect-variant plan=sonnet
node <repo>/.dev/floor/stage-model-pairs.mjs pair --manifest <repo>/.dev/probes/defect-probes/manifest.json --manifest-sha256 <sha> --control $SCRATCH/core-90/kit/main/runs --variant $SCRATCH/core-112/kit/grill-sonnet/runs --probe p1 --probe p2 --probe p3 --probe p4 --expect-variant grill=sonnet
node <repo>/.dev/floor/stage-model-pairs.mjs pair --manifest <repo>/.dev/probes/defect-probes/manifest.json --manifest-sha256 <sha> --control $SCRATCH/core-90/kit/main/runs --variant $SCRATCH/core-112/kit/grill-medium/runs --probe p1 --probe p2 --probe p3 --probe p4
```

### The reading (fixed before any run)

`stage-model-pairs.mjs` gives each arm one reading by a first-match rule over its complete pairs (every session on
both sides present and valid):

1. `cannot-decide` / `arm-not-applied` — a session was served outside its expected family;
2. `cannot-decide` / `fewer-than-six-pairs` — fewer than 6 complete pairs (comparable pairs since the amendment
   below);
3. `cannot-decide` / `control-caught-none` — the control caught nothing in those pairs;
4. `does-not-support` / `catch-lost` — a pair whose control caught and whose variant did not;
5. `does-not-support` / `no-saving` — the variant's chain USD is not below the control's;
6. `supports-change` / `no-visible-regression-and-saving`.

`supports-change` means "in these pairs no catch was lost and the chain cost less". Six or eight pairs support "no
visible regression" at most, never "non-inferior". One lost catch is decisive by construction, and no reading is a
significance test. A reading on the probe chain never decides a shipped default alone: that also needs E1's loop pairs
and the human's call.

### Amendment before any pairing: plan-stage stops (2026-11-17)

Written after the first round of runs and before any pair was computed. It was made known that several p5 runs had
stopped at the plan stage: the plan refused, naming the planted contradiction, and left no PLAN.md. Under the
original rule those runs would have scored `findings-missing`, or been dropped as incomplete if their grill and
triage sessions were missing. CORE-90's scorer now scores such a run from its `plan.session.json`:
`caught-at-plan` (a catch) or `stopped-at-plan-unanchored` (neither a catch nor a miss). Both read model free text
and are advisory. The pairing reader follows it:

- a plan-stopped run is complete on a valid plan session alone; its grill and triage sessions count toward cost and
  minutes when present and valid, and are never required;
- a run's catch is `caught` or `caught-at-plan`;
- a pair with an unanchored stop on either side is kept and costed, but is not **comparable**. Rules 2–4 (six pairs,
  a control catch, no lost catch) range over comparable pairs only, so unanchored stops can never stand in for "no
  catch was lost". Rule 5's cost comparison still uses every complete pair.

### Budget, run order and the stop rule

USD 70 for all runs. Estimates use the kit's per-stage constants as upper bounds (plan 5, grill 3.1, triage 0.5,
measured on an earlier, dearer opus), with a sonnet stage at half its opus cost (current list prices: opus USD 4 / 20
per MTok, sonnet USD 2 / 10). The kits' own `KIT.md` totals do not discount sonnet, so they read higher.

| order | arm            | runs | estimate | condition                                                                    |
| ----- | -------------- | ---- | -------- | ---------------------------------------------------------------------------- |
| 1     | `plan-sonnet`  | 6    | USD 37   | always                                                                       |
| 1     | `control-spec` | 2    | USD 17   | always                                                                       |
| 2     | `grill-sonnet` | 8    | USD 16   | always                                                                       |
| 3     | `grill-medium` | 8    | USD 29   | only if the measured spend of order 1 and 2 leaves at least USD 29 of USD 70 |

The measured spend is the `summary.control.usd` / `summary.variant.usd` the pairing reader prints for the new kits
(`control-spec` is part of the first reading's control side). If `grill-medium` is not run, grill effort is "cannot
decide (not run: budget)".

### Bounds, stated before the results (P0)

- **The arms are not randomized.** The control runs (CORE-90's kit) and the variant runs are sequential, in different
  windows. A change between them (a Claude Code update, the model behind an alias, service load) is confounded with
  the varied factor. E1 randomizes A/B order per task for this reason; this record does not.
- **Served effort is recorded nowhere.** `grill-medium`'s effort reaches the session through the frontmatter, the
  config and the `--effort` flag together, and nothing records which one Claude Code honoured. Its application is
  advisory.
- **Weighted cost** is the 2026-11-11 baseline's formula over each session's `modelUsage`; `modelUsage` does not split
  cache writes by TTL, so every write is weighted as a 5-minute write (that record measured 1-hour writes at 1.8% of
  weighted cost). USD is Claude Code's own computation.
- **The probes are authored** (CORE-90's README bounds apply: realism, chance matches, plans smaller than real ones).
  A probe catch is evidence about the probe chain, not about real plans.
- **Session files are not committed** (they carry session ids). The committed pair JSON carries each session file's
  sha256 and the figures read from it.

## Results

**How they were produced.** Each arm was paired with the three pre-registered commands above. The output is
`.dev/features/stage-model-tuning/runs/pairs/<arm>.json`, the reader's JSON verbatim. Each arm's run files sit beside
it under `runs/<kit>/<probe>/r<n>/`: findings, triage, and a SPEC probe's `PLAN.md`. The control's own run files belong
to CORE-90's record (`.dev/measurements/defect-probes-main-7.19.0.md`). Session files are not committed; each pair row
carries their sha256.

**Spend, as the user measured it.**

| kit            | spend     | notes                                                          |
| -------------- | --------- | -------------------------------------------------------------- |
| `plan-sonnet`  | USD 7.84  | 18 sessions                                                    |
| `control-spec` | USD 3.30  | 6 sessions                                                     |
| `grill-sonnet` | USD 7.60  | 15 sessions in round 1, plus 2 for the p1/r1 re-run (USD 0.99) |
| `grill-medium` | USD 11.20 | 16 sessions                                                    |

No session reported `is_error`. The Claude Code version the runs used was not reported. The control arm's spend is
CORE-90's.

**Served models.** Every variant session on the varied stage was served `claude-sonnet-5-5` in both sonnet arms. Every
control and unvaried stage was served its expected family (`claude-opus-5-5` for plan and grill, `claude-sonnet-5-5`
for triage). So no arm reads `arm-not-applied`, and the frontmatter override took effect.

**One run was redone.** A duplicate copy of the user's runner re-ran `grill-sonnet` line 1 over the finished sanity
run and was killed mid-session. That left a 0-byte `grill.session.json` and a partly re-grilled project. The directory
was moved aside unchanged to `runs/p1/r1.contaminated-0813/` in the scratch kit (it is not committed, and the reader
never pairs it). The run was rebuilt from a clean copy with the same override and agreement check, and run once more.
The pair uses that re-run.

**The control's p1/r2 is a miss for a run-file reason:** `triage-invalid`. Its triage file failed `checkTriage`, so
the scorer cannot count it. That is why each grill arm shows one "gained" catch on p1/r2. It is a defect in the
control's run file, not a better variant.

### `plan-sonnet` — `cannot-decide` / `fewer-than-six-pairs`

| probe | control run     | variant | control outcome            | variant outcome            | plan USD C / V | plan min C / V | chain USD C / V | chain min C / V | chain weighted (M) C / V |
| ----- | --------------- | ------- | -------------------------- | -------------------------- | -------------- | -------------- | --------------- | --------------- | ------------------------ |
| p5    | main r1         | r1      | caught-at-plan             | caught-at-plan             | 0.28 / 0.15    | 0.58 / 0.33    | 0.56 / 0.44     | 1.01 / 0.75     | 0.13 / 0.14              |
| p5    | main r2         | r2      | stopped-at-plan-unanchored | stopped-at-plan-unanchored | 0.31 / 0.13    | 0.66 / 0.25    | 0.57 / 0.43     | 1.14 / 0.65     | 0.13 / 0.13              |
| p5    | control-spec r1 | r3      | caught-at-plan             | stopped-at-plan-unanchored | 0.32 / 0.13    | 0.60 / 0.27    | 0.60 / 0.42     | 0.96 / 0.66     | 0.14 / 0.13              |
| p6    | main r1         | r1      | caught                     | caught                     | 0.89 / 0.53    | 3.19 / 2.97    | 2.75 / 2.26     | 8.20 / 7.37     | 0.70 / 0.71              |
| p6    | main r2         | r2      | caught                     | caught                     | 1.23 / 0.44    | 3.97 / 2.03    | 2.94 / 2.10     | 8.27 / 6.17     | 0.74 / 0.64              |
| p6    | control-spec r1 | r3      | caught                     | caught                     | 0.88 / 0.41    | 2.87 / 2.03    | 2.71 / 2.19     | 7.52 / 6.30     | 0.71 / 0.69              |

- **Pairs:** 6, all complete, 4 comparable. The two p5 pairs with an unanchored stop are costed, but they are out of
  the catch rules.
- **Catches:** in the comparable pairs, control 4 and variant 4. None lost, none gained.
- **Chain:** USD 10.12 → 7.84 (−23%); minutes 27.11 → 21.88 (−19%); weighted units 2.54M → 2.44M.
- **Plan stage:** USD 3.91 → 1.81 (−54%); minutes 11.87 → 7.89 (−34%).
- **Advisory:** the third p5 pair is caught-at-plan on the control and unanchored on the variant. Both outcomes are
  read from the plan session's free text. It is the one place this arm could hide a regression, and with only four
  comparable pairs the arm cannot decide.

### `grill-sonnet` — `supports-change` / `no-visible-regression-and-saving`

| probe | control run | variant | control outcome | variant outcome | grill USD C / V | grill min C / V | chain USD C / V | chain min C / V | chain weighted (M) C / V |
| ----- | ----------- | ------- | --------------- | --------------- | --------------- | --------------- | --------------- | --------------- | ------------------------ |
| p1    | main r1     | r1      | caught          | caught          | 1.38 / 0.82     | 2.94 / 2.66     | 1.56 / 0.99     | 3.57 / 3.17     | 0.40 / 0.47              |
| p1    | main r2     | r2      | triage-invalid  | caught          | 1.44 / 0.82     | 3.48 / 2.86     | 1.71 / 1.00     | 4.58 / 3.42     | 0.48 / 0.49              |
| p2    | main r1     | r1      | caught          | caught          | 1.62 / 0.69     | 3.92 / 1.97     | 1.81 / 0.86     | 4.54 / 2.52     | 0.47 / 0.41              |
| p2    | main r2     | r2      | caught          | caught          | 1.51 / 0.81     | 3.69 / 2.75     | 1.71 / 1.02     | 4.40 / 3.42     | 0.44 / 0.49              |
| p3    | main r1     | r1      | caught          | caught          | 1.41 / 0.61     | 3.19 / 2.57     | 1.59 / 0.77     | 3.88 / 3.16     | 0.41 / 0.38              |
| p3    | main r2     | r2      | caught          | caught          | 1.42 / 0.86     | 3.29 / 3.21     | 1.59 / 1.06     | 3.84 / 3.77     | 0.42 / 0.50              |
| p4    | main r1     | r1      | caught          | caught          | 1.44 / 0.72     | 3.43 / 2.04     | 1.63 / 0.88     | 4.02 / 2.52     | 0.44 / 0.42              |
| p4    | main r2     | r2      | caught          | caught          | 1.32 / 0.65     | 2.77 / 1.82     | 1.49 / 0.83     | 3.44 / 2.44     | 0.39 / 0.39              |

- **Pairs:** 8, all complete and comparable.
- **Catches:** control 7, variant 8. None lost; one gained (p1/r2, the control's invalid triage).
- **Chain:** USD 13.10 → 7.41 (−43%); minutes 32.27 → 24.42 (−24%).
- **Weighted units rose,** 3.46M → 3.55M (+3%): the sonnet grill used slightly more tokens, at half the price.
- **Grill stage:** USD 11.53 → 5.98 (−48%); minutes 26.71 → 19.89 (−26%).

### `grill-medium` — `does-not-support` / `catch-lost`

| probe | control run | variant | control outcome | variant outcome | grill USD C / V | grill min C / V | chain USD C / V | chain min C / V | chain weighted (M) C / V |
| ----- | ----------- | ------- | --------------- | --------------- | --------------- | --------------- | --------------- | --------------- | ------------------------ |
| p1    | main r1     | r1      | caught          | caught          | 1.38 / 1.28     | 2.94 / 2.73     | 1.56 / 1.47     | 3.57 / 3.36     | 0.40 / 0.41              |
| p1    | main r2     | r2      | triage-invalid  | caught          | 1.44 / 1.22     | 3.48 / 2.56     | 1.71 / 1.40     | 4.58 / 3.24     | 0.48 / 0.36              |
| p2    | main r1     | r1      | caught          | caught          | 1.62 / 1.04     | 3.92 / 2.81     | 1.81 / 1.23     | 4.54 / 3.43     | 0.47 / 0.35              |
| p2    | main r2     | r2      | caught          | caught          | 1.51 / 1.15     | 3.69 / 2.43     | 1.71 / 1.32     | 4.40 / 3.14     | 0.44 / 0.34              |
| p3    | main r1     | r1      | caught          | caught          | 1.41 / 1.32     | 3.19 / 3.18     | 1.59 / 1.54     | 3.88 / 3.96     | 0.41 / 0.41              |
| p3    | main r2     | r2      | caught          | caught          | 1.42 / 1.19     | 3.29 / 2.83     | 1.59 / 1.38     | 3.84 / 3.43     | 0.42 / 0.37              |
| p4    | main r1     | r1      | caught          | caught          | 1.44 / 1.21     | 3.43 / 2.33     | 1.63 / 1.37     | 4.02 / 2.80     | 0.44 / 0.37              |
| p4    | main r2     | r2      | caught          | no-anchor-match | 1.32 / 1.31     | 2.77 / 2.79     | 1.49 / 1.49     | 3.44 / 3.39     | 0.39 / 0.40              |

- **Pairs:** 8, all complete and comparable.
- **Catches:** control 7, variant 7. One lost: p4/r2, where the medium-effort grill raised no finding on the planted
  omission's anchor. One gained: p1/r2, the control's invalid triage.
- **Chain:** USD 13.10 → 11.20 (−14%); minutes 32.27 → 26.74 (−17%); weighted units 3.46M → 3.01M (−13%).
- **Advisory:** the served effort is recorded nowhere. Frontmatter, config and flag all said `medium`.

## Defaults

The probe pairs answer one question: did the varied stage lose a catch on these probes, and did the chain cost less?
They say nothing about the loop outcomes E1 measures: completion, iterations, verify and regress verdicts, and
external-review findings. **So no shipped default can change on this record alone.** Each row below needs E1's loop
pairs in the measured project, and then the human's call.

| default                          | probe pairs say                                                                               | needs E1 loop pairs | decision now                                                     |
| -------------------------------- | --------------------------------------------------------------------------------------------- | ------------------- | ---------------------------------------------------------------- |
| grill model opus                 | **support changing to sonnet:** 8 comparable pairs, 0 catches lost, chain −43% USD, −24% min  | yes                 | supported on the probe chain; the shipped default: cannot decide |
| grill effort high                | **do not support medium:** 1 catch lost (p4/r2) in 8 pairs                                    | yes                 | do not change                                                    |
| plan model opus                  | **cannot decide:** 4 comparable pairs (2 unanchored plan stops), 0 lost, plan −54% USD        | yes                 | cannot decide                                                    |
| every other stage's model/effort | not measured (spec, build, test, regress, verify, review, memory-promote, ship, loop, triage) | yes                 | cannot decide                                                    |

- **Grill model, worded at its P0 ceiling:** in these 8 pairs, a sonnet grill showed no visible regression on the
  probe chain at about half the cost. Eight pairs support that at most. They do not show it is non-inferior, and the
  probes are authored. The next step is the E1 loop A/B in the measured project with `models.stages.grill` set to
  sonnet there, and that is a project setting, not a pharn-oss change.
- **Plan model** would need at least two more comparable p5 or p6 pairs, or p5 anchors that a plan-stage stop can
  cite.

## What this record may claim (P0)

- **Floor:** the manifest's sha256; each run's outcome (defect-probe-score.mjs `scoreRun`); each session's validity,
  figures and served-family test; the sums; and each arm's reading, as `stage-model-pairs.mjs pair` computes them from
  the run files.
- **Advisory:** that the runs ran as the kits wrote them; the served effort; USD as a price; that a probe catch
  predicts a real plan's; and anything six or eight pairs imply beyond those pairs.
- **Advisory, and not re-derivable from the repository:** p5's plan-stage outcomes (`caught-at-plan` and
  `stopped-at-plan-unanchored`). They are read from the plan session's free-text `result`, and session files are not
  committed. The pair JSON records each session file's sha256, so the files the user holds can be checked against it.
