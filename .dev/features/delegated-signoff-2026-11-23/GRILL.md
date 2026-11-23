# GRILL — delegated-signoff-2026-11-23

Plan: `.dev/features/delegated-signoff-2026-11-23/PLAN.md` · spec hash: `f058fca3…775d` recomputed with
`node .dev/floor/hash-doc.mjs pharn/ARCHITECTURE.md`, equal to the plan's pin · Step 1b lessons declaration: **GREEN**
(`check-plan-lessons.mjs` exit 0; L13, L19, L33, L40, L64, L78 resolve and are referenced in the body).

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194044 B of griller files, 99396 B printed;
deep omission: 13 pharn-owned, 0 other; left out where present: guarantee-audit (13), machine-readable-emission (13),
two-layers (13), layer-1 (13), finding-output (13); kept whole: none

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`)

Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line; a scanner finding
is not the griller's judgment.

Findings: none (no secrets, PII or i18n scanner hit).

- `scan-plan-migrations`: mentions true — lines 200 (revert). Not a finding: whether the plan needs or adequately declares this is the migrations griller's judgment.
- `scan-plan-observability`: mentions true — lines 99 (logging). Not a finding: whether the plan needs or adequately declares this is the observability griller's judgment.

## Grillers

- **a11y, i18n, privacy, security, error-handling, performance:** the change adds no UI, no user-facing text, no
  personal data, no input surface, no runtime code and no failure path. No finding.
- **migrations:** line 200's hit is "Revert trigger", a decision condition about CORE-89's 7.18.0 reuse, not a schema or
  data migration. No finding.
- **observability:** line 99's hit is `git log`, a command name, not logging. No finding.
- **architecture, coupling:** two files, one dev-apparatus record beside its precedents in `.dev/measurements/` and one
  CHANGELOG entry; no layer edge. No finding.
- **testability:** a verification approach is present (every figure names its file or command, the evidence files are
  bound by sha256, and `## Guarantee audit` names the PR-time checks). Presence recognized. Adequacy: G-1.
- **documentation, comprehension:** G-2, G-3, G-4.

## Findings (advisory)

```yaml
- type: FINDING
  rule_id: P6
  severity: minor
  file: ".dev/features/delegated-signoff-2026-11-23/PLAN.md:29"
  problem: "The evidence store is outside the repository and the CORE-310 record over it is not merged, so a later reader may not be able to re-hash the files the record binds; the sha256 table fixes which bytes were meant, not that they remain available."
  evidence: "`~/Projects/pharn-measure/core-310/run2/` (outside the repo; `trust: untrusted` project output"
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/delegated-signoff-2026-11-23/PLAN.md:200"
  problem: "CORE-89's revert trigger needs a later fresh `test` run on the same tree to expose a hidden flake, and nothing in a normal loop produces one; the record should say the trigger has no collector, so it fires only if someone looks."
  evidence: "Revert trigger: a run whose verify PASS over a reused `test` is followed by a red `test` on the same tree with no code change"
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/delegated-signoff-2026-11-23/PLAN.md:60"
  problem: "The orchestrator share is computed as the `main` context's weighted units; the baseline's 27.7% counted the agent context that ran the loop. The record should state its definition so the two shares are not read as the same measure."
  evidence: "the run context `main` (the orchestrator) 613,663.9 = **26.95%**"
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/delegated-signoff-2026-11-23/PLAN.md:103"
  problem: "The CORE-109 bound counts run 2's 36 orchestrator requests, a main-session run; an agent-started run carries more orchestrator requests (the baseline's median was 18 in regress alone), so the bound would be larger there. The record should say the bound is for this run's request count."
  evidence: "times the orchestrator requests before the part would load, weighted 0.1 as cache reads"
```

## Summary

The plan writes a decision record whose figures all come from named files and commands, and it keeps the delegation
label on every row. The four concerns ask the record to say more about its own reach: that the evidence is outside the
repository (G-1), that CORE-89's revert trigger has no collector (G-2), what "orchestrator share" means here (G-3),
and that CORE-109's bound depends on a main-session run's request count (G-4). Each is a sentence in the record.

ADVISORY VERDICT: 4 concerns raised (0 blocking-severity, 4 advisory) — for the human to weigh before /pharn-dev-build.
