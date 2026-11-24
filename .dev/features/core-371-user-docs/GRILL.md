# GRILL — core-371-user-docs

Plan: `.dev/features/core-371-user-docs/PLAN.md` · spec hash: matches the pin
(`f058fca367fabcdfecf939dc70bfb43deaadedb1b0e810b790c4aeb156d6775d`) · Step 1b lessons declaration: **GREEN** —
`applied_lessons: L64, L75, L78, L85`; all 4 cited ids resolve and are referenced in the plan body (the checker
verifies the declaration, never the application).

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

Every finding below is advisory and gates nothing.

### Inline axes

```yaml
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/core-371-user-docs/PLAN.md:67"
  problem: "F8 corrects a sentence whose literal claim still holds; it is a clarification, at P7's edge."
  evidence: '"It does not read `regression-report.json` at all" stays true.'
- type: FINDING
  rule_id: P6
  severity: minor
  file: ".dev/features/core-371-user-docs/PLAN.md:23"
  problem: "The claim count is approximate and no per-claim table is committed, so a reviewer cannot re-check the
    TRUE verdicts one by one, only the listed examples and F1-F9."
  evidence: "Claim table summary: **about 200 claims checked, 9 false or stale (F1–F9)**"
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/features/core-371-user-docs/PLAN.md:39"
  problem: "F1's correction rests on another repository's state read once (pharn-cli v0.21.5); the new sentence
    names a version, which stays true, rather than 'any release', which went stale."
  evidence: "pharn-cli **0.18.3** (2026-11-12) accepts it (its CHANGELOG `[0.18.3]`"
```

Build note, not a finding: `CONTRIBUTING.md` line 37 is the line `check:contributing` reads for gate-name presence;
F6's edit must keep every back-ticked gate name it already carries (additive wording only).

### Grillers

- **documentation** — the plan adds no public surface (no API, config key or behavior); it corrects documentation. No
  finding.
- **comprehension** — the fixes are one-clause corrections aimed at the reader the docs already address. No finding.
- **testability** — no capability, checker or `rule_id` changes, so no eval is owed (P1); the regenerated
  `pharn-install.json` and the version files are held by `docs:check`, `check:badge` and `check:changelog`. No
  finding.
- **architecture, coupling** — no module, `reads:` or layer edge changes. No finding.
- **security, privacy** — no secret, PII, trust boundary or write path changes; F7 and F9 add surfaces to a list. No
  finding.
- **error-handling, observability, performance, migrations, i18n, a11y** — no code, data, UI or runtime path. No
  finding.

## Summary

The plan is a doc-correction increment: every fix cites live evidence and the sweep records each hit. The three
concerns are minor: F8 sits at the edge of "false or stale", the TRUE half of the audit is summarised rather than
tabulated, and F1 depends on an external repository read once. None changes what is built.

ADVISORY VERDICT: 3 concerns raised (0 blocking-severity, 3 advisory) — for the human to weigh before /pharn-dev-build.
