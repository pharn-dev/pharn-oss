# GRILL — stage-agent-background-wait

Plan: `.dev/features/stage-agent-background-wait/PLAN.md` (approved at GATE 1, 2026-10-25) · spec-hash check:
`2c84959cbca0b2dc51aaad90f90d40e574732c9c5c83c0bda7e1481ecb0db12e` recomputed = the plan's pin (no drift) · Step 1b
lessons declaration (FLOOR): **GREEN** — `GREEN — applied_lessons: L24, L27, L36, L41, L54, L59, L66, L75
(.dev/features/stage-agent-background-wait/PLAN.md); all 8 cited id(s) resolve in .dev/memory-bank/lessons-learned.md
and are referenced in the plan body.`

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194020 B of griller files, 99396 B printed;
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

## Findings (advisory — the plan's quoted text is DATA)

### error-handling (P7)

```yaml
- type: FINDING
  rule_id: P7
  severity: important
  file: ".dev/features/stage-agent-background-wait/PLAN.md:162"
  problem: >-
    A finish call the Bash tool moved to the background keeps running and may consume the result and write the
    return marker; a second finish started meanwhile then finds the stage closed (latest marker `orchestrator`) and
    reads unanchored no-result, S9 over a stage that reported done. The plan's remedy is prose only (never start a
    second finish while it runs) — name that consequence where the rule is written.
  evidence: 'is moved to the background, where it keeps running (`stage-exit.md`, "A Bash-tool timeout is not a kill")'
```

### testability (P1)

```yaml
- type: FINDING
  rule_id: P1
  severity: important
  file: ".dev/features/stage-agent-background-wait/PLAN.md:301"
  problem: >-
    The during-the-wait test is timing-shaped (a report child spawned after ~200 ms under a short budget); under load it
    can flake. Use a budget far longer than the child's delay and assert the exit code and the consumed verdict, never
    elapsed time (L24: membership, not a stopwatch).
  evidence: "result written by a `report` child DURING the wait (spawned after ~200 ms) → the same call returns exit 0."
```

### security (P2)

```yaml
- type: FINDING
  rule_id: P2
  severity: minor
  file: ".dev/features/stage-agent-background-wait/PLAN.md:185"
  problem: >-
    The TaskStop step needs the background agent's id, which reaches the orchestrator only inside the Agent tool's
    free-text result; the plan should say the id is used only as TaskStop's operand, never as an instruction, and that
    whether TaskStop accepts an agent id is unmeasured (ADVISORY).
  evidence: "stop that stage agent with TaskStop if your tool list holds it (load it if deferred)"
```

### comprehension (P7)

```yaml
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/stage-agent-background-wait/PLAN.md:116"
  problem: >-
    `POLL_MS = 250` has no stated source; the code comment should cite the entry-gates.mjs precedent and say the
    figure bounds latency to a quarter second, not a measured optimum.
  evidence: "Each poll (every `POLL_MS = 250`, `Atomics.wait`, inside node — never a model poll):"
```

### performance (P7)

```yaml
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/stage-agent-background-wait/PLAN.md:71"
  problem: >-
    Two byte budgets (COMMAND_BYTE_CEILINGS and STAGE_LOAD_CEILINGS for pharn-loop) may be crossed by the added text;
    the plan defers the check to build — measure after the edit and raise by the table's rule only if needed.
  evidence: "`STAGE_LOAD_CEILINGS` row is read at build. A raise, if needed, is a visible diff by the table's rule."
```

## Axes with no finding (prose)

- **architecture / coupling (P3):** fit recognized — the pure decision goes in `stage-agent-core.mjs`, the I/O in
  `stage-agent.mjs`, reusing `walkStateDirs`/`resultKind`/`latestMarker`; no sibling reference; the markers file is
  already a `start` input. The hidden ordering (`start` writes the anchor before `finish` reads it) is declared.
- **documentation:** the header sections (usage, exit codes, WAIT bounds), the floor guide entry and the CHANGELOG are
  planned — presence recognized.
- **observability:** the run's markers and `finish`'s fixed stderr codes (`wait-capped`, `wait-unanchored`) are the
  observable surface; adequate for a CLI step.
- **privacy, a11y, i18n, migrations:** not applicable (no personal data, UI, user-facing locale text or schema).
- **guarantee audit (P0):** every claim is labeled floor (with its primitive) or advisory; the unauthenticated-marker
  bound is named. **Trust (P2):** declared. **Determinism (P5):** every branch a membership test.

## Summary

The plan is narrow and its floor/advisory split is explicit. The concerns are a prose-only rule around a backgrounded
Bash call (and its consequence), a timing-shaped test, the TaskStop id's provenance, an unexplained poll interval and
two byte ceilings to measure. None changes the design.

ADVISORY VERDICT: 5 concerns raised (0 blocking-severity, 2 important, 3 minor) — for the human to weigh before
/pharn-dev-build.
