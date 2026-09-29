# GRILL — pipeline-performance-audit

Plan: `.dev/features/pipeline-performance-audit/PLAN.md`. Spec-hash check: `node .dev/floor/hash-doc.mjs pharn/ARCHITECTURE.md`
→ `d831d30d399a37dc403080072763d13383de6f6f31875e7e8cb4eadeb642f4f4`, equal to the plan's `spec_content_hash` (no
drift). **Step 1b (FLOOR):** `node pharn/floor/check-plan-lessons.mjs .dev/features/pipeline-performance-audit/PLAN.md
.dev/memory-bank/lessons-learned.md` → exit **0**, `GREEN — applied_lessons: L4, L24, L38, L40, L43, L63 … all 6 cited
id(s) resolve in .dev/memory-bank/lessons-learned.md and are referenced in the plan body.` That verdict covers the
DECLARATION only; whether each lesson was genuinely applied is advisory and is interrogated below (see G9).

**How this grill was run (recorded, advisory).** One read-only pass by the grill stage itself. The plan is
`trust: untrusted`; every `problem` / `evidence` value below inherits that tag and is quoted DATA (P2). No
instruction-shaped content addressed to the grill was found in the plan. Discovery claims were re-read live where they
bear on a finding: the four part-file byte counts, `ROUTE_POLICY` in `pharn/floor/stage-agent-core.mjs`, this repo's
`pharn.config.json`, `stage-agent.mjs`'s `brief` branch (it writes stdout only), `pharn/pharn-contracts/cost-ledger.md`,
the two controlled `MEASUREMENT.md` files, the 6.32.0 CHANGELOG entry, and the pharn-starter ledgers' enum fields
(69 ledgers: 56 `6.12.1` / `run-window/1`, 13 `6.7.0` / schema `/1` with no `membership`; all `coverage: partial`,
none with `executions` or `work` — the plan's counts reproduce).

**Registered grillers** (`node pharn/floor/count-grillers.mjs .` → `registered: 13`): a11y, architecture,
comprehension, coupling, documentation, error-handling, i18n, migrations, observability, performance, privacy,
security, testability. Scanners: `scan-plan-secrets` `{"found":false}`, `scan-plan-pii` `{"found":false}`,
`scan-plan-i18n` `{"found":false}`, `scan-plan-observability` `mentions:true` (lines 83, 86, 87 — the word "metrics"
meaning model-usage metrics; incidental), `scan-plan-migrations` `mentions:true` (line 237 — `pharn update` migrating a
config block in an option not chosen; incidental).

## Findings — built-in axes

### Determinism and the frozen run-selection rule (P5)

```yaml
# G1
- type: FINDING
  rule_id: "P5"
  severity: important
  file: ".dev/features/pipeline-performance-audit/PLAN.md:214"
  problem: "The claim that eligibility and every exclusion reason are membership tests over enum or version fields is false for two of the rule's own tests: `fixture-not-workload` has no ledger field to test (a cost.json does not record whether its project is a fixture, so the decision is a classification of a directory — a human's, at GATE 1, or a guess), and the version test reads `skills_version`, which cost-ledger.md labels ADVISORY ('records the configured version, never the bytes of the emitter that ran')."
  evidence: "PLAN.md:214 'Eligibility and every exclusion reason are membership tests over enum or version fields.' PLAN.md:85 'the run happened in a real project, not a fixture.' PLAN.md:83 '`skills_version` ≥ 6.35.0 for the full profile.'"
# G2
- type: FINDING
  rule_id: "P5"
  severity: important
  file: ".dev/features/pipeline-performance-audit/PLAN.md:100"
  problem: "The 'closed' exclusion set is not closed over the rule's own conditions, so the rule as frozen cannot decide every ledger: the 13 schema-/1 ledgers have NO `membership.method` (they fail 'must be run-window/2' but are not `run-window/1`, and PLAN.md:112 gives them no membership reason); the marker-completeness and open-execution checks of job (b) and the per-metric exclusions of rule 3 (an `unmeasured` execution, a missing work row) map to no reason; `coverage: unknown` is not a member of the contract's coverage enum (`partial | unavailable`); and rule 4 names no sample size above 20 and strata keyed on `mode`, which is not a top-level ledger field."
  evidence: "PLAN.md:88-89 '`membership.method` must be `run-window/2`. `coverage` must not be `unavailable` or `unknown`.' PLAN.md:97-98 'Above 20, the sample is stratified by (command, mode, outcome, iteration count), taking every stratum, round-robin' PLAN.md:122 'marker-completeness and open-execution checks the prompt lists'"
```

### Guarantee audit (P0)

```yaml
# G3
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/pipeline-performance-audit/PLAN.md:74"
  problem: "The rule is headed 'frozen before any cost is inspected' and the build 'may not amend it', but the plan's own discovery already inspected a ledger's cost figures before the rule was written, and nothing on the floor pins the rule text between GATE 1 and the build (PLAN.md is not content-hashed by any stage), while the guarantee audit neither reduces the freeze to a floor op nor labels it advisory."
  evidence: "PLAN.md:74 'frozen HERE, before any cost is inspected' PLAN.md:61-62 'One sampled ledger has 393 requests and 16,852 output tokens.' PLAN.md:76-77 'The build applies it verbatim and may not amend it after seeing cost figures.'"
# G4
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/pipeline-performance-audit/PLAN.md:71"
  problem: "Static evidence is described as the bytes 'that enter a stage's context', but the planned pass measures only prescribed command, part and brief bytes: it omits the fixed context every stage agent and the orchestrator carry (system prompt, tool schemas, the project's CLAUDE.md — 172,421 B in this repo against 43,164 B for the largest command, pharn-loop.md — memory, MCP instructions), it cannot see what a model actually Reads, and `ceil(bytes / 4)` yields neither a token CLASS (input vs cache-creation vs cache-read) nor the per-request multiplier the 6.32.0 entry says governs cost — so section 4 'Dominant remaining costs' cannot be RANKED from it, and the per-class rule at line 152 has no stated way to hold a static estimate; the divisor 4 is also given no source."
  evidence: "PLAN.md:71-72 'the bytes of every command, part, stage-agent brief and prescribed read that enters a stage's context.' PLAN.md:134 'Token counts are derived as `ceil(bytes / 4)` and labelled estimates.' PLAN.md:152 'Token classes are always reported separately.'"
# G5
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/pipeline-performance-audit/PLAN.md:150"
  problem: "One label per number conflates two axes — source (real / controlled / static) and precision (estimate) — so a static byte-derived estimate and the 6.32.0 request-profile estimate share `estimate` and read as comparable; `controlled` carries no fixture identity or floor commit, although the two MEASUREMENT.md files used different fixtures (3 gates with an install vs 4 gates with `--no-install`) and pre-6.35.0 floors (L24's inherited-bound disease); and line 70 itself mislabels the 6.32.0 entry, whose request counts were MEASURED over 37 real orchestrator transcripts and only whose savings are estimates."
  evidence: "PLAN.md:150 'Every number carries one label, from `real` / `controlled` / `static` / `estimate`, plus its denominator.' PLAN.md:70 'The 6.32.0 CHANGELOG entry: measured command bytes, plus request and token figures it labels estimates.'"
# G6
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/features/pipeline-performance-audit/PLAN.md:193"
  problem: "`validate.mjs` GREEN is cited as part of the floor reduction for 'changed no PHARN runtime behaviour', but validate checks capability and contract shape over the product surface, not that its bytes are unchanged; the real backstops are the writes-scope hook (prevents Write-tool writes outside `## Files`) and reconcile (detects Bash writes), which the same bullet already names."
  evidence: "PLAN.md:193-194 'floor, but only for the product surface in the dev chain: `validate.mjs` GREEN, plus the diff limited to the four `## Files` paths.'"
```

### Discovery-first (P6)

```yaml
# G7
- type: FINDING
  rule_id: "P6"
  severity: important
  file: ".dev/features/pipeline-performance-audit/PLAN.md:47"
  problem: "The inventory lists ONE real orchestrator transcript, while the 6.32.0 CHANGELOG entry reports request counts measured in 37 orchestrator transcripts on the maintainer's machine; the rule's universe admits only cost.json files, so transcript-only evidence (per-request usage, served model, request counts per run) is excluded by construction, with no closed reason and without the human having decided it — for the human: is that exclusion intended, and are those 37 transcripts all pre-optimization?"
  evidence: "PLAN.md:47-48 'one real `/pharn-loop` transcript in `~/.claude/projects/…pharn-loop-run/`, dated 2026-09-21' PLAN.md:79 'Every `cost.json` under a `pharn/features/*/` directory that the evidence inventory names'"
# G8
- type: FINDING
  rule_id: "P6"
  severity: important
  file: ".dev/features/pipeline-performance-audit/PLAN.md:35"
  problem: "The 'current execution profile' is derived from THIS repo's `models.stages`, but routing is config-conditional and the only project with real runs (pharn-starter) carries the pre-0.7.0 block (top-level `default`, `opus-4-8` / `sonnet-5`), which check-model-config REDs at 6.35.0 so every routed stage runs `inline:config-red` on the session model; the plan does not say which config section 2 describes or that the profile differs per install."
  evidence: "PLAN.md:35-36 'The requested models come from `pharn.config.json` `models.stages`. In this repo that is spec, plan, grill, review, memory-promote and ac-test on opus; build, regress, verify, ship and loop on sonnet'"
# G9
- type: FINDING
  rule_id: "P6"
  severity: minor
  file: ".dev/features/pipeline-performance-audit/PLAN.md:181"
  problem: "L38 is applied to run-window/1 contamination, but canon's L38 records concurrent sessions contending for `.pharn/writes-scope.json` (a false-cause scope RED); the ledger contamination is the 6.29.0 measurement, and the one L38-apt application (serial controlled runs) belongs to Q1 option (2), which was not chosen — the declaration is GREEN, the application is misattributed."
  evidence: "PLAN.md:181-183 'Concurrent sessions contaminated `run-window/1` membership in the historical corpus. So `membership-run-window-1` is a closed exclusion reason. Any controlled delivery runs made for this audit (Q1 option 2) run one at a time'"
```

### Honest scope / no speculation (P7)

```yaml
# G10
- type: FINDING
  rule_id: "P7"
  severity: important
  file: ".dev/features/pipeline-performance-audit/PLAN.md:123"
  problem: "Under the resolved route (0 eligible runs) helper job (c), per-stage profile extraction over `executions` / `work` / markers, and job (b)'s marker-completeness and open-execution checks have no input to run on; they are justified only by a future re-run, which is the hypothetical P7 forbids and outside the prompt's 'only if necessary to inspect existing evidence' — and (c) re-derives views cost.json already stores and check-cost-ledger.mjs recomputes (`executions` via stage-executions-core.mjs), a second owner of one derivation."
  evidence: "PLAN.md:123-124 '(c) extract per-stage profiles, keeping four dimensions separate' PLAN.md:220-222 'The rule above still decides eligibility, and it currently includes 0 real runs.' PLAN.md:232-233 'The helper re-runs the full analysis once real ledgers at 6.35.0 or later exist.' PLAN.md:15-16 'only if necessary to inspect existing evidence'"
```

## Findings — registered grillers

### testability (P1)

Presence recognized: the plan declares a reproducibility check (the two helper invocations print every cited number).
Layer 2 (adequacy):

```yaml
# T1
- type: FINDING
  rule_id: "P1"
  severity: important
  file: ".dev/features/pipeline-performance-audit/PLAN.md:134"
  problem: "Reproducibility is declared but correctness is not: the helper gets no test, although the headline '0 of 69' rests on its version comparison (a string compare orders '6.7.0' after '6.35.0' and would admit the 13 6.7.0 ledgers), the static numbers change with every later commit unless the report records the commit they were measured at, and nothing compares the report's figures with the helper's output."
  evidence: "PLAN.md:134-136 'The helper must be reproducible: `node .dev/features/pipeline-performance-audit/audit.mjs --static` and `… --ledgers <paths…>` print every number the report cites.' PLAN.md:197-198 'nothing on the floor checks the report against the helper's output.'"
```

### error-handling (P7)

```yaml
# E1
- type: FINDING
  rule_id: "P7"
  severity: minor
  file: ".dev/features/pipeline-performance-audit/PLAN.md:121"
  problem: "The helper shells check-cost-ledger.mjs but the plan does not map its exits to reasons: exit 1 is both a RED and node's own crash code (the class pharn/floor/shelled-verdict-core.mjs owns — a RED is exit 1 WITH its `RED — ` line), and exit 2 (unusable input) has no stated reason, so a crashed checker could exclude a run as `ledger-red`."
  evidence: "PLAN.md:121 '(b) validate each ledger by shelling `pharn/floor/check-cost-ledger.mjs` as a CLI'"
```

### security (P2)

Scanner clean. Layer 2:

```yaml
# S1
- type: FINDING
  rule_id: "P2"
  severity: minor
  file: ".dev/features/pipeline-performance-audit/PLAN.md:121"
  problem: "The ledger paths the helper passes to a child process come from another project's directory names and a `--ledgers` argv list, and the plan does not state an argv-array spawn with no shell — the shell-sink class this repo recorded in 6.28.0 and 6.30.0."
  evidence: "PLAN.md:121 'shelling `pharn/floor/check-cost-ledger.mjs` as a CLI' PLAN.md:136 '`… --ledgers <paths…>`'"
```

### privacy (P2)

Scanner clean. Layer 2:

```yaml
# PR1
- type: FINDING
  rule_id: "P2"
  severity: minor
  file: ".dev/features/pipeline-performance-audit/PLAN.md:136"
  problem: "The report is committed to a public repo and cites helper output over files under the home directory, yet the plan states no path-redaction rule, while the repo's own ledger contract forbids absolute paths in a committed artifact; a printed ledger path or transcript directory key would carry the user's home path."
  evidence: "PLAN.md:42 '`~/Projects/pharn-starter/pharn/features/*/cost.json`' PLAN.md:47 '`~/.claude/projects/…pharn-loop-run/`' PLAN.md:136 'print every number the report cites'"
```

### comprehension (P7)

```yaml
# C1
- type: FINDING
  rule_id: "P7"
  severity: minor
  file: ".dev/features/pipeline-performance-audit/PLAN.md:24"
  problem: "The four byte counts are listed in an order that does not follow the brace expansion they annotate (live: loop-quick 11,091, loop-close 31,211, ship-quick 11,223, ship-close 28,179), so a reader or the report can attribute them to the wrong files."
  evidence: "PLAN.md:24 '`.claude/commands/pharn-{loop,ship}-{quick,close}.md` exist (11,091 / 11,223 / 31,211 / 28,179 B)'"
```

### No finding (reason recorded)

- **architecture** — fit recognized: helper scripts under `.dev/features/<name>/` have precedent
  (`regress-base-reuse/measure.mjs`, `verify-head-gate-reuse/measure.mjs`, `run-performance-breakdown/demo.mjs`), and
  measurement reports live in `.dev/measurements/`.
- **coupling** — clean seam: the checker is shelled as a CLI, not imported; the duplicated derivation is G10.
- **performance** — no scaling risk: 69 JSON files and a fixed set of command files.
- **documentation** — the helper is apparatus with its invocations stated; no public surface is added.
- **observability** — scanner mentions are incidental ("metrics" = model-usage metrics); an offline analysis script
  needs no runtime observability.
- **migrations** — the one mention is `pharn update`'s config migration in an unchosen option; no persisted schema is
  touched.
- **a11y**, **i18n** — no UI and no user-facing strings.

## Summary

The plan is honest about its central limit (0 of 69 real runs are post-optimization) and keeps the analysis-only
scope, but the frozen rule is weaker than its framing. It is neither closed nor fully decidable: two tests are not
membership tests over enum fields (G1), and several conditions map to no reason, with the sample size above 20
undefined (G2). Its freeze is asserted with no floor backing, after cost figures had already been read (G3). Under
the chosen route the report rests on static and controlled evidence. The static pass as scoped omits the largest fixed
context component and cannot yield a token class or a per-run multiplier, so it cannot rank "dominant remaining
costs" (G4). The four-label scheme cannot keep estimates of different provenance, or controlled figures from
different fixtures and floors, apart (G5). Two discovery gaps bear on the evidence set and the execution profile:
transcript evidence (G7) and config-conditional routing (G8). The helper is partly built for inputs that do not exist
yet (G10), and its correctness is unverified where the headline number depends on it (T1). The minor findings (G6, G9,
E1, S1, PR1, C1) are corrections to citations, exit handling, spawn form, path hygiene and one byte list.

For the human (P5 — asked, not guessed): who decides `fixture-not-workload`, and on what record (G1); whether
transcript-only evidence is meant to be excluded (G7); which project's config section 2 describes (G8); and whether
job (c) should be deferred rather than built (G10).

Finding ids, in order of appearance (each is the `#` comment above its object): G1 (P5 :214), G2 (P5 :100), G3 (P0
:74), G4 (P0 :71), G5 (P0 :150), G6 (P0 :193), G7 (P6 :47), G8 (P6 :35), G9 (P6 :181), G10 (P7 :123), T1 (P1 :134),
E1 (P7 :121), S1 (P2 :121), PR1 (P2 :136), C1 (P7 :24).

ADVISORY VERDICT: 15 concerns raised (0 blocking-severity, 15 advisory — 9 important, 6 minor) — for the human to
weigh before /pharn-dev-build. This verdict covers the interrogation only; the Step 1b lessons-declaration verdict
(GREEN, exit 0) is a separate floor result and is not counted here.
