# GRILL — stage-effort-routing

- plan: `.dev/features/stage-effort-routing/PLAN.md` (commit `84485322`); spec-hash check: recomputed
  `f058fca367fabcdfecf939dc70bfb43deaadedb1b0e810b790c4aeb156d6775d` equals the plan's `spec_content_hash` (no drift);
  Step 1b lessons-declaration verdict: **GREEN** — `check-plan-lessons.mjs` exit 0, "all 9 cited id(s) resolve … and
  are referenced in the plan body".
- stage model: the session's (opus), run inside `/pharn-dev-ship`; the griller is the agent that wrote the plan, which
  this log states rather than hides.

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194044 B of griller files, 99396 B printed;
deep omission: 13 pharn-owned, 0 other; left out where present: guarantee-audit (13), machine-readable-emission (13),
two-layers (13), layer-1 (13), finding-output (13); kept whole: none

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`)

Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line; a scanner finding
is not the griller's judgment.

Findings: none (no secrets, PII or i18n scanner hit).

- `scan-plan-migrations`: mentions false. Not a finding: whether the plan needs or adequately declares this is the
  migrations griller's judgment.
- `scan-plan-observability`: mentions true — lines 35 (observability). Not a finding: whether the plan needs or
  adequately declares this is the observability griller's judgment.

## Findings (advisory — each gates nothing)

### Inline axis: P0 / honest measurement

```yaml
- type: FINDING
  rule_id: P0
  severity: important
  file: ".dev/features/stage-effort-routing/PLAN.md:35"
  problem: "AC5 asks for one measured run that records the served effort; the plan's measurement is a direct Agent-tool probe (general-purpose, haiku), not a stage routed through `stage-agent.mjs start` and a pharn-stage agent, so the record must say which it is and name the routed-stage observation as still open."
  evidence: 'One probe Agent call from this session (`general-purpose`, `model: "haiku"`, `effort: "low"`, a one-word prompt)'
```

### error-handling (P7)

Declaration recognized: an out-of-set effort is `inline:resolve-failed`; a tool with no `effort` parameter routes
without it and reports `effort not applied`.

```yaml
- type: FINDING
  rule_id: P7
  severity: important
  file: ".dev/features/stage-effort-routing/PLAN.md:74"
  problem: "The new 'refuses the value without starting an agent, make the call without effort' retry is not composed with the existing pharn-stage → general-purpose type fallback, so the number and order of Agent calls a stage may make, and which report notes apply, are left to the reader."
  evidence: "if your Agent tool lists no `effort` parameter, or refuses the value without starting an agent, make the call without `effort` — the stage still routes"
```

### architecture / coupling (P3)

```yaml
- type: FINDING
  rule_id: P3
  severity: minor
  file: ".dev/features/stage-effort-routing/PLAN.md:57"
  problem: "route-token-core.mjs's header states its one axis as 'the ROUTE TOKEN grammar, and nothing else'; adding the effort grammar there needs that axis restated (what a route requests), or the module carries a second reason to change silently."
  evidence: "`pharn/floor/route-token-core.mjs` gains the effort grammar, beside the token's, as the platform fact it is"
```

### P7 — speculative addition

```yaml
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/stage-effort-routing/PLAN.md:59"
  problem: "`isEffortLine` has no shipped consumer in the design (start builds its line with `effortLine`, and no code parses start's stdout), so exporting it is an addition no failure asks for; test the grammar through `effortLine` and the start output instead, or name its consumer."
  evidence: "`effortLine(level)` → `effort:<level>` or null, and `isEffortLine(v)` (clean-scalar guard, then an anchored alternation built from the set — L14)"
```

### comprehension (P7)

```yaml
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/stage-effort-routing/PLAN.md:61"
  problem: "The desktop client's version is given as 2.1.323 (the orchestrator's reading) and 2.1.325 (the probe transcript) in different places; the record should state both with their sources rather than a merged range."
  evidence: "the Agent tool's `effort` enum as read in Claude Code 2.1.323–2.1.325"
```

### Grillers with no finding

- testability (P1): verification approach present (`## Evals to write`, tests per AC); presence recognized.
- documentation (P7): the one new public surface, `start`'s third stdout line, is documented in the CLI header, both
  commands and `floor-orchestration.md`; declaration recognized.
- comprehension: the third-line placement's WHY (the token stays `route`'s exact line; "a second line `marker: not
written`" stays true) is captured; the version item above is the only concern.
- security / privacy (P2): scanners clean; the effort comes from a checker-validated project config as a closed
  grammar; no untrusted input added. No concern.
- performance (P7): no scaling surface (one extra stdout line, no extra spawn).
- observability (P6): the scanner hit is the word in prose; the plan builds no operational service. The observable
  for this change is the transcript's `output_config.effort`, which the plan records; no absence finding.
- migrations (P7): no persisted-data shape changes (the marker's `route` grammar is unchanged); no finding.
- a11y / i18n (P7): no UI and no user-facing translatable text; nothing triggers.

## Summary

The plan's deterministic parts (the enum, the parity test, the third line) reduce to enum/regex checks and are labeled
so. The concerns are about honesty and edges: the AC5 measurement is a direct Agent probe and must say so; the new
"call without effort" retry needs composing with the type fallback (state the call order and the bound); and two small
items — restate route-token-core's axis, and drop or justify `isEffortLine`. The version note is cosmetic.

ADVISORY VERDICT: 5 concerns raised (0 blocking-severity, 2 important, 3 minor) — for the human to weigh before
/pharn-dev-build. The Step 1b GREEN above is a separate floor verdict and is not part of this count.
