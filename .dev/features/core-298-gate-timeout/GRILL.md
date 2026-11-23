# GRILL — core-298-gate-timeout

Plan: `.dev/features/core-298-gate-timeout/PLAN.md` · spec-hash check: MATCH
(`f058fca367fabcdfecf939dc70bfb43deaadedb1b0e810b790c4aeb156d6775d`, `node .dev/floor/hash-doc.mjs pharn/ARCHITECTURE.md`)
· Step 1b lessons-declaration verdict (FLOOR): **GREEN** — `applied_lessons: L33, L35, L41, L50, L62, L75, L84`, all 7
cited ids resolve in `.dev/memory-bank/lessons-learned.md` and are referenced in the plan body.

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194044 B of griller files, 99396 B printed;
deep omission: 13 pharn-owned, 0 other; left out where present: guarantee-audit (13), machine-readable-emission (13),
two-layers (13), layer-1 (13), finding-output (13); kept whole: none

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`)

Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line; a scanner finding
is not the griller's judgment.

Findings: none (no secrets, PII or i18n scanner hit).

- `scan-plan-migrations`: mentions false. Not a finding: whether the plan needs or adequately declares this is the
  migrations griller's judgment.
- `scan-plan-observability`: mentions false. Not a finding: whether the plan needs or adequately declares this is the
  observability griller's judgment.

## Findings

### Inline — determinism / run pin (P5)

```yaml
- type: FINDING
  rule_id: P5
  severity: minor
  file: ".dev/features/core-298-gate-timeout/PLAN.md:80"
  problem: "Under stage-direct the stage script now reads pharn.config.json a second time, after stage-direct's run-pin check; a declaration edited in the window between the two reads would be applied without the timeout-changed pin. The window is one process start, and a below-pinned edit still refuses, but the plan should state the bound rather than call the path simply idempotent."
  evidence: "the script resolves it again to the same value"
```

### Inline — guarantee audit (P0)

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/features/core-298-gate-timeout/PLAN.md:89"
  problem: "The build gate's raised budget lets one invocation run past the 600 s Bash call by up to the declared value; the plan relies on the harness moving the call to the background, which stage-exit.md records as an observed harness behaviour (ADVISORY), not a floor fact. The command text and CHANGELOG must say so, and must not imply the 600 s tie still holds for a declared run."
  evidence: "The budget is raised by the same amount"
```

### Inline — scope honesty (P7)

```yaml
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/core-298-gate-timeout/PLAN.md:35"
  problem: "The failure is a code reading from a review plus CORE-87's measurements of entry/regress/verify timeouts; no recorded run shows the build gate itself killed at 540 s. The trigger is sound (the same suite runs at the build), but the CHANGELOG should cite it as the review finding, not as a measured build-stage failure."
  evidence: "every build iteration runs the full gate for 9 minutes"
```

### Griller axes

#### testability (P1)

Presence recognized: `## Evals to write (P1)` names a test per CLI with a declaration, a below-pinned refusal and a
budget case.

```yaml
- type: FINDING
  rule_id: P1
  severity: minor
  file: ".dev/features/core-298-gate-timeout/PLAN.md:192"
  problem: "The timing margins (a 1 s sleep against a 300 ms pinned timeout) are fine in isolation but this machine runs under heavy parallel load; widen the declared value well above the sleep (e.g. 10 s) so a loaded run cannot kill the declared case, and keep the pinned kill case's sleep well above 300 ms."
  evidence: "one gate sleeping 1 s → exit 0; the same without the config → exit 3 (killed at 300 ms)"
```

#### architecture / coupling (P3)

Fit recognized: the three CLIs import `gate-timeout-core.mjs` and `gate-exclusion-core.mjs` from the same product
floor, exactly as `entry-gates.mjs` and `stage-direct.mjs` do; no sibling module root is crossed and the value rule
keeps one owner.

#### error-handling (P7)

Present and adequate: a refused `gates` block falls back to the pinned value (the runner's `init` still refuses it),
and a below-pinned declaration is a named `unusable` refusal with `effectiveTimeoutMs`'s reason.

#### performance (P7)

No scaling risk recognized: one small config read per fresh invocation. The longer kill time for a hung gate is the
key's documented cost, not new.

#### documentation / comprehension (P7)

Present: the plan names every contract, header and doc that states where the key applies (Sweep).

#### a11y, i18n, migrations, observability, privacy, security

Not applicable: no UI, user-facing strings beyond floor messages, schema, telemetry or personal data. The only new
input read is the existing `gates.timeoutMs` value, range-checked as before (security: no new trust boundary).

## Summary

The approach is the smallest deterministic one and fits the existing two-runner pattern. The concerns are about
stating bounds honestly (the second config read under stage-direct; the Bash-call overrun being a harness behaviour)
and test robustness under load, plus phrasing the trigger as a review finding.

ADVISORY VERDICT: 4 concerns raised (0 blocking-severity, 4 advisory) — for the human to weigh before /pharn-dev-build.
