# GRILL — core-312-reuse-and-effort-measure

Plan `.dev/features/core-312-reuse-and-effort-measure/PLAN.md` · spec-hash: match
(`f058fca367fabcdfecf939dc70bfb43deaadedb1b0e810b790c4aeb156d6775d`) · Step 1b lessons declaration: **GREEN**
(`applied_lessons: L40, L43`, both resolve and are referenced in the body).

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194044 B of griller files, 99396 B printed;
deep omission: 13 pharn-owned, 0 other; left out where present: guarantee-audit (13), machine-readable-emission (13),
two-layers (13), layer-1 (13), finding-output (13); kept whole: none

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`)

Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line; a scanner finding
is not the griller's judgment.

Findings: none (no secrets, PII or i18n scanner hit).

- `scan-plan-migrations`: mentions true — lines 175 (revert). Not a finding: whether the plan needs or adequately
  declares this is the migrations griller's judgment.
- `scan-plan-observability`: mentions false. Not a finding: whether the plan needs or adequately declares this is the
  observability griller's judgment.

## Findings

### Guarantee audit / honest scope (P0, P7)

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/core-312-reuse-and-effort-measure/PLAN.md:68"
  problem: >-
    The pre-7.20.0 "old effort" sample is 4 routed agents, all opus or fable (one spec stage and two probe agents);
    no sonnet-routed stage (triage, build) was observed before 7.20.0, so "old = high for every changed stage" is
    observed for opus/fable routes and only inferred for sonnet routes (from the sonnet parent sessions sending high).
  evidence: "Before 7.20.0 (no `effort` in `meta.json`): 4 routed stage agents in 3 sessions"
```

```yaml
- type: FINDING
  rule_id: "P6"
  severity: minor
  file: ".dev/features/core-312-reuse-and-effort-measure/PLAN.md:72"
  problem: >-
    The post-7.20.0 count (57 agents, 5 sessions) was read at planning time; CORE-310's runs since then added routed
    agents, so the record must re-read the count live at build time and date it, not copy the plan's figure.
  evidence: "After 7.20.0 (`meta.json` `effort: high`): 57 routed stage agents across 5 sessions"
```

### Testability / re-derivability (P1 axis, testability griller)

```yaml
- type: FINDING
  rule_id: "P1"
  severity: minor
  file: ".dev/features/core-312-reuse-and-effort-measure/PLAN.md:128"
  problem: >-
    No eval applies (no capability), but the record's figures come from evidence that is not committed (the measured
    project's stamps, cost.json, Claude Code transcripts); a reader can re-derive them only from the holder's copies,
    so the record must carry each source's sha256 and the exact read command, as the plan says.
  evidence: "No committed script: the reads are one `node -e` each over stamps and transcripts, recorded verbatim"
```

### Privacy (P2, privacy griller)

Scanner clean. One judgment: the transcripts read for Part B carry session ids and the measured project's paths. The
plan already commits durations, counts and digests only and omits session ids. No finding beyond keeping to that.

### Other grillers

a11y, architecture, coupling, i18n, migrations, observability, performance, security, error-handling, comprehension,
documentation: the increment adds one apparatus prose record and one CHANGELOG entry, no code, UI, schema, data path or
contract. No concern warranted. The `revert` mention on line 175 is the keep/revert decision, not a migration.

## Summary

The plan is a measurement record. The main gap is the evidence base for Part B's "before" side: it is small and covers
opus/fable routes only, so the record should state the sonnet-route inference as an inference. Counts must be re-read
at build time. Part A's stand-in (BASE subset for the removed HEAD subset) is already labelled advisory in the plan.

ADVISORY VERDICT: 3 concerns raised (0 blocking-severity, 1 important, 2 minor) — for the human to weigh before
/pharn-dev-build.
