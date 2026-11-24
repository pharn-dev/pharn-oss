# GRILL — test-stage-typecheck

Plan: `.dev/features/test-stage-typecheck/PLAN.md` · spec-hash: match (`f058fca3…775d`) · Step 1b lessons declaration:
**GREEN** (`check-plan-lessons.mjs` exit 0 — L11, L19, L29, L34, L35, L41, L45, L62, L83 resolve and are referenced; the
declaration, never the application).

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194044 B of griller files, 99396 B printed; deep omission: 13 pharn-owned, 0 other; left out where present: guarantee-audit (13), machine-readable-emission (13), two-layers (13), layer-1 (13), finding-output (13); kept whole: none

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`)

Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line; a scanner finding
is not the griller's judgment.

Findings: none (no secrets, PII or i18n scanner hit).

- `scan-plan-migrations`: mentions false. Not a finding: whether the plan needs or adequately declares this is the migrations griller's judgment.
- `scan-plan-observability`: mentions true — lines 38 (logging), 46 (logging), 48 (logging), 55 (logging), 65 (logging), 75 (logging), 113 (logging), 117 (logging). Not a finding: whether the plan needs or adequately declares this is the observability griller's judgment.

## Findings

### Inline — guarantee audit (P0)

```yaml
- type: FINDING
  rule_id: P0
  severity: important
  file: ".dev/features/test-stage-typecheck/PLAN.md:59"
  problem: "TS2339 is in the exempt set, but it is also the code of many test-own mistakes (a property read on a wrongly typed mock or on `process.env` narrowing), so the exempt set lets a class of test-own errors through to the same post-build dead end; the bound must name TS2339 explicitly, not only the assignability codes."
  evidence: "`MISSING_TARGET_CODES` (frozen, one enumeration): TS2304, TS2305, TS2306, TS2307, TS2339, …"
```

### Inline — error handling (P7, error-handling griller)

```yaml
- type: FINDING
  rule_id: P7
  severity: important
  file: ".dev/features/test-stage-typecheck/PLAN.md:48"
  problem: "The plan does not say what happens when a gate's log cannot be read after a measured non-zero exit (ENOENT/EACCES on `.out`/`.err`); it should be UNUSABLE (exit 2), never a silent GREEN with nothing attributed."
  evidence: "Measured non-zero → read both logs, strip ANSI escapes, and match each line"
```

### Inline — determinism / path matching (P5)

```yaml
- type: FINDING
  rule_id: P5
  severity: minor
  file: ".dev/features/test-stage-typecheck/PLAN.md:50"
  problem: "Case-folded path comparison on a case-sensitive filesystem attributes an error in `A.test.ts` to a mapped `a.test.ts`; this errs toward refusing (fail-closed) and should be stated as such, or the comparison should match the setter's fold (check-ac-tests compares folded) for one rule."
  evidence: "is resolved and compared case-folded with the resolved mapped files"
```

### performance griller (P7)

```yaml
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/test-stage-typecheck/PLAN.md:48"
  problem: "A whole-project typecheck can exceed 170000 ms on a large project; a timeout is a NOTE (not measured), so the check silently degrades to today's behaviour there — the NOTE line must say the error may still reach the post-build gates."
  evidence: "Not measured (timed out / 126 / 127) → NOTE."
```

### testability griller (P1)

Presence recognized (`## Evals to write (P1)` names the fixtures, the per-code enumeration and a ★ WIRING test). No
finding.

### architecture / coupling (P3)

The core/CLI split mirrors `check-ac-style`; `TYPE_SET` lives in `ac-types-core.mjs` rather than `gate-run-core.mjs`,
pinned ⊂ ALLOWLIST by a test — acceptable (keeps the diff local), no finding.

### Other grillers

a11y, i18n, migrations, privacy, security, observability, documentation, comprehension: no finding — the change adds
no UI, user-facing strings, schema, personal data, network or production telemetry; the security-relevant input (gate
output) is covered by the plan's trust audit (anchored regex, message text never printed). Documentation is declared
(guide section, CHANGELOG, claims bullet).

## Summary

The plan targets the measured failure at the earliest stage that pins it (L83) and keeps the refusal attributable by
location. The main honest-bound gap is that the exempt set is wider than the plan's bound text admits (TS2339). Log
read failure handling and the timeout NOTE wording should be specified at build.

ADVISORY VERDICT: 4 concerns raised (0 blocking-severity, 4 advisory: 2 important, 2 minor) — for the human to weigh
before /pharn-dev-build.
