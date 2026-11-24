# GRILL — core-350-docs-truth

Plan: `.dev/features/core-350-docs-truth/PLAN.md` · spec hash: matches the pin
(`f058fca367fabcdfecf939dc70bfb43deaadedb1b0e810b790c4aeb156d6775d`) · Step 1b lessons declaration: **GREEN** —
`applied_lessons: L50, L64, L68, L75, L78`; all 5 cited ids resolve and are referenced in the plan body (the checker
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

```yaml
- type: FINDING
  rule_id: P7
  severity: advisory
  file: .dev/features/core-350-docs-truth/PLAN.md
  problem: >-
    Under D1(a) the eight F3 sentences stay false until the owner acts in GitHub settings; nothing in the PR records
    that the docs were checked against a live state that disagreed with them.
  evidence: >-
    PLAN "Open questions": option (a) "the docs stay as they are".
  remedy: >-
    Under (a), say in the CHANGELOG entry and SHIP.md that ruleset 25907495 was read with an owner bypass on
    2026-11-24 and that the docs were left describing the intended state pending the owner's settings change.
- type: FINDING
  rule_id: P7
  severity: advisory
  file: .dev/features/core-350-docs-truth/PLAN.md
  problem: >-
    The new README rows and the agents bullet are hand-written restatements; each must be checked against the command
    or definition it describes, not against the plan's paraphrase (L64).
  evidence: >-
    "two Commands-table rows (`/pharn-triage`, `/pharn-supervise`, both 'a full `/pharn-loop` runs it')"
  remedy: >-
    Take each row's wording from the command's own frontmatter `description:`; check pharn-stage.md and
    pharn-review-lens.md descriptions for who launches each.
- type: FINDING
  rule_id: P7
  severity: advisory
  file: .dev/features/core-350-docs-truth/PLAN.md
  problem: >-
    The README lead sentence "Every other command except /pharn-review and /pharn-memory-promote is a pipeline stage
    those two run" stays literally true only if read as "one of those two"; triage and supervise run under
    /pharn-loop only.
  evidence: README.md:319-321.
  remedy: The two new rows say "a full `/pharn-loop` runs it", which makes the scope explicit.
```

The other eleven grillers (a11y, architecture, coupling, error-handling, i18n, migrations, observability, performance,
privacy, security, testability) have no surface in a prose-only change to repo docs: no finding.

verdict: proceed (advisory) — the floor stop above is GREEN.
