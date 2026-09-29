# PLAN — pipeline-performance-audit: a measurement-driven audit of the post-optimization delivery pipeline

- spec_content_hash: d831d30d399a37dc403080072763d13383de6f6f31875e7e8cb4eadeb642f4f4
- applied_lessons: [L4, L24, L38, L40, L43, L63]
- increment: an ANALYSIS-ONLY audit of the product delivery pipeline (`/pharn-ship`, `/pharn-loop`) as it stands at
  6.35.0. It produces one report and one read-only analysis helper, and changes no PHARN runtime behaviour.
- layer(s): build apparatus only (`.dev/features/`, `.dev/measurements/`) plus a `CHANGELOG.md` `[Unreleased]` entry.
  No product-surface byte changes, so no `SKILLS_VERSION` bump.
- constitution_refs: [P0, P2, P5, P6, P7]

## Why (P7)

**The trigger is the maintainer's explicit direction**: this run's prompt asks for a "Post-Optimization Performance
Audit". It is recorded that way, not as a failure this plan re-derives. The prompt forbids implementing any
optimization. This increment therefore adds no capability, rule or enforcer. Its only code is an analysis helper,
which the prompt allows "only if necessary to inspect existing evidence".

## Discovery — live state read this run (P6)

### The four preceding optimization areas are on `main`

| area                                  | version / PR    | live evidence (files at `c9737b4`)                                                                |
| ------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------- |
| 1. orchestrator-context reduction     | 6.32.0, PR #294 | `.claude/commands/pharn-{loop,ship}-{quick,close}.md` exist (11,091 / 11,223 / 31,211 / 28,179 B) |
| 2. run-scoped BASE regression reuse   | 6.33.0, PR #297 | `pharn/floor/regress-base-reuse{,-core}.mjs`                                                      |
| 3. VERIFY reuse of REGRESS/HEAD gates | 6.34.0, PR #298 | `pharn/floor/gate-reuse-core.mjs`, `head-reuse-offer.mjs`                                         |
| 4. per-run performance/cost breakdown | 6.35.0, PR #299 | `pharn/floor/stage-executions-core.mjs`, `stage-work.mjs`; `SKILLS_VERSION` = `6.35.0`            |

### The routing table as it stands (`pharn/floor/stage-agent-core.mjs` `ROUTE_POLICY`)

- `/pharn-ship` full: spec `interactive` (it is GATE 1); plan, grill, test, build `agent`; regress, verify
  `floor-only` (inline thin callers over `stage-regress.mjs` / `stage-verify.mjs`).
- `/pharn-loop` full: spec, plan, grill, test, build `agent`; regress, verify `floor-only`.
- quick columns: grill `floor-only`, regress `skipped`, the rest as in full.
- The requested models come from `pharn.config.json` `models.stages`. In this repo that is spec, plan, grill, review,
  memory-promote and ac-test on opus; build, regress, verify, ship and loop on sonnet; effort `high` everywhere. Effort
  is not routed to a stage agent: the Agent tool takes no effort parameter (CLAUDE.md, STAGE-MODEL ROUTING).

### The evidence inventory, with the result of the selection rule below

- **Real product-pipeline ledgers found: 69.** All of them are in
  `~/Projects/pharn-starter/pharn/features/*/cost.json`: 56 with `skills_version` 6.12.1 and 13 with 6.7.0. The
  newest was written 2026-09-28 10:17. pharn-starter's `pharn.config.json` still records `skillsVersion` 6.12.1
  (installed 2026-09-23).
- **Other real run records, none of them a ledger:**
  - this repo's `pharn/features/loop-decision-integrity/` (a `LOOP.md` and its reports, from the 6.3.0 era);
  - one real `/pharn-loop` transcript in `~/.claude/projects/…pharn-loop-run/`, dated 2026-09-21, before the
    optimizations.

  The build re-counts every one of these with the helper and does not trust the numbers above.

- **Post-optimization real runs (installed version ≥ 6.32.0): 0.** Every ledger is 20 or more minor versions older
  than the first optimization.
  The 6.12.1 pipeline has no `/pharn-test` stage, no stage-agent routing (6.27.0), and no regress/verify stage
  scripts (6.23.0 / 6.26.0). It is not the pipeline this audit is about (L24).
- **Known measurement defects of those ledgers.** These are independent of their age and are found by reading them:
  - `membership.method` is `run-window/1` on all 56 6.12.1 ledgers, and absent on the 13 6.7.0 ledgers. That
    membership is not context-scoped, and 6.29.0 measured it counting concurrent agents' rows (L38). Several ledgers
    share one `window_start`: 10 share 2026-09-22T17:06:51Z, 2 share 2026-09-23T08:56:20Z and 2 share
    2026-09-25T20:39:38Z.
  - Output was derived from each request's first transcript line before 6.24.1 (L63). One sampled ledger has 393
    requests and 16,852 output tokens.
  - There are no `executions` or `work` keys, because those arrived in 6.35.0.
  - `coverage` is `partial` on all of them.
- **Controlled evidence (fixtures, never user workload, L4):**
  - `.dev/features/regress-base-reuse/MEASUREMENT.md`: process counts and wall-clock on a fixture, 3 repetitions.
  - `.dev/features/verify-head-gate-reuse/MEASUREMENT.md`: the same kind of measurement for verify reuse.
  - `.dev/features/run-performance-breakdown/DEMO.md`: its token counts are **synthetic**. It may be cited for helper
    overhead only, never for model usage.
  - The 6.32.0 CHANGELOG entry: measured command bytes, plus request and token figures it labels estimates.
- **Static evidence (the current tree, measurable now):** the bytes of every command, part, stage-agent brief and
  prescribed read that enters a stage's context. The token figures derived from these bytes are estimates.

## The run-selection rule — frozen HERE, before any cost is inspected

Step 2 of the prompt requires fixing this rule before any stage's cost is looked at. The build applies it verbatim and
may not amend it after seeing cost figures. An amendment goes back to the human (P6).

1. **Universe.** Every `cost.json` under a `pharn/features/*/` directory that the evidence inventory names, plus any
   added at GATE 1.
2. **Eligible as post-optimization real evidence** only if all of these hold:
   - `command` ∈ {`/pharn-ship`, `/pharn-loop`};
   - `skills_version` ≥ 6.35.0 for the full profile. A ledger from 6.32.0–6.34.x is eligible for model-usage metrics
     only, because it has no `executions` or `work`;
   - the run happened in a real project, not a fixture.
3. **Per-metric validity.** A run is used for a metric only if its evidence for that metric passes. Each exclusion is
   reported per metric, never silently dropped:
   - **Run token totals.** `check-cost-ledger.mjs` must be GREEN. `membership.method` must be `run-window/2`. `coverage`
     must not be `unavailable` or `unknown`. A `partial` coverage is used but reported as partial, never as complete.
   - **Per-stage requests and tokens.** The same conditions, plus the stage attribution taken from `markers[]`.
     `unattributed` is reported beside the stage figures, never folded into them.
   - **Elapsed time.** Only `executions` rows with a non-null `elapsed_ms`. `unmeasured` rows are counted by their
     reason and never read as zero.
   - **Deterministic work.** Only `work[]` rows. A stage with no row is `not recorded`, never zero.
   - **Model.** The requested model comes from each marker's `route`. The served model comes from `requests[].model`.
     The two are always reported separately.
4. **Sampling.** Every eligible run is used when there are 20 or fewer. Above 20, the sample is stratified by
   `(command, mode, outcome, iteration count)`, taking every stratum, round-robin, in `window_start` order. The strata
   are structural and are fixed here.
5. **Closed exclusion reasons:**
   - `pre-optimization-version`;
   - `wrong-command`;
   - `fixture-not-workload`;
   - `ledger-red`;
   - `membership-run-window-1`;
   - `coverage-unavailable`;
   - `unreadable`.

   A ledger may carry several reasons. The report states all of them.

**Applying the rule to the live inventory gives 0 included real runs and 69 excluded**, all as
`pre-optimization-version`, and 56 of them also as `membership-run-window-1`. Open question Q1 decides what the audit does about
that.

## What the build does

The work depends on the GATE 1 answer to Q1. Every route writes the same files. Only the evidence set differs.

1. **`audit.mjs` (read-only helper).** It writes to stdout only and changes no runtime state. It has four jobs:
   - (a) apply the frozen rule to a list of ledgers;
   - (b) validate each ledger by shelling `pharn/floor/check-cost-ledger.mjs` as a CLI, plus the schema, membership,
     coverage, marker-completeness and open-execution checks the prompt lists;
   - (c) extract per-stage profiles, keeping four dimensions separate: model usage per token class, observed elapsed
     time, deterministic work, and retry/rerun counts;
   - (d) run a `--static` pass over the current tree.

   The static pass measures:
   - the bytes each routed stage agent receives from `stage-agent.mjs brief`, which only writes stdout (read at
     `stage-agent.mjs:527`);
   - the bytes of the stage command file the brief points at;
   - the bytes of the orchestrator command at invocation and of each part at its load point;
   - the bytes of each inline stage's thin caller.

   Token counts are derived as `ceil(bytes / 4)` and labelled estimates. The helper must be reproducible:
   `node .dev/features/pipeline-performance-audit/audit.mjs --static` and
   `… --ledgers <paths…>` print every number the report cites.

2. **The report,** at `.dev/measurements/pipeline-performance-audit-2026-09-29.md`. Measurement reports live in
   `.dev/measurements/`, as in `token-cost-2026-08-18.md`. It has the nine sections the prompt names:
   1. Evidence set
   2. Current execution profile
   3. Measured cost profile
   4. Dominant remaining costs
   5. Root-cause analysis
   6. Candidate optimizations
   7. Recommended next 2–4 increments
   8. Do not optimize yet
   9. Measurement gaps

   **Every number carries one label**, from `real` / `controlled` / `static` / `estimate`, plus its denominator.
   Figures with different labels or coverage semantics are never compared as percentages of each other.
   Token classes are always reported separately. There is no weighted score and no dollar figure.

3. **Conclusion discipline (P0/P7).**
   - A candidate optimization must cite a measured finding earlier in the report. With no real runs, a candidate may
     rest on a `static` or `controlled` measurement. It is then labelled "contingent on real-run confirmation".
   - A candidate that changes agent independence, model, effort, stage boundaries, what BUILD sees, or the
     validation/retry strategy gets a defined counterfactual experiment, never an adoption recommendation.
   - If the evidence supports fewer than two implementation increments, the report says so rather than inventing
     any. The prompt's "2–4" is an upper frame, not a quota to fill.
   - A root cause is stated only when the evidence tells it apart from the alternatives. Otherwise the report names
     the rival causes and what would separate them (L40).
4. **`CHANGELOG.md`:** one `[Unreleased]` entry, dated `- 2026-09-29:`. This is apparatus-only, so there is no bump.

## Files

- `.dev/features/pipeline-performance-audit/PLAN.md` — this plan — apparatus
- `.dev/features/pipeline-performance-audit/audit.mjs` — NEW. A read-only analysis helper: rule application, ledger
  validation, per-stage profile extraction and the static byte pass. Node stdlib only; it writes stdout only. —
  apparatus
- `.dev/measurements/pipeline-performance-audit-2026-09-29.md` — NEW. The audit report. — apparatus
- `CHANGELOG.md` — one `[Unreleased]` entry — repo-meta

## Applied lessons

- **L4.** Controlled and fixture evidence is kept apart from real workload in every table. A fixture's
  reuse-count result shows that the mechanism fires. It never shows how often a real run hits it.
- **L24.** No figure from a 6.7.0 or 6.12.1 ledger, or from a pre-optimization transcript, is carried into a
  post-optimization claim. The pipeline those figures describe was replaced, so they are listed as exclusions
  only.
- **L38.** Concurrent sessions contaminated `run-window/1` membership in the historical corpus. So
  `membership-run-window-1` is a closed exclusion reason. Any controlled delivery runs made for this audit (Q1
  option 2) run one at a time, never in parallel.
- **L40.** Root causes are stated only where the evidence separates them from rival causes. Otherwise the report
  names the rivals and the observation that would discriminate between them.
- **L43.** A GREEN `check-cost-ledger.mjs` is treated as internal consistency only. The helper checks membership and
  coverage separately, and the report never reads GREEN as "the ledger is accurate".
- **L63.** A pre-6.24.1 ledger's output is derived from a still-growing line, so it under-counts. That is one more
  reason those ledgers cannot support an output-token claim.

## Guarantee audit (P0)

- "The audit changed no PHARN runtime behaviour" → floor, but only for the product surface in the dev chain:
  `validate.mjs` GREEN, plus the diff limited to the four `## Files` paths. `enforce-writes-scope.cjs` pins
  Write-tool writes to them. Bash writes are detected by `/pharn-dev-verify`'s `reconcile` gate and are not prevented
  (L19).
- "Run X was excluded for reason R" → advisory. The helper applies an enum rule, but nothing on the floor checks the
  report against the helper's output.
- "Stage S accounted for N of M requests" → advisory arithmetic over ledger fields. Its inputs are only as honest as
  the ledgers, and a GREEN ledger is agreement, not provenance (L43).
- "Byte and token figures of the static pass" → bytes are measured. Every token figure is an estimate and is
  labelled as one.
- Every candidate's expected benefit and quality risk → advisory, always.

## Trust audit (P2)

The helper reads numeric and enum fields of `cost.json` ledgers and the byte sizes of files. It quotes no free text
from pharn-starter's artifacts. Where the report names a pharn-starter feature slug, the slug is a directory name,
shown as data. No ledger field reaches a proceed/stop decision of this chain. The dev chain's verdicts come from its
own floor gates only.

## Determinism audit (P5)

Eligibility and every exclusion reason are membership tests over enum or version fields. Anything the rule cannot
decide goes to the human.

## Resolved at GATE 1 (2026-09-29, the maintainer)

- **Plan: approved as written.**
- **Q1: option (1), "Audit now".** The build uses static and controlled evidence. It prepares no fixture delivery
  runs and does not wait for real runs. The rule above still decides eligibility, and it currently includes 0 real
  runs.
- **Dates.** The work is authored on 2026-09-29, so the report is
  `.dev/measurements/pipeline-performance-audit-2026-09-29.md` and the CHANGELOG entry is dated `- 2026-09-29:`.
  The path and date above were updated in place from the 2026-09-28 draft.

For the record, the three options that were offered:

- **Q1 — the evidence route.** No post-optimization real run exists. The options:
  - **(1) Audit now from static and controlled evidence.** The report states "0 of 69 real runs are
    post-optimization" in each model-usage and elapsed-time section, and restricts its recommendations to what
    static and controlled measurement supports. The helper re-runs the full analysis once real ledgers at 6.35.0 or
    later exist.
  - **(2) Make controlled delivery runs first.** The helper prepares a fixture: a copy of pharn-starter at a pinned
    commit with the 6.35.0 product surface. It also prepares 2–3 pre-chosen small tasks. You start each `/pharn-loop`
    in its own session, one at a time (L38).
  - **(3) Pause for real runs.** You run `pharn update` in pharn-starter with a CLI at 0.7.0 or later, which migrates
    the `models` block. Your normal work then produces the ledgers, and the audit resumes on them.
