# GRILL — s14-gates-exclude-remedy

Plan: `.dev/features/s14-gates-exclude-remedy/PLAN.md` · spec-hash: match
(`ab4dbd928b96b51bdb54ee12b91e87a95d1ba144013a26b8f20ffa9b4122c7fd`) · Step 1b lessons declaration: **GREEN** —
`applied_lessons: L29, L33`; both ids resolve and are referenced in the plan body (declaration only, never
application — P0).

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

### Inline — guarantee audit / scope (P0, P7)

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/features/s14-gates-exclude-remedy/PLAN.md:37"
  problem: "The S14 remedy must stay conditional on the gate being unable to run on this machine; an unconditional `gates.exclude` offer at a red-gate stop would read as a way to hide a gate the project genuinely fails."
  evidence: "if the gate cannot run on this machine, list it in `pharn.config.json` `gates.exclude` and commit that before the re-run"
```

### testability (P1)

Presence recognized (Design 7 declares a four-site enumeration test). Layer 2:

```yaml
- type: FINDING
  rule_id: P1
  severity: minor
  file: ".dev/features/s14-gates-exclude-remedy/PLAN.md:55"
  problem: "The bullet slice runs to the next `\\n- `, so the exit-4 slice is bounded only if the added remedy text stays inside that one bullet (no nested list); the test should also assert each slice is non-trivially short so a missed terminator cannot make it swallow the exit-6 bullet and pass on its words."
  evidence: "each bullet sliced from its `- \\`N\\` → **S14…**` start to the next `\\n- `"
```

### comprehension / documentation (P7)

```yaml
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/s14-gates-exclude-remedy/PLAN.md:38"
  problem: "The disclosed cost names only that the gate does not run and is reported as excluded; it omits that an acceptance criterion whose level needs that gate cannot be tested (`/pharn-plan` halts, `ac-tests.md`). The prompt fixed the cost wording, so this is surfaced for the human, not a request to widen it."
  evidence: "(an excluded gate does not run and is reported as excluded)"
```

The other eleven grillers (a11y, architecture, coupling, error-handling, i18n, migrations, observability,
performance, privacy, security) raise nothing: the change is command prose, a test, README prose and a version
bump — no UI, schema, runtime path, personal data, new input or new module edge.

## Summary

A small, well-triggered plan: the measured stop is cited, the remedy sites were swept from the shortest invariant
substring, exclusions carry reasons, and the one floor claim (presence in four sites) reduces to the planned test.
The concerns are wording discipline at S14 (keep it conditional), a robustness detail in the test's slicing, and an
unstated second cost of excluding a gate.

ADVISORY VERDICT: 3 concerns raised (0 blocking-severity, 3 advisory) — for the human to weigh before
/pharn-dev-build.
