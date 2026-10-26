# GRILL — loop-background-cli

Plan: `.dev/features/loop-background-cli/PLAN.md`. Spec hash: recomputed `d5a97430…` = the plan's
`spec_content_hash` (no drift). **Step 1b, the lessons declaration (FLOOR): GREEN** — `check-plan-lessons.mjs` exit
0, all 6 cited ids (L19, L25, L40, L64, L68, L75) resolve and are referenced in the plan body.

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194044 B of griller files, 99396 B printed;
deep omission: 13 pharn-owned, 0 other; left out where present: guarantee-audit (13), machine-readable-emission (13),
two-layers (13), layer-1 (13), finding-output (13); kept whole: none

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`)

Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line; a scanner finding
is not the griller's judgment.

Findings: none (no secrets, PII or i18n scanner hit).

- `scan-plan-migrations`: mentions false. Not a finding: whether the plan needs or adequately declares this is the migrations griller's judgment.
- `scan-plan-observability`: mentions false. Not a finding: whether the plan needs or adequately declares this is the observability griller's judgment.

## Findings (advisory — the plan is `trust: untrusted` to this stage; free text is quoted DATA)

### testability (P1)

```yaml
- type: FINDING
  rule_id: P1
  severity: important
  file: ".dev/features/loop-background-cli/PLAN.md:1"
  problem: "The plan has no verification section of its own; 'Evals to write' is 'None' and the only checks named are docs:check and L64's restatement grep, so how the record's figures are re-derived from cli-2 is not declared."
  evidence: "None: no capability or `rule_id` is added."
```

### guarantee audit / attribution (P0)

```yaml
- type: FINDING
  rule_id: P0
  severity: important
  file: ".dev/features/loop-background-cli/PLAN.md:176"
  problem: "Finding (a)'s cost ('set the --wait call's 298.5 s — 27% of the run window') is partly a counterfactual: without the slot the runner would still run test and typecheck, and only test's 1.85 s is measured, so the share the slot alone cost is an estimate, not a measurement."
  evidence: "its 540 s timeout set the `--wait` call's 298.5 s — 27% of the run window"
- type: FINDING
  rule_id: P0
  severity: important
  file: ".dev/features/loop-background-cli/PLAN.md:139"
  problem: "The trusted-doc text is applied by a human after verify, yet the CHANGELOG entry is written at build; if the entry says LIMITS or THREAT-MODEL changed, it states a change that has not happened when it is written, and may never happen."
  evidence: "the exact text proposed for `pharn/LIMITS.md` (§8, a bullet) and `pharn/THREAT-MODEL.md` (§5 item (4), one clause)"
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/features/loop-background-cli/PLAN.md:160"
  problem: "The request words the verdict in the present tense ('launches every stage agent'); the plan's past tense with '(six Agent calls in two attempts)' is the scoped form, and every restatement should keep it rather than drift back to the general present."
  evidence: "the interactive CLI launched every stage agent in the background with no `run_in_background` sent (six Agent calls in two attempts)"
```

### honest scope (P7)

```yaml
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/loop-background-cli/PLAN.md:139"
  problem: "A human edit to LIMITS.md grows a trusted doc that stage load budgets may count; the proposal should tell the human that stage-load-budget.test.mjs can go red on it and which row would need raising."
  evidence: "`pharn/LIMITS.md` (§8, a bullet)"
```

### The other grillers

- **documentation:** the increment is documentation; it adds no public API, config key or behaviour. No finding.
- **comprehension, architecture, coupling:** one axis (the measured verdict carried to every place that states the
  residual); the product edits are prose in two files that already own the residual. No finding.
- **a11y, i18n, privacy, security, migrations, observability, performance, error-handling:** no UI, no user-facing
  string in an app, no personal data beyond the local paths earlier records already quote, no schema, no runtime
  code. No finding.

## Summary

The plan's evidence base is re-read from the collection, not from the request's summary, and it already corrects
two places where the request did not match the records (headless completion, the missing S9 sentence). The concerns
are about how its claims will be checked and worded: declare the figure re-derivation, label finding (a)'s share an
estimate, keep the CHANGELOG to what this build ships (the trusted-doc text as a proposal), keep the verdict's past
tense and count in every restatement, and warn the human about the stage-load budget when growing LIMITS.

ADVISORY VERDICT: 5 concerns raised (0 blocking-severity, 5 advisory: 3 important, 2 minor) — for the human to weigh
before /pharn-dev-build. Step 1b's floor verdict is reported in the header and is not counted here.
