# Per-stage model and effort on the defect probe set (2026-11-17)

**Status: pending.** The variant kits are built and the arms are pre-registered below; the runs are the user's to start
(a headless `claude -p` session cannot be launched from an agent session in this repository). This record holds the
pre-registration now, and the pair tables, readings and the defaults table after the runs. No shipped default changes
in this task: a default change is a follow-up, and the human's call.

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
2. `cannot-decide` / `fewer-than-six-pairs` — fewer than 6 complete pairs;
3. `cannot-decide` / `control-caught-none` — the control caught nothing in the complete pairs;
4. `does-not-support` / `catch-lost` — a pair whose control caught and whose variant did not;
5. `does-not-support` / `no-saving` — the variant's chain USD is not below the control's;
6. `supports-change` / `no-visible-regression-and-saving`.

`supports-change` means "in these pairs no catch was lost and the chain cost less". Six or eight pairs support "no
visible regression" at most, never "non-inferior". One lost catch is decisive by construction, and no reading is a
significance test. A reading on the probe chain never decides a shipped default alone: that also needs E1's loop pairs
and the human's call.

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

Pending: per arm, the pair table (probe, run names, catch per side, stage minutes, USD and weighted units per stage
and chain), the summary, the reading, and the Claude Code version per kit. Raw run files and each arm's pair JSON
will be committed under `.dev/features/stage-model-tuning/runs/`.

## Defaults

Pending the runs. The table will have one row per default this record touches:

| default                          | probe pairs say                       | needs E1 loop pairs | decision      |
| -------------------------------- | ------------------------------------- | ------------------- | ------------- |
| plan model opus                  | pending (`plan-sonnet`)               | yes                 | pending       |
| grill model opus                 | pending (`grill-sonnet`)              | yes                 | pending       |
| grill effort high                | pending (`grill-medium`, conditional) | yes                 | pending       |
| every other stage's model/effort | not measured                          | yes                 | cannot decide |

## What this record may claim (P0)

- **Floor:** the manifest's sha256; each run's outcome (defect-probe-score.mjs `scoreRun`); each session's validity,
  figures and served-family test; the sums; and each arm's reading, as `stage-model-pairs.mjs pair` computes them from
  the run files.
- **Advisory:** that the runs ran as the kits wrote them; the served effort; USD as a price; that a probe catch
  predicts a real plan's; and anything six or eight pairs imply beyond those pairs.
