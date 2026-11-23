# GRILL — core-311-stage-agent-benchmark

Plan: `.dev/features/core-311-stage-agent-benchmark/PLAN.md` · spec-hash: recomputed
`f058fca367fabcdfecf939dc70bfb43deaadedb1b0e810b790c4aeb156d6775d` = the plan's pin (no drift) · Step 1b
lessons-declaration verdict (FLOOR): **GREEN** — `check-plan-lessons.mjs` exit 0, "applied_lessons: L1, L33, L40, L66,
L78 … all 5 cited id(s) resolve … and are referenced in the plan body."

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194044 B of griller files, 99396 B printed;
deep omission: 13 pharn-owned, 0 other; left out where present: guarantee-audit (13), machine-readable-emission (13),
two-layers (13), layer-1 (13), finding-output (13); kept whole: none

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`)

Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line; a scanner finding
is not the griller's judgment.

Findings: none (no secrets, PII or i18n scanner hit).

- `scan-plan-migrations`: mentions false. Not a finding: whether the plan needs or adequately declares this is the migrations griller's judgment.
- `scan-plan-observability`: mentions true — lines 102 (logging). Not a finding: whether the plan needs or adequately declares this is the observability griller's judgment.

## Findings

### Built-in interrogation

```yaml
- type: FINDING
  rule_id: P6
  severity: important
  file: ".dev/features/core-311-stage-agent-benchmark/PLAN.md:78"
  problem: "The plan lists run 2's empty pharn/.run/ as a known difference but does not say how its effect on wall-clock is separated; the orchestrator's GATE-1 reply asks the record to state whether run 1's entry gates hit a warm cache and, if so, to report entry time apart from the stage times."
  evidence: "Known differences that are not the axis, stated rather than hidden: run 2's `pharn/.run/` starts empty (run 1's held earlier runs' state)"
- type: FINDING
  rule_id: P5
  severity: minor
  file: ".dev/features/core-311-stage-agent-benchmark/PLAN.md:65"
  problem: "With the definition absent, the orchestrator may still call `pharn-stage` once per stage, get an error and then fall back; the plan does not say these failed calls are counted, so their tokens could be read as a general-purpose cost."
  evidence: "every routed stage takes the command's own documented fallback, `general-purpose`"
```

### error-handling griller

```yaml
- type: FINDING
  rule_id: P7
  severity: important
  file: ".dev/features/core-311-stage-agent-benchmark/PLAN.md:1"
  problem: "The plan does not say what the record does when an arm does not complete comparably: run 2 crashes or is refused, the shadcn MCP server fails to start in the worktree, or the two arms stop on different tokens (one green, one blocked) so per-stage figures cover different stage sets."
  evidence: "no failure branch beside 'Launch' steps 1-4; 'What is read and compared' assumes both arms produce the same stages"
```

### privacy griller

```yaml
- type: FINDING
  rule_id: P2
  severity: important
  file: ".dev/features/core-311-stage-agent-benchmark/PLAN.md:190"
  problem: "The transcripts carry account and organization UUIDs (`session-owner` records) and absolute home paths; the plan names home-path redaction only, so a copied figure or a measure.mjs printout could put the account ids in a committed record."
  evidence: "`measure.mjs` redacts the home directory in printed paths."
```

### security griller

```yaml
- type: FINDING
  rule_id: P2
  severity: important
  file: ".dev/features/core-311-stage-agent-benchmark/PLAN.md:72"
  problem: "Run 2 copies `.env.local` (the measured project's secrets) and `.claude/settings.local.json` into a scratch worktree the plan then leaves in place; the plan should remove those two copies once the evidence is collected, keeping the worktree otherwise."
  evidence: "the ignored files the session and the gates read: `.claude/settings.local.json` (the shadcn MCP enablement), `.env.local`, …" and "leave the worktree and any `pharn-loop/<name>-N` branch in place"
```

### testability griller

Presence recognized: the plan pre-registers what is read and from which record. Layer 2:

```yaml
- type: FINDING
  rule_id: P1
  severity: minor
  file: ".dev/features/core-311-stage-agent-benchmark/PLAN.md:158"
  problem: "measure.mjs has no test, and the plan does not name a cross-check for its figures; the session totals in final.json (usage, modelUsage, total_cost_usd) are an independent record its per-agent sums can be compared against."
  evidence: "read-only reader that prints both arms' comparison … (no test, like `probe/read-probe.mjs`)"
```

### Other grillers — no finding

- a11y, i18n, migrations: no user interface, no text for end users, no schema change.
- architecture, coupling: dev apparatus only, no new module or reference across module roots.
- comprehension: the one-axis design and the "needed a dropped tool" rule each carry their why in the plan.
- documentation: no public surface added; the record is the documentation.
- observability: the run is observed through the transcripts, `final.json`, `cost.json` and start/stop stamps the plan
  names; the scanner's line-102 hit ("logging" inside "Dropped-tool use" paragraph context) is incidental.
- performance: the 1.3 GB clone is placed under the heavy lock after run 1, the one cost the plan weighs.

## Summary

The design varies one condition and names the rest. The gaps are around the edges: what the record says when an arm
does not finish comparably, how a warm entry cache in run 1 is kept out of the agent-type comparison (the
orchestrator asked for this explicitly), counting failed `pharn-stage` calls in run 2, keeping account ids out of the
record, and removing the copied secrets after the run. All can be met inside the plan's `## Files` and launch steps
without a re-plan.

ADVISORY VERDICT: 6 concerns raised (0 blocking-severity, 4 important, 2 minor) — for the human to weigh before
/pharn-dev-build. The Step 1b lessons-declaration result is its own floor verdict (GREEN, above) and is not counted
here.
