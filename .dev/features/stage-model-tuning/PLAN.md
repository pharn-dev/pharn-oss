# PLAN — stage-model-tuning

- spec_content_hash: f058fca367fabcdfecf939dc70bfb43deaadedb1b0e810b790c4aeb156d6775d
- applied_lessons: [L4, L34, L36, L41, L43, L62, L66, L67, L84]
- increment: measure per-stage model and effort on the defect probe set before any shipped default changes: pre-register
  three one-axis variant arms against CORE-90's control arm, make the kit apply a stage's model and effort where
  Claude Code actually reads them (the command's frontmatter), add a deterministic pairing reader that reports weighted
  cost, stage minutes and catch per pair and a closed reading per arm, and land the record pending the user's runs
  (Linear CORE-112)
- layer(s): build apparatus only — `.dev/floor/` (one dev CLI extended, one added, their tests), `.dev/probes/` (the
  probe set's README, not a hashed input), `.dev/guides/floor-checks.md`, `.dev/measurements/` (the record), repo-meta
  (two formatter / linter ignore lists, `CHANGELOG.md` `[Unreleased]`). Nothing under `pharn/` or `.claude/`. No
  `SKILLS_VERSION` bump; `MIN_CLI` unchanged; no shipped default changes.
- constitution_refs: [P0, P2, P5, P6, P7]

## Open questions (HALT) — for GATE 1

1. **Which arms to run within USD 70.** The three arms the orchestrator named cost about USD 99 at the kit's per-stage
   constants (table under "Budget"), over the cap. Recommended: **build and pre-register all three kits; run arm 2
   (plan-sonnet, with its two extra control runs) first, then arm 1 (grill-sonnet); run arm 3 (grill-medium) only if the
   measured spend of arms 1 and 2 leaves at least USD 29 under the cap** (the pairing reader prints each kit's measured
   USD, so the stop rule reads a number, not a guess). Arm 2 goes first because plan is the costliest stage before the
   build (25.9% of weighted cost, loop-baseline §9). An arm not run is recorded as "not run (budget)" and its default
   as "cannot decide". Alternatives: (b) all three, budget raised to about USD 100; (c) arms 1 and 3 only (about USD 45),
   plan model "cannot decide".
2. **Where the pairing reader lives.** Recommended: **a new `.dev/floor/stage-model-pairs.mjs`** that imports the
   scorer's `scoreRun`/`runDirs`/`loadManifest` and the kit's stage table. Alternative: a `pair` subcommand on
   `defect-probe-score.mjs`, which would put session-cost parsing into the scorer whose header says it reads only
   `file`, `id` and `disposition`.
3. **The sanity check before the full loop.** Recommended: **one real run of arm 1's first line** (about USD 2), after
   which I parse its `grill.session.json` with the pairing reader's `session` subcommand and confirm two things before
   the user starts the rest: the session JSON has the fields the reader expects (L67: an external tool's output shape,
   known so far only from documentation), and the grill was served a `claude-sonnet-*` model (the frontmatter override
   took effect). Alternative: a `claude -p 'Reply OK' --model sonnet --output-format json` call (cents), which checks
   the JSON shape but not the override.

## Applied lessons

- L4 — the record keeps the floor (outcomes, counts, the reading computed from the pair table) apart from the advisory
  reading (that a probe catch predicts a real-plan catch, and that eight pairs say anything beyond those runs); the
  wording ceiling stays "no visible regression", never "non-inferior".
- L34 — the reading refuses a vacuous pass: zero `--probe`s or a probe with no runs is a usage error, fewer than six
  complete pairs is `cannot-decide`, and a control side that caught nothing in its pairs is `cannot-decide`
  (`control-caught-none`), because "the variant lost no catch" is true over an empty set of catches.
- L36 — readings (`supports-change | does-not-support | cannot-decide`) and their reason codes are closed sets exported
  as frozen arrays, and the test iterates both so every member is produced by a case.
- L41 — the kit's `--model`/`--effort` defaults (today's routing) and the reader's `--expect-*` defaults are each
  exercised by at least one test that passes no flag, and the control-arm test asserts the no-override project is
  byte-identical to the arm's surface.
- L43 — "served the expected model" is bound to its referent, the session's own `modelUsage`, not to agreement between
  the kit's flag, the command frontmatter and `pharn.config.json` (all three can agree and the platform can still
  serve another model); a mismatch makes the pair `arm-not-applied`.
- L62 — no value read from a session file is quoted into a refusal or a reason: model ids are regex-checked before they
  are printed, numbers are checked finite and non-negative, and a malformed session is a closed `session-invalid`
  state.
- L66 — every variant arm and the extra control runs get their own kit directory under `$SCRATCH/core-112/kit/<arm>/`,
  built empty; the reader reads only after the user's commands exit.
- L67 — the session JSON is Claude Code's output, modelled from its documented shape: the reader enumerates the field
  kinds it reads (absent file, unparsable JSON, missing `modelUsage`, a non-numeric or negative count, an empty model
  map, a non-`claude-*` key) as fixtures, and the record labels the shape "as of Claude Code 2.1.323, checked on the
  first real session file".
- L84 — the kit's override is a branch off a safe default (the arm's own bytes), and its failure mode is silent (a
  `--model` flag the frontmatter overrides runs the control model and reads as a valid variant). A test builds a variant
  project and asserts the frontmatter and config carry the variant values and that the arm's real
  `check-model-config.mjs agreement` passes on it.

## Discovery (P6, read this run)

- Base: `origin/feat/core-90-defect-probe-set` at `ddbc7e2a` (PR #455, unmerged), on `main` `155d1205`
  (SKILLS_VERSION 7.19.0). `pharn/ARCHITECTURE.md` hashes to the pin above; the lessons index freshness gate is GREEN.
- The control arm is CORE-90's kit at `$SCRATCH/core-90/kit/main/` (12 runs, p1–p6 × 2; arm checkout
  `$SCRATCH/core-90/kit/arm-main` at `155d12057815e74769e30e785f007924e273eae3`; manifest sha256
  `bfbad24957154b4514a2a8ec3ea4fbe84affbcbabe91e84f2f397266cf0c9a22`, which this worktree's manifest also hashes to).
  No session file exists yet; the user is running it.
- **The defect this increment must fix first.** `.claude/commands/pharn-grill.md` and `pharn-plan.md` carry
  `model: opus` / `effort: high` frontmatter, and `pharn-triage.md` `model: sonnet` / `effort: high`.
  `pharn/floor/check-model-config.mjs`'s header records that Claude Code selects a command's model through that
  frontmatter, which "applies for the rest of the current turn" when the command is invoked directly — and every kit
  session is a direct `claude -p '/pharn-<stage> …'` invocation. So the kit's `--model grill=sonnet` (the example in
  the probe README and in `.dev/guides/floor-checks.md`) would most likely run the grill on opus anyway, and the tally
  would read it as a sonnet result. The control arm is unaffected (its flags equal the frontmatter). Remedy: the kit
  writes an overridden stage's `model:`/`effort:` into the run project's copy of the command and its
  `models.stages` entry, so the variant is exactly "the shipped default changed", which is the counterfactual the
  record decides; the flag stays too, so whichever the platform honours carries the same value.
- `claude -p --output-format json` reports per session `duration_ms`, `total_cost_usd` and `modelUsage` (per model:
  `inputTokens`, `outputTokens`, `cacheReadInputTokens`, `cacheCreationInputTokens`, `costUSD`). The weighted-cost
  formula is loop-baseline §2's (`input + 1.25·cache_write_5m + 2·cache_write_1h + 0.1·cache_read + 5·output`);
  `modelUsage` does not split cache writes by TTL, so every write is weighted as a 5-minute write (bound stated; §3 of
  that record measured 1-hour writes at 1.8% of weighted cost). Effort served is recorded nowhere (loop-baseline §12,
  CORE-111), so arm 3's application is advisory.
- Prices (Anthropic first-party, current `opus` and `sonnet` generations): Opus USD 4 / 20 per MTok, Sonnet USD 2 / 10,
  so a sonnet stage is estimated at half its opus cost. The kit's constants (plan 5, grill 3.1, triage 0.5, measured on
  an earlier, dearer opus) stay as upper bounds.
- The audit's E1 (`.dev/measurements/pipeline-performance-audit-2026-09-29.md:525-538`, whole-loop A/B on six
  measured-project tasks) runs only on the user's machine in pharn-app and is out of scope here; the record says so.
- Deferred decisions: no product catalog and no `/pharn-eval`; this adds neither and ships nothing.

## The increment

### 1. Kit: apply a stage override where Claude Code reads it — `.dev/floor/defect-probe-kit.mjs`

- `parseArgs` records which stages a `--model`/`--effort` flag named (`overrides`). Defaults are unchanged.
- `build`, per run project, for each overridden stage whose value differs from the arm's: replace the `model:` or
  `effort:` line inside the frontmatter of the project's `.claude/commands/<command for the stage>.md`, and set
  `models.stages[<stage>]` in the project's `pharn.config.json` to the kit's model and effort. Then run the project's
  own `node pharn/floor/check-model-config.mjs agreement` in it. Exit 2, writing no further run, when the arm's command
  has no such frontmatter line, the arm's config has no `models.stages`, or the agreement check fails. A stage whose
  flag equals the arm's value changes nothing, so a control kit stays byte-identical to the arm.
- The stage → command map is the three kit stages (`plan` → `pharn-plan.md`, `grill` → `pharn-grill.md`, `triage` →
  `pharn-triage.md`), the same keys `check-model-config.mjs`'s `PRODUCT_STAGES` uses.
- `KIT.md` names the project overrides in one line.

### 2. Pairing reader — `.dev/floor/stage-model-pairs.mjs` (new)

```text
node .dev/floor/stage-model-pairs.mjs pair --manifest <m> --manifest-sha256 <hex> --control <runs>... --variant <runs>
     --probe <id>... [--expect-control <stage>=<alias>]... [--expect-variant <stage>=<alias>]...
node .dev/floor/stage-model-pairs.mjs session <file.session.json>
```

- Control runs per probe are the `r<n>` directories of each `--control` dir in the order given, concatenated; variant
  runs are the variant dir's. The i-th variant run pairs with the i-th control run. Unequal counts for a probe, a
  `--probe` with no runs, or no `--probe` at all: exit 2.
- Per run: `scoreRun` from the scorer (outcome, caught) and, per stage of the probe's kind, its `<stage>.session.json`:
  minutes (`duration_ms`), USD (`total_cost_usd`), weighted units (from `modelUsage`), the dominant model (the
  `modelUsage` key with the most output tokens) and whether it is in the expected family (`claude-<alias>-`; expected
  defaults: plan opus, grill opus, triage sonnet), plus the file's sha256.
- A pair is complete when both sides have every stage's session valid. Summary over complete pairs: count, catches per
  side, `catch_lost` (control caught, variant not), `catch_gained`, and per side total USD, weighted units and minutes,
  per stage and per chain.
- The reading, deterministic (P5), first match wins:
  1. `cannot-decide` / `arm-not-applied` — any complete pair has a session outside its expected family;
  2. `cannot-decide` / `fewer-than-six-pairs` — fewer than 6 complete pairs;
  3. `cannot-decide` / `control-caught-none` — the control side caught nothing in the complete pairs;
  4. `does-not-support` / `catch-lost` — at least one complete pair lost a catch;
  5. `does-not-support` / `no-saving` — variant chain USD is not below control chain USD;
  6. otherwise `supports-change` / `no-visible-regression-and-saving`.
- Output: one JSON document (`pharn-stage-model-pairs/1`) with the manifest sha256, per-pair rows (probe, run names,
  outcomes, per-stage figures, session sha256s), the summary, the reading and its reason. No absolute path, no session
  id, no free text from a session or a run file. Exit 0 with a reading, 2 on usage.
- `session` prints one session's parsed figures or the closed invalid code — the sanity check's reader.

### 3. Docs and the record

- `.dev/probes/defect-probes/README.md` — the "Per-stage tuning" lines say the override is written into the project's
  command frontmatter and config, and why; "Comparing two arms" points to the pairing reader.
- `.dev/guides/floor-checks.md` — a `stage-model-pairs.mjs` section, and the kit entry's override sentence corrected.
- `.dev/measurements/stage-model-tuning-2026-11-17.md` — **pending**: pre-registration (arms, manifest sha256, arm
  commit, kit commands, pairing order, the reading rule, budget per arm and the stop rule) written before any run;
  results, readings and the "supports / does not / cannot decide" table after the runs. It names E1 as out of scope and
  puts every default whose evidence needs loop pairs under "cannot decide".
- `.prettierignore`, `.markdownlint-cli2.jsonc` — `.dev/features/stage-model-tuning/runs/` (raw run files committed
  after the runs: findings, triage, a SPEC probe's PLAN.md and the reader's JSON; session JSON is NOT committed, since
  it carries session ids — the pair table carries each session file's sha256 instead).
- `CHANGELOG.md` — one `[Unreleased]` entry.

## Arms (pre-registered at GATE 1; one axis each)

| arm            | varied                      | probes × runs | pairs | control runs                               | kit command (abridged)                               |
| -------------- | --------------------------- | ------------- | ----- | ------------------------------------------ | ---------------------------------------------------- |
| `grill-sonnet` | grill model opus → sonnet   | p1–p4 × 2     | 8     | CORE-90 main r1–r2                         | `--runs 2 --probe p1..p4 --model grill=sonnet`       |
| `plan-sonnet`  | plan model opus → sonnet    | p5–p6 × 3     | 6     | CORE-90 main r1–r2, then `control-spec` r1 | `--runs 3 --probe p5 --probe p6 --model plan=sonnet` |
| `control-spec` | none (2 extra control runs) | p5–p6 × 1     | —     | —                                          | `--runs 1 --probe p5 --probe p6`                     |
| `grill-medium` | grill effort high → medium  | p1–p4 × 2     | 8     | CORE-90 main r1–r2                         | `--runs 2 --probe p1..p4 --effort grill=medium`      |

Every kit: `--arm $SCRATCH/core-90/kit/arm-main` (the control's own checkout), the worktree's manifest (same sha256 as
the control's), `--max-budget-usd 12`, `--out $SCRATCH/core-112/kit/<arm>`.

## Budget (estimates; the kit's per-stage constants as upper bounds, a sonnet stage at half)

| arm            | per run                           | runs | estimate |
| -------------- | --------------------------------- | ---- | -------- |
| `grill-sonnet` | grill 1.55 + triage 0.5           | 8    | USD 16   |
| `plan-sonnet`  | plan 2.5 + grill 3.1 + triage 0.5 | 6    | USD 37   |
| `control-spec` | plan 5 + grill 3.1 + triage 0.5   | 2    | USD 17   |
| `grill-medium` | at most grill 3.1 + triage 0.5    | 8    | USD 29   |
| all            |                                   | 24   | USD 99   |

Arms 2 (with `control-spec`) and 1 together: about USD 70, the cap. The kits' own `KIT.md` estimates do not discount
sonnet, so they read higher for arms 1 and 2.

## Files

- `.dev/floor/defect-probe-kit.mjs` — apply a stage's `--model`/`--effort` to the run project's command frontmatter and `models.stages`, check agreement, name it in KIT.md — layer apparatus
- `.dev/floor/defect-probe-kit.test.mjs` — override, no-override byte identity, refusals, real-arm agreement — layer apparatus
- `.dev/floor/stage-model-pairs.mjs` — the pairing reader (new) — layer apparatus
- `.dev/floor/stage-model-pairs.test.mjs` — its hermetic tests (new) — layer apparatus
- `.dev/probes/defect-probes/README.md` — override and comparison text — layer apparatus
- `.dev/guides/floor-checks.md` — the reader's section and the kit correction — layer apparatus
- `.dev/measurements/stage-model-tuning-2026-11-17.md` — the record, pending — layer apparatus
- `.prettierignore` — the record's raw runs directory — layer repo-meta
- `.markdownlint-cli2.jsonc` — the same — layer repo-meta
- `CHANGELOG.md` — `[Unreleased]` entry — layer repo-meta

### Not in `## Files`

- `.dev/features/stage-model-tuning/runs/**` — written after the user's runs under a re-set scope (pipeline-artifact
  directory), like CORE-90's.
- Nothing under `pharn/` or `.claude/`; `SKILLS_VERSION` and `MIN_CLI` unchanged.

## Contracts satisfied

- None on the product surface. The reader consumes `pharn/floor/grill-findings-core.mjs` and `grill-triage-core.mjs`
  through the scorer, unchanged (`.dev` → `pharn`, the allowed direction, P3).

## Evals to write (P1)

No capability is added (no `role:`), so no `evals/`. The tests are the specification:

- kit: an override rewrites exactly the stage's frontmatter line and config entry; an equal value rewrites nothing; no
  flag leaves the project's commands and config byte-identical to the arm; a missing frontmatter line, a missing
  `models.stages`, and a failing agreement check each exit 2; one test builds from this repository's own checkout as the
  arm and asserts its real `check-model-config.mjs agreement` is GREEN on a `--model grill=sonnet` project.
- reader: every reading and reason code is produced (iterated over the frozen sets); pairing order across two
  `--control` dirs; unequal counts, no probe, an unknown probe → exit 2; every session-invalid kind; the dominant-model
  pick with a secondary model present; the expected-family defaults with no `--expect-*` flag; the weighted formula on
  fixed numbers; the output holds no absolute path and no session id; `session` on a valid and an invalid file.

## Guarantee audit (P0)

- "the variant project carries the variant model/effort in frontmatter and config, and they agree" → floor: enum/regex
  (line replacement, then `check-model-config.mjs agreement` exit code).
- "the variant stage ran on the variant model" → advisory at the kit; the reader's `arm-not-applied` check reads the
  session's own `modelUsage` (evidence written by Claude Code, never proof — the platform's veto and the frontmatter
  path's turn scope are `check-model-config.mjs`'s stated holes).
- "the variant stage ran at the variant effort" → advisory; nothing records served effort.
- "each pair's outcome, catch, minutes, USD and weighted units" → floor: enum/regex over the scorer's outcome and the
  session files' numbers, bound by sha256. USD is Claude Code's own price computation (advisory as a price).
- "the arm's reading" → floor: a deterministic first-match rule over the pair table; its meaning ("no visible
  regression on these probes at lower spend") is advisory, never "non-inferior", and never a decision to change a
  default (that is the human's, after E1).

## Trust audit (P2)

- Run files and session files are tool and model output. The reader reads only numbers, enum outcomes, finding ids
  (already shape-checked by `validate`) and model-id keys (regex-checked); `result`, `problem`, `evidence` and every
  other free-text field are never read. Output carries no value from those files beyond checked numbers and checked
  model ids.

## Determinism audit (P5)

- Pairing is positional over sorted `r<n>` directories in the given `--control` order; the dominant model is a max over
  integers with ties broken by key order; the reading is the first-match list above. Anything else is a usage error.
