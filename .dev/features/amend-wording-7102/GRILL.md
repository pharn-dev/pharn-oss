# GRILL — amend-wording-7102 (7.10.2)

Plan: `.dev/features/amend-wording-7102/PLAN.md`. Spec hash: `d19c3ae5…` recomputed, equal to the pin. Step 1b
(`check-plan-lessons.mjs`): **GREEN**, exit 0 — L60, L64, L68 resolve and are referenced in the body.

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194044 B of griller files, 99396 B printed; deep
omission: 13 pharn-owned, 0 other; left out where present: guarantee-audit (13), machine-readable-emission (13),
two-layers (13), layer-1 (13), finding-output (13); kept whole: none

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`)

Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line; a scanner finding is not
the griller's judgment.

Findings: none (no secrets, PII or i18n scanner hit).

- `scan-plan-migrations`: mentions false. Not a finding: whether the plan needs or adequately declares this is the
  migrations griller's judgment.
- `scan-plan-observability`: mentions false. Not a finding: whether the plan needs or adequately declares this is the
  observability griller's judgment.

## Findings

### P0 / L64 — restatement sites

```yaml
- type: FINDING
  rule_id: L64
  severity: minor
  file: ".dev/features/amend-wording-7102/PLAN.md:20"
  problem: "The plan lists five restatement sites; two more exist in code comments: supervisor-core.mjs:31 ('a Bash rm of the archive is neither prevented nor detected here') and spec-amend-core.mjs DEFECT_HINTS ('must stay identical'). Checked: the supervisor-core line is scoped by 'here' (that module reads only SPEC.a1.md's presence, and the partial-archive refusal is spec-amend's), so it holds; the hints are repair instructions, where 'identical' is the right advice. Neither needs a change, but the plan should say they were read."
  evidence: "the bound is restated in five places"
```

### Testability (griller)

```yaml
- type: FINDING
  rule_id: P1
  severity: minor
  file: ".dev/features/amend-wording-7102/PLAN.md:31"
  problem: "The test covers a trailing blank line added on the amended side; it should also cover the reverse (the archive has the extra trailing blank line and the amended SPEC drops it), since the spec agent may remove one as easily as add one."
  evidence: "trailing blank lines added to Intent and to Scope pass `checkAmend`"
```

### Error handling (griller)

```yaml
- type: FINDING
  rule_id: P5
  severity: minor
  file: ".dev/features/amend-wording-7102/PLAN.md:30"
  problem: "`specSectionLines` returns null for an absent or duplicated section; the helper must keep `sameLines`' null rule (both null equal, one null unequal) before trimming, or a SPEC with a duplicated ## Intent would throw instead of refusing."
  evidence: "(null-safe, both absent still equal)"
```

The other ten grillers (a11y, architecture, comprehension, coupling, documentation, i18n, migrations, observability,
performance, privacy, security) raise nothing: no UI, schema, data, network or new module; the one helper lives in the
file whose check it serves.

## Summary

The change is small and its loosening is bounded: only a trailing run of blank (whitespace-only) lines is dropped, so any
added text in Intent or Scope still differs. The three concerns are minor: read two more restatement sites (both hold),
test the reverse direction, and keep the null rule in the helper.

ADVISORY VERDICT: 3 concerns raised (0 blocking-severity, 3 minor) — for the human to weigh before /pharn-dev-build.
