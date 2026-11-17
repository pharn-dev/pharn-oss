# GRILL — epic4-no-go-2026-11-16

Plan: `.dev/features/epic4-no-go-2026-11-16/PLAN.md` · spec hash: `f058fca3…775d` recomputed with
`node .dev/floor/hash-doc.mjs pharn/ARCHITECTURE.md`, equal to the plan's pin · Step 1b lessons declaration: **GREEN**
(`check-plan-lessons.mjs` exit 0; L13, L19, L33, L40, L64, L78 resolve and are referenced in the body).

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194044 B of griller files, 99396 B printed;
deep omission: 13 pharn-owned, 0 other; left out where present: guarantee-audit (13), machine-readable-emission (13),
two-layers (13), layer-1 (13), finding-output (13); kept whole: none

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`)

Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line; a scanner finding
is not the griller's judgment.

Findings: none (no secrets, PII or i18n scanner hit).

- `scan-plan-migrations`: mentions false. Not a finding: whether the plan needs or adequately declares this is the migrations griller's judgment.
- `scan-plan-observability`: mentions true — lines 38 (logging). Not a finding: whether the plan needs or adequately declares this is the observability griller's judgment.

## Grillers

- **a11y, i18n, privacy, security, migrations, performance, error-handling:** the change adds no UI, no user-facing
  text, no personal data, no input surface, no schema, no runtime code and no failure path. No finding.
- **observability:** the scanner's line 38 hit is `git log`, a command name, not logging. A decision record needs no
  runtime observability. No finding.
- **architecture, coupling:** two files, one dev-apparatus record beside its precedents in `.dev/measurements/` and
  one CHANGELOG entry; no layer edge. No finding.
- **testability:** a verification approach is present (every re-derived figure names its command; `## Guarantee
audit` names the PR-time checks). Presence recognized. Finding G-4 below is about a trigger's number, not about
  verification.
- **documentation, comprehension:** findings G-1 and G-4.

## Findings (advisory)

```yaml
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/epic4-no-go-2026-11-16/PLAN.md:138"
  problem: "The CORE-98 reopen threshold of 10% is a chosen number with no derivation; the record must say it was chosen, and by whom, or a later reader will treat it as measured."
  evidence: "ARCHITECTURE.md outside §6 (bytes / 4) is at least 10% of it"
- type: FINDING
  rule_id: P6
  severity: minor
  file: ".dev/features/epic4-no-go-2026-11-16/PLAN.md:55"
  problem: "The CORE-98 share assumes the probe's 26,044-token gap carries over to a routed stage in a project; the probe ran in this repo's tree with a one-line prompt, so the record should give the share against more than one denominator and label each an estimate."
  evidence: "gap 26,044, one-line prompt, in this repo's probe tree"
- type: FINDING
  rule_id: P6
  severity: minor
  file: ".dev/features/epic4-no-go-2026-11-16/PLAN.md:63"
  problem: "An mtime is not a run date: 'none newer than 2026-11-12' supports 'no new ledger' only together with the unchanged count of 129; the record should state both and call it file metadata."
  evidence: "none has an mtime on or after 2026-11-12"
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/epic4-no-go-2026-11-16/PLAN.md:142"
  problem: "The CORE-96 trigger's '≥ 30 runs' is a chosen sample size (the baseline had 33 runs with both figures); the record should say so."
  evidence: "correlate with `PLAN.md` bytes at least as strongly as with plan requests over ≥ 30 runs"
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/features/epic4-no-go-2026-11-16/PLAN.md:14"
  problem: "The closures are an orchestrator decision under delegation; the record and the CHANGELOG entry must not read as a maintainer sign-off, as the CORE-88 precedent was careful to state."
  evidence: "The orchestrator decided, under the user's delegation for this batch, to close all four."
```

## Summary

The plan is a two-file closure record with every figure labelled and sourced. The concerns are about wording the
record must carry: two chosen thresholds that must read as chosen (G-1, G-4), a denominator that must read as an
estimate against more than one base (G-2), file metadata that must not read as a run date (G-3), and the delegated
nature of the decision (G-5). None needs a re-plan; each is a sentence in the record.

ADVISORY VERDICT: 5 concerns raised (0 blocking-severity, 5 advisory) — for the human to weigh before /pharn-dev-build.
