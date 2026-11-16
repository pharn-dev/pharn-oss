# GRILL — lean-stage-agent

Plan `.dev/features/lean-stage-agent/PLAN.md`. Spec-hash check: `f058fca3…6775d` recomputed equals the plan's re-pinned
`spec_content_hash` (no drift). Step 1b lessons declaration: **GREEN** — `check-plan-lessons.mjs` exit 0
(`applied_lessons: L1, L33, L35, L36, L60, L68, L70`; all 7 cited ids resolve and are referenced in the plan body).

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194044 B of griller files, 99396 B printed;
deep omission: 13 pharn-owned, 0 other; left out where present: guarantee-audit (13), machine-readable-emission (13),
two-layers (13), layer-1 (13), finding-output (13); kept whole: none

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`)

Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line; a scanner finding is
not the griller's judgment.

Findings: none (no secrets, PII or i18n scanner hit).

- `scan-plan-migrations`: mentions false. Not a finding: whether the plan needs or adequately declares this is the
  migrations griller's judgment.
- `scan-plan-observability`: mentions false. Not a finding: whether the plan needs or adequately declares this is the
  observability griller's judgment.

## Findings (advisory — each gates nothing)

### error-handling (griller) / P5

```yaml
- type: FINDING
  rule_id: P5
  severity: important
  file: ".dev/features/lean-stage-agent/PLAN.md:77"
  problem: "The fallback condition must be a test the orchestrator can read from the Agent call's own return, or a stage agent that started as pharn-stage and then failed could be re-run as general-purpose — two executors of one stage."
  evidence: 'if that type is not offered or the call is refused for it (no agent started), the same call once with `subagent_type: "general-purpose"` before the finish line'
```

The build should word item 2 so that the fallback applies only when the type is absent from the Agent tool's offered
types or the call returned an error without starting an agent; any started agent (a completed result or a
background-launch notice) goes to the finish line exactly as today, never to a second call.

### security (griller, Layer 2) / P2

```yaml
- type: FINDING
  rule_id: P2
  severity: important
  file: ".dev/features/lean-stage-agent/PLAN.md:73"
  problem: "The definition's body replaces Claude Code's general-purpose system prompt for every routed stage, so whatever that prompt contributed (tool-use guidance, caution about destructive commands) is gone; the plan names the tool-list change but not this one."
  evidence: "Body after its H1: the role, and that the prompt's first line names the `stage-agent.mjs brief` line to run first and follow"
```

The brief's rules (no git write, no Agent tool, writes through the write tools) and each stage command still govern;
the build should say in the claims sentence that the container's system prompt is the definition's body, and the probe
should record whether the environment block survives.

### testability (griller) / P1

```yaml
- type: FINDING
  rule_id: P1
  severity: minor
  file: ".dev/features/lean-stage-agent/PLAN.md:73"
  problem: "`MultiEdit` is not offered as a tool in every current Claude Code session; nothing in the plan checks what Claude Code does with a `tools:` entry it does not know (ignored, or the definition rejected)."
  evidence: "`tools: Read, Glob, Grep, Bash, Write, Edit, MultiEdit, NotebookEdit`"
```

The probe's reader should print the first request's tool-schema names from the `api-request-shape` row, so an unknown
entry shows up as absent rather than as a refused definition.

### architecture / coupling / comprehension / documentation (grillers)

Fit recognized: the new definition sits beside the only existing one in `.claude/agents/`, the commands cite the brief's
owner rather than restating it (L35), and the guide and both trusted-doc sentences that the second definition makes
false are in scope (L1, L33). No P3 finding.

### a11y, i18n, migrations, observability, performance, privacy (grillers)

Not applicable: no user interface, no user-facing strings, no schema, no production runtime and no personal data. No
finding.

## Summary

The plan is a container swap with a named fallback, and its guarantee audit already labels the tool list and the
saving advisory. The live risk is the fallback's condition: a loose one turns "the type was missing" into "the stage
ran twice". The other two are disclosures the build can make in the claims sentence and the kit.

ADVISORY VERDICT: 3 concerns raised (0 blocking-severity, 2 important, 1 minor) — for the human to weigh before
/pharn-dev-build.
