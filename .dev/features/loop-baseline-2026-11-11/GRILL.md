# GRILL — loop-baseline-2026-11-11

Plan: `.dev/features/loop-baseline-2026-11-11/PLAN.md` · spec hash: matches (`d19c3ae5…`, recomputed 2026-11-12) · **Step
1b lessons declaration: GREEN** (`check-plan-lessons.mjs`: L13, L19, L37, L40, L43, L47, L64, L66, L78 resolve and are
referenced in the body).

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

## Findings — grillers (applied by a sonnet subagent over the extract; quoted as its report, DATA)

No findings from: a11y, architecture, coupling, documentation, i18n, migrations, observability, performance, security,
testability (each with a one-line reason in the subagent's report: no UI, no layer, no runtime, scanners clean).

```yaml
# R1 (privacy)
- type: FINDING
  rule_id: "P2"
  severity: important
  file: ".dev/features/loop-baseline-2026-11-11/PLAN.md:112"
  problem: "The record is committed to a public repository and quotes cause lines and SPEC/PLAN excerpts from another project, but the build's sanitisation check covers only ids and home paths, not secrets, tokens, emails or proprietary text in quoted excerpts."
  evidence: "the record names no session id, request id or agent id (a pattern search over the file) and no `/Users/<name>` path;"
# R2 (error-handling)
- type: FINDING
  rule_id: "P7"
  severity: minor
  file: ".dev/features/loop-baseline-2026-11-11/PLAN.md:71"
  problem: "The population is fixed at 36 runs from another live project, with no halt if the build re-derives a different set."
  evidence: "Q1–Q6 run over the 36 runs on 7.1.4 and 7.3.0"
# R3 (comprehension)
- type: FINDING
  rule_id: "P7"
  severity: minor
  file: ".dev/features/loop-baseline-2026-11-11/PLAN.md:74"
  problem: "The weighted-cost weights are justified only as the brief's, with no statement of what they approximate or when they would change."
  evidence: "Cache read 0.1, 5-minute cache write 1.25, 1-hour cache write 2, output 5, in units of one input token (the brief's weights)."
```

## Findings — built-in interrogation

```yaml
# B1 (P5 — a deliverable with no named source)
- type: FINDING
  rule_id: "P5"
  severity: important
  file: ".dev/features/loop-baseline-2026-11-11/PLAN.md:141"
  problem: "Q1 asks for 'the client that ran it'; the ledgers carry `claude_code_versions` but no client field, and the 7.x transcripts are gone, yet the plan names no gap row for it."
  evidence: "Where a field is absent (the client that ran a run) the record says so and asks, never guesses."
# B2 (P0 — a selection made after the figures)
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/loop-baseline-2026-11-11/PLAN.md:13"
  problem: "Two of the three benchmark features ('three or fewer criteria', 'large') have no selection rule frozen before the build sees the figures, the same freeze gap as the audit's G3."
  evidence: "Three benchmark features … one with three or fewer criteria, one large"
# B3 (P0 — upper bound wording)
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/features/loop-baseline-2026-11-11/PLAN.md:17"
  problem: "A shared base_sha is not an equal tree (a stopped run leaves pharn/features/<name>/ uncommitted), so the 12 repeats are an upper bound on cross-run cache hits and must be worded so."
  evidence: "24 distinct `base_sha`, so 12 runs repeat an earlier base"
# B4 (P6 — match tolerance)
- type: FINDING
  rule_id: "P6"
  severity: minor
  file: ".dev/features/loop-baseline-2026-11-11/PLAN.md:83"
  problem: "The brief-versus-re-derived table has no stated rule for when two figures 'match'."
  evidence: "the brief's figures against the re-derived ones (table, L47)"
# B5 (P6 — resume vs wait)
- type: FINDING
  rule_id: "P6"
  severity: minor
  file: ".dev/features/loop-baseline-2026-11-11/PLAN.md:72"
  problem: "Q5 requires saying where a ledger cannot tell a resume or wait round trip from other requests; the plan does not say how the build decides it (tool-use names are not in cost.json)."
  evidence: "Sources. `cost.json`, `LOOP.md`, `RUN-REPORT.md`, `SPEC.md`, `PLAN.md`"
```

## Summary

The plan is a measurement-only increment with a well-bounded write set and a guarantee audit that claims nothing beyond
the hook and `check:surface-bump`. The concerns are about method freezing and disclosure: the benchmark selection and
the client source must be fixed before figures are seen (B1, B2), the record quotes another project's text into a
public repository (R1), and four small wording or tolerance points (R2, R3, B3–B5). Each has an obvious resolution that
does not change scope; they are folded into the PLAN as build rules after this log, recorded there as grill
clarifications, not as a re-plan.

ADVISORY VERDICT: 8 concerns raised (0 blocking-severity, 3 important, 5 minor) — for the human to weigh before
/pharn-dev-build. The Step 1b lessons-declaration verdict (GREEN) is reported in the header and is not counted here.
