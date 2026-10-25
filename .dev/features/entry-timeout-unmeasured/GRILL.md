# GRILL — entry-timeout-unmeasured

Plan: `.dev/features/entry-timeout-unmeasured/PLAN.md` · spec-hash check: MATCH
(`2c84959cbca0b2dc51aaad90f90d40e574732c9c5c83c0bda7e1481ecb0db12e`, recomputed this run with
`.dev/floor/hash-doc.mjs`) · **Step 1b lessons declaration (FLOOR): GREEN** — `check-plan-lessons.mjs` exit 0:

```text
GREEN — applied_lessons: L29, L34, L35, L36, L62, L64, L72, L75 (.dev/features/entry-timeout-unmeasured/PLAN.md); all 8 cited id(s) resolve in .dev/memory-bank/lessons-learned.md and are referenced in the plan body. NOTE (P0): that these lessons were GENUINELY applied is advisory — this checker verifies the DECLARATION, never the application; a body line reading "L29: considered." satisfies the reference check.
```

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

## Findings (advisory — the interrogation and the grillers)

### Built-in axes

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/features/entry-timeout-unmeasured/PLAN.md:105"
  problem: "The S14b next-step text names verify's 540 s limit as a fact; it is true only while the regress/verify lines and the entry --start line pin the same literal, and nothing ties the prose to those pins."
  evidence: "the same limit `/pharn-verify` runs it under"
```

```yaml
- type: FINDING
  rule_id: P5
  severity: minor
  file: ".dev/features/entry-timeout-unmeasured/PLAN.md:91"
  problem: "The plan does not say that the --wait TAKEOVER path reaches the same decision; read this run, it does (the drain finalizes result.json and the loop re-enters decideDone), so one test path covers both, but the plan should state it."
  evidence: "There is no logic change: `emitDoc` already maps `EXIT[doc.status]`"
```

### Grillers

- **testability** — presence recognized (`## Evals to write (P1)` lists one test per rule, both causes, the precedence
  mix, the base:test slot and the closed document). Layer 2: adequate; no finding.
- **architecture** — fit recognized: the predicate is imported from `gate-run-core.mjs`, the layer the module already
  imports from; no new edge, no reinvented mechanism. No finding.
- **error-handling** — declaration recognized: the change IS an error-path relabel (timeout, unstartable gate), and the
  guarantee audit states the bound (a hang and a slow machine look the same). No finding.
- **coupling**, **comprehension**, **documentation** — the plan keeps rationale in the module header and cites owners
  (P4); the README and guide edits are named. No finding.
- **a11y**, **i18n**, **migrations**, **observability**, **performance**, **privacy**, **security** — no UI, no
  schema, no personal data, no new I/O; nothing on these axes. No finding.

## Summary

The plan is narrow and grounded in the measured failure. The two concerns are wording/coverage notes for the build: keep
the S14b remedy text phrased as "the per-gate timeout the commands pin" rather than a free-standing claim about verify,
and add a sentence (and, if cheap, rely on the existing takeover CLI test) that the takeover path decides through the
same `decideDone`.

ADVISORY VERDICT: 2 concerns raised (0 blocking-severity, 2 advisory) — for the human to weigh before /pharn-dev-build.
