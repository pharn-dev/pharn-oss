# GRILL — lean-stage-agent-probe

Plan: `.dev/features/lean-stage-agent-probe/PLAN.md`. Spec-hash check: `f058fca3…` recomputed equals the plan's
`spec_content_hash` (no drift). Step 1b lessons declaration: GREEN (`check-plan-lessons.mjs` exit 0, L1, L4, L33, L40,
L75, L78 resolve and are referenced in the body).

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194044 B of griller files, 99396 B printed; deep omission: 13 pharn-owned, 0 other; left out where present: guarantee-audit (13), machine-readable-emission (13), two-layers (13), layer-1 (13), finding-output (13); kept whole: none

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`)

Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line; a scanner finding
is not the griller's judgment.

Findings: none (no secrets, PII or i18n scanner hit).

- `scan-plan-migrations`: mentions false. Not a finding: whether the plan needs or adequately declares this is the migrations griller's judgment.
- `scan-plan-observability`: mentions false. Not a finding: whether the plan needs or adequately declares this is the observability griller's judgment.

## Findings

### Inline interrogation (P0, P1, P2, P3, P5, P7)

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/features/lean-stage-agent-probe/PLAN.md:123"
  problem: "The guarantee audit labels the AC1 binding as content-hash floor, but the comparison it cites ran once, by a scratch reader at build time; no committed check re-runs it against the probe tree, so the record should call it an observed hash equality, with the standing floor being stage-agent-type.test.mjs's pin of the committed file."
  evidence: '"the probed definition is the pinned and shipped file" → floor: content-hash (sha256 equality, printed by the reader and re-checked at build against main''s file).'
```

### privacy (P2)

```yaml
- type: FINDING
  rule_id: P2
  severity: important
  file: ".dev/features/lean-stage-agent-probe/PLAN.md:68"
  problem: "The reader's own output prints absolute paths that hold the user's home directory and the session id (the session line, both instruction-file paths, the write target); the record must transcribe its table and verdict lines with those paths generalized, not paste the output verbatim."
  evidence: "No home path, no session id: the transcript location is described generically."
```

### testability (P1)

Presence recognized: "Evals to write (P1)" and the guarantee audit declare the verification (re-run the reader over
the probe tree and compare with the relayed output; the repo gates for lint, format and tests).

```yaml
- type: FINDING
  rule_id: P1
  severity: minor
  file: ".dev/features/lean-stage-agent-probe/PLAN.md:75"
  problem: "read-probe.mjs gets no test, so a later edit to it (or to audit.mjs --prefix, which it shells) is caught only by a person re-running it; acceptable for a measurement script, but the record should say the kit is unpinned."
  evidence: "The reader, unchanged in behaviour; its header comment names its repo location, and it is prettier-formatted"
```

### The other ten grillers

a11y, architecture, comprehension, coupling, documentation, error-handling, i18n, migrations, observability,
performance and security: applied, no finding. The increment adds a dated record, a re-runnable read-only script and
two pointer edits under `.dev/`; it ships nothing, changes no schema, UI, log or network path, and holds no secret
(scanner clean). Documentation and comprehension are served by the record and the README the plan already names.

## Summary

Three advisory concerns. The probe kit's reader prints personal paths and the record must generalize them (privacy).
The AC1 "content-hash" wording should distinguish a one-time observed equality from the committed test's pin (P0).
The reader is unpinned by any test, which the record should state (P1).

ADVISORY VERDICT: 3 concerns raised (0 blocking-severity, 3 advisory: 1 important, 2 minor) — for the human to weigh
before /pharn-dev-build.
