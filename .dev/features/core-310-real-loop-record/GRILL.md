# GRILL — core-310-real-loop-record

Plan `.dev/features/core-310-real-loop-record/PLAN.md`. Spec hash: recomputed
`f058fca367fabcdfecf939dc70bfb43deaadedb1b0e810b790c4aeb156d6775d`, equal to the pin. Step 1b lessons declaration:
**GREEN** (`check-plan-lessons.mjs` exit 0; all 10 cited ids resolve and are referenced in the body).

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194044 B of griller files, 99396 B printed;
deep omission: 13 pharn-owned, 0 other; left out where present: guarantee-audit (13), machine-readable-emission (13),
two-layers (13), layer-1 (13), finding-output (13); kept whole: none

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`)

Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line; a scanner finding
is not the griller's judgment.

Findings: none (no secrets, PII or i18n scanner hit).

- `scan-plan-migrations`: mentions false. Not a finding: whether the plan needs or adequately declares this is the migrations griller's judgment.
- `scan-plan-observability`: mentions true — lines 86 (observability). Not a finding: whether the plan needs or adequately declares this is the observability griller's judgment.

## Findings

### privacy / security (P2)

```yaml
- type: FINDING
  rule_id: P2
  severity: important
  file: ".dev/features/core-310-real-loop-record/PLAN.md:154"
  problem: "The plan commits run-state bundles from another project but names no deterministic scrub step; the GATE 1 decision requires one (home paths, emails, key/token patterns, git author emails), so the build must run it as a pattern scan over each bundle and record the counts, not rely on reading."
  evidence: "Session ids, agent ids and the run marker's `session_id` appear in the bundles (open question 1)."
- type: FINDING
  rule_id: P2
  severity: minor
  file: ".dev/features/core-310-real-loop-record/PLAN.md:98"
  problem: "`isolation.json` (in every bundle) lists which credential locations exist on the host (`cred:ssh-dir`, `cred:aws-credentials`, …). These are names, not values, but they describe the maintainer's machine; the record should say so, and the scrub should confirm no value is present."
  evidence: "run state, PHARN git-dir records, per-context tokens"
```

### documentation / comprehension (P7, P6)

```yaml
- type: FINDING
  rule_id: P6
  severity: important
  file: ".dev/features/core-310-real-loop-record/PLAN.md:98"
  problem: "The two intent files live only in the scratchpad and ~/Projects/pharn-measure, both machine-local; the reproduction CORE-311 needs and the 'intent v2 was written after S9' claim both depend on their bytes, so each run's bundle should carry its intent text and sha256."
  evidence: "attempt 1's evidence bundle (feature artifacts, AC tests, the source diff, run state, PHARN git-dir records, per-context tokens)"
```

### testability (P1)

```yaml
- type: FINDING
  rule_id: P1
  severity: minor
  file: ".dev/features/core-310-real-loop-record/PLAN.md:130"
  problem: "The bundle completeness check ('its file list matches the source directory's selected members') needs the selection to be one written rule, shared by the builder and the check, or the check confirms the builder against itself."
  evidence: "each bundle parses as JSON, and its file list matches the source directory's selected members (count and names);"
```

### error-handling (P5)

```yaml
- type: FINDING
  rule_id: P5
  severity: minor
  file: ".dev/features/core-310-real-loop-record/PLAN.md:98"
  problem: "A bundle builder that skips an unreadable or absent member silently would commit a partial bundle that looks complete; absent members should be listed in the bundle explicitly."
  evidence: "attempt 1's evidence bundle (feature artifacts, ...)"
```

## Axes with no finding

- a11y, i18n, migrations, performance: no UI, no copy, no schema, no runtime path; the record and bundles are static
  files. Scanner clean where one exists.
- observability: the line-86 mention is the record's per-stage table, not a runtime need. No concern warranted.
- architecture, coupling: no module, no import, no product byte; the files are apparatus and repo-meta only (P3 not
  engaged).
- P0: every claim in the guarantee audit is labelled advisory, except the ignore entries, which are floor by kind and
  claim only what the tools do. No unlabelled guarantee found.

## Summary

The plan records a finished measurement and adds no mechanism. The concerns are about the evidence it commits: make
the GATE 1 scrub a recorded pattern scan, carry the intent bytes so the reproduction and the v1→v2 claim survive the
scratchpad, list absent members explicitly, and have the completeness check share the builder's selection rule.

ADVISORY VERDICT: 5 concerns raised (0 blocking-severity, 2 important, 3 minor) — for the human to weigh before
/pharn-dev-build.
