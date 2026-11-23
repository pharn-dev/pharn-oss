# GRILL — reanchor-lesson

Plan: `.dev/features/reanchor-lesson/PLAN.md` · spec-hash check: match
(`f058fca367fabcdfecf939dc70bfb43deaadedb1b0e810b790c4aeb156d6775d`) · Step 1b lessons declaration: **GREEN**
(`check-plan-lessons.mjs` exit 0 — L13, L19, L20, L68 resolve in canon and are referenced in the body; the declaration
only, never the application).

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194044 B of griller files, 99396 B printed;
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

## Findings (advisory — none gates `/pharn-dev-build`)

### Inline — guarantee audit (P0)

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/features/reanchor-lesson/PLAN.md:73"
  problem: "The canon write and the index regeneration land after verify, so no local gate runs over them before the pull request; only check-provenance (on the candidate) and CI's npm run check (docs:check, the canon tests) see them. The plan says CI carries docs:check but does not say the canon bytes themselves are judged by nothing locally after the write."
  evidence: "in verify's gate map only if verify runs after it — it does not, so CI's `npm run check` carries it"
```

### Inline — determinism / live state (P6)

```yaml
- type: FINDING
  rule_id: P6
  severity: minor
  file: ".dev/features/reanchor-lesson/PLAN.md:42"
  problem: "The CHANGELOG entry names the id L85 at build, but the id is computed by the promote command from live canon at GATE 2; if main promotes another lesson in between, the entry and the id disagree. Re-read the highest `## L<n>` before the promote and renumber by diff if main moved."
  evidence: "one new dated entry at the top of `[Unreleased]` saying lesson L85 was promoted"
```

### Inline — honest scope (P7)

```yaml
- type: FINDING
  rule_id: P7
  severity: important
  file: ".dev/features/reanchor-lesson/PLAN.md:56"
  problem: "The source candidate's body says the build's files were 'committed before the last anchor'; any write made before a re-anchor drops out of the window, committed or not, because the anchor hashes the working tree. The promoted body should say that, and should name when the epoch still breaks (a commit that is not upstream's, such as a fast-forward onto a local sibling commit; a hand-resolved conflict on an out-of-scope path), or the lesson over-generalizes 'never re-anchor'."
  evidence: "states the class's own bounds (a hand-resolved conflict, a commit that is not upstream's) as the cases where the epoch can still break"
```

### Grillers (13 registered)

- a11y, i18n, privacy, security: no UI, no user-facing text, no personal data, no secret; scanners clean. No finding.
- architecture, coupling: one CHANGELOG entry plus a canon entry through the established promote route; no new
  mechanism, no sibling reference. Fit recognized.
- comprehension, documentation: the plan's "Why" section records the trigger and why no command or guide changes. No
  finding.
- error-handling, migrations, observability, performance: no code, schema or runtime path. Not applicable.
- testability: verification approach present (`## Evals to write` names the existing checks that apply). Presence
  recognized.

## Summary

The plan is a promotion-only increment and states why (no repository file holds the re-anchor advice; the trigger is
the CORE-314 run's records). The one concern of weight is the lesson body: it must be accurate about which writes a
re-anchor drops and must keep the cases where re-anchoring is still the remedy, or canon would trade one wrong rule for
its opposite. The other two are bookkeeping: the id can move if main promotes first, and the canon bytes are judged
only by CI after the write.

ADVISORY VERDICT: 3 concerns raised (0 blocking-severity, 3 advisory) — for the human to weigh before /pharn-dev-build.
