# GRILL — core-371-canon-docs

Plan: `.dev/features/core-371-canon-docs/PLAN.md` (commit `f187f5f0`). Spec-hash check: `hash-doc.mjs
pharn/ARCHITECTURE.md` = `8566b4432ed6cc7035de5d925dafe3755086e23b12acacde0dcdda07a43a9167` = the plan's
`spec_content_hash` (match; the human's trusted-doc patch is committed as `cef96e15`, and the plan was re-pinned after
it). Step 1b lessons declaration: **GREEN** — `check-plan-lessons.mjs` exit 0, "all 5 cited id(s) resolve … and are
referenced in the plan body" (L50, L64, L68, L75, L78).

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194044 B of griller files, 99396 B printed;
deep omission: 13 pharn-owned, 0 other; left out where present: guarantee-audit (13), machine-readable-emission (13),
two-layers (13), layer-1 (13), finding-output (13); kept whole: none

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`)

Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line; a scanner finding is
not the griller's judgment.

Findings: none (no secrets, PII or i18n scanner hit).

- `scan-plan-migrations`: mentions false. Not a finding: whether the plan needs or adequately declares this is the
  migrations griller's judgment.
- `scan-plan-observability`: mentions true — lines 50 (observability), 52 (observability), 178 (observability). Not a
  finding: whether the plan needs or adequately declares this is the observability griller's judgment.

## Grillers

Each of the 13 grillers' procedures was applied to the plan. The increment corrects prose in docs and guides; it adds
no UI, schema, runtime path, personal data, public API, error path or operational surface.

- a11y, i18n, privacy, migrations, performance, security, error-handling: the change touches none of these axes — no
  finding (no concern manufactured).
- observability: the three scanner mentions are incidental (the words "observability scanner" inside the TM-1/L-1
  claims being corrected), not a declaration; the plan builds nothing operationally significant — no finding.
- documentation: the increment is itself documentation; the CHANGELOG entry is declared — no finding.
- architecture, coupling: no new module, reference or layer; trusted-doc edits route through the human patch, the rest
  through `## Files` — fit recognized, no finding.
- comprehension: every correction carries its live evidence (`file:line` and value) in the plan — rationale recognized.
- testability: findings below (G3).

## Findings

```yaml
- type: FINDING
  rule_id: "P6"
  severity: important
  file: ".dev/features/core-371-canon-docs/PLAN.md:211"
  problem: "The 7.25.3 bump stacks on part A's unmerged 7.25.2, so SKILLS_VERSION, CHANGELOG, the README badge and pharn-install.json will conflict when main moves; the plan does not restate the merge-and-renumber step."
  evidence: "`SKILLS_VERSION` — 7.25.2 → 7.25.3 (patch: corrected shipped trusted-doc sentences)"
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/features/core-371-canon-docs/PLAN.md:22"
  problem: "About 1 200 of the ~1 250 'checked' claims were read by sub-agents; only the FALSE/STALE verdicts were re-checked, so the TRUE verdicts are model judgment, not a measured fact."
  evidence: "The four large guides and the two big trusted docs were read by five read-only sub-agents"
- type: FINDING
  rule_id: "P1"
  severity: minor
  file: ".dev/features/core-371-canon-docs/PLAN.md:228"
  problem: "No gate can tell a corrected sentence from a wrong one: verify's gates check style and byte-equality, so each guide edit's truth rests on review re-reading it against the cited code."
  evidence: "None: no capability or checker changes."
```

## Summary

The plan is a docs-truth pass with a narrow, evidence-backed fix list. G1: `/pharn-dev-ship`'s PR step (COMMON.md:
fetch, merge origin/main, renumber by added lines) covers the version collision; the orchestrator sequences the two
merges. G2: honest — the plan already says the verdicts were sub-agent reads with FALSE/STALE re-checked; the claim
count is an estimate. G3: inherent to prose edits (L64): `/pharn-dev-review` should re-probe each edited sentence
against its cited code, restatements included.

ADVISORY VERDICT: 3 concerns raised (0 blocking-severity, 3 advisory: 1 important, 2 minor) — for the human to weigh
before /pharn-dev-build. The Step 1b lessons-declaration result above is a separate floor verdict (GREEN).
