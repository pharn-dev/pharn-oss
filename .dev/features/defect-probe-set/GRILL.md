# GRILL — defect-probe-set

Plan: `.dev/features/defect-probe-set/PLAN.md` · spec-hash check: equal
(`f058fca367fabcdfecf939dc70bfb43deaadedb1b0e810b790c4aeb156d6775d`) · Step 1b lessons declaration: **GREEN**
(`check-plan-lessons.mjs` exit 0 — L4, L34, L36, L43, L62, L66, L70, L71, L81 resolve and are referenced; the declaration
only, never the application).

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194044 B of griller files, 99396 B printed; deep
omission: 13 pharn-owned, 0 other; left out where present: guarantee-audit (13), machine-readable-emission (13),
two-layers (13), layer-1 (13), finding-output (13); kept whole: none

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`)

Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line; a scanner finding
is not the griller's judgment.

Findings: none (no secrets, PII or i18n scanner hit).

- `scan-plan-migrations`: mentions true — lines 125 (migration). Not a finding: whether the plan needs or adequately declares this is the migrations griller's judgment.
- `scan-plan-observability`: mentions true — lines 20 (logging), 128 (observability). Not a finding: whether the plan needs or adequately declares this is the observability griller's judgment.

## Findings

### Interrogation — P1 (the measure measures what it claims)

```yaml
- type: FINDING
  rule_id: P1
  severity: blocking
  file: ".dev/features/defect-probe-set/PLAN.md:136"
  problem: "SPEC probes p5 and p6 are matched only on SPEC.md line anchors, but the product grill is told to cite `pharn/features/<name>/PLAN.md:<line>` in every finding's `file`, so a grill that catches the SPEC defect and cites the plan line carrying the criterion scores a miss by construction."
  evidence: '`.claude/commands/pharn-grill.md` Finding output: `file: "pharn/features/<name>/PLAN.md:<line>" # ... resolves to a real path:line in the plan`; PLAN: `anchors[] (file ∈ SPEC.md | PLAN.md, start, end, slack 0..5)` with PLAN anchors only for fixed PLAN probes.'
```

```yaml
- type: FINDING
  rule_id: P1
  severity: important
  file: ".dev/features/defect-probe-set/PLAN.md:29"
  problem: "The omission probe's anchors miss the most likely citation for an absence: the extracted grillers tell a grill to cite the plan's title or header line for a whole-plan absence, which is neither the SPEC criterion nor the mapping heading."
  evidence: "griller procedures (error-handling, testability): `file = the plan's title / header line ... An absence has no single offending line, so cite the document's header`; PLAN Q3: `the ## Acceptance mapping heading line of PLAN.md (slack 0)`."
```

### Interrogation — P0 (cost and run bounds)

```yaml
- type: FINDING
  rule_id: P0
  severity: important
  file: ".dev/features/defect-probe-set/PLAN.md:25"
  problem: "The USD 80 cap is stated as an estimate only; nothing in the kit bounds one runaway session, and the SPEC-probe plan cost is assumed, not measured."
  evidence: "`plan (opus, unmeasured as a headless session; assumed 4–6)`; the kit's command flags list `--model`, `--effort`, `--permission-mode`, `--allowedTools`, `--output-format` and no spend limit."
```

```yaml
- type: FINDING
  rule_id: P5
  severity: minor
  file: ".dev/features/defect-probe-set/PLAN.md:178"
  problem: "Run-to-run comparability across arms depends on the session environment the plan leaves to the user's machine: user-level settings and MCP servers change the tool set and permissions between a recording today and an arm measured later."
  evidence: "`one claude -p ... per stage chained with &&, each with --model, --effort, --permission-mode acceptEdits, an explicit --allowedTools, --output-format json`"
```

### testability (P1)

```yaml
- type: FINDING
  rule_id: P1
  severity: important
  file: ".dev/features/defect-probe-set/PLAN.md:248"
  problem: "The plan does not say that test files are themselves in the lcov the 100% diff-coverage gate reads, so a test helper branch that no case takes would RED pharn-ci even when every product line is covered."
  evidence: "`## Tests (no Capability is added, so P1's eval rule does not apply; the CLIs carry tests)`; measured during this grill: a `node --test --experimental-test-coverage` run lists `SF:.dev/floor/m.test.mjs` beside `SF:.dev/floor/m.mjs`, and a file only read as bytes is absent."
```

### architecture (P3), coupling (P3), error-handling (P7), documentation (P7), comprehension (P7)

Fit recognized: the scorer imports the two product validators (`.dev` → `pharn`, the allowed direction), the kit imports
the scorer and `check-surface-bump.mjs`'s `PRODUCT_SURFACE` (dev → dev), each CLI has one reason to change, and the
refusal paths are closed codes with exit 2 as the terminal fallback. Documentation: the README and one guide section are
planned. No finding.

### a11y, i18n, migrations, observability, performance, privacy, security

Not applicable to an apparatus plan with no UI, no shipped schema, no service and no personal data. The migrations and
observability scanner mentions are the probe content (p3's planted migration defect) and the word "observability" in
the plan's bounds, not a change this increment makes. No finding.

## Summary

The one load-bearing concern is the first: as planned, the two SPEC probes would mostly measure the grill's citation
convention, not detection. A remedy that keeps the rule deterministic is a token anchor for SPEC probes — a manifest
token (the planted criterion ids) resolved against the run's own `PLAN.md` lines, read by the scorer only for probes
that declare one — with the bound that those probes then read a third file. The omission anchor and the cost bound
have cheap remedies (cite-the-header noted as a stated miss, or anchored; a per-session `--max-budget-usd`). The
coverage note is a build discipline.

ADVISORY VERDICT: 5 concerns raised (1 blocking-severity, 3 important, 1 minor) — for the human to weigh before
/pharn-dev-build. The lessons-declaration verdict above is a separate floor result and is not part of this count.
