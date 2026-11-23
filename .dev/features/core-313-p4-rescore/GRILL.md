# GRILL — core-313-p4-rescore

Plan: `.dev/features/core-313-p4-rescore/PLAN.md` · spec hash: matches the pin
(`f058fca367fabcdfecf939dc70bfb43deaadedb1b0e810b790c4aeb156d6775d`) · Step 1b lessons declaration: **GREEN** —
`applied_lessons: L64, L75, L78`; all 3 cited ids resolve and are referenced in the plan body (the checker verifies the
declaration, never the application).

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194044 B of griller files, 99396 B printed; deep
omission: 13 pharn-owned, 0 other; left out where present: guarantee-audit (13), machine-readable-emission (13),
two-layers (13), layer-1 (13), finding-output (13); kept whole: none

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`)

Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line; a scanner finding is
not the griller's judgment.

Findings: none (no secrets, PII or i18n scanner hit).

- `scan-plan-migrations`: mentions false. Not a finding: whether the plan needs or adequately declares this is the
  migrations griller's judgment.
- `scan-plan-observability`: mentions false. Not a finding: whether the plan needs or adequately declares this is the
  observability griller's judgment.

## Findings

### Inline — determinism, guarantee audit

```yaml
- type: FINDING
  rule_id: P5
  severity: important
  file: ".dev/features/core-313-p4-rescore/PLAN.md:68"
  problem: >-
    The README hand-check rule says "if a finding names the planted defect", but the plan never says what counts as
    naming it, so two record authors can hand-score the same run differently; the rule should state its test (the
    finding's text names the omitted or contradicted criterion by id or by its observable behaviour, the finding is
    triaged anything but proceed, and its file cites the probe's own PLAN.md or SPEC.md).
  evidence: "If a finding names the planted defect and is triaged anything but `proceed`, the record says so"
```

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/features/core-313-p4-rescore/PLAN.md:42"
  problem: >-
    The corrected reading applies all six pre-registered rules by hand, but the plan only walks rules 4 and 5; the
    record should show rules 1-3 still hold on the hand-scored data (served family, 8 comparable pairs, control caught
    7) so the corrected reading is derived, not asserted.
  evidence: "Rule 4 (`catch-lost`) no longer applies. Rule 5 holds: chain USD 13.10 → 11.20 (−14%)."
```

### comprehension (P7)

```yaml
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/core-313-p4-rescore/PLAN.md:60"
  problem: >-
    The hand-check rule is scoped to lost pairs only; the plan should say why gained catches and control-side misses
    are not hand-checked (they cannot produce a catch-lost reading, and a control miss only removes a pair from rule 4's
    reach), or a later reader will take the asymmetry for an oversight.
  evidence: "the scorer's error is the conservative one ... can only move a reading towards `does-not-support`"
```

### testability, documentation, and the other ten axes

- **testability (P1):** presence recognized (`## Evals to write` explains why none: no capability or checker changes,
  and the hand re-score is reproducible from committed files with a named command). Adequacy: fine for a record
  correction.
- **documentation (P7):** no public surface is added; the README change is itself the documentation of the probe-set
  rule. No finding.
- **architecture, coupling, security, privacy, error-handling, observability, performance, migrations, a11y, i18n:** no
  code, schema, data flow, UI or user-facing text is built; every planned file is a dated record, a dev README or a
  CHANGELOG entry. No finding on these axes.

## Summary

The plan corrects one verdict and keeps the scorer, and both choices are argued from measured runs. The main concern is
that the new hand-check rule needs a stated test, or it moves a floor reading's correction onto an undefined judgment.
The record should also derive the corrected reading through all six pre-registered rules, and say why the hand check
covers lost pairs only. All three are folded in at build, inside the plan's `## Files`.

ADVISORY VERDICT: 3 concerns raised (0 blocking-severity, 3 advisory: 1 important, 2 minor) — for the human to weigh
before /pharn-dev-build
