# GRILL — loop-supervisor

Plan: `.dev/features/loop-supervisor/PLAN.md` · spec-hash: matches (`14e5e084…`, `hash-doc.mjs`, after the human
trusted-doc commit `eae5fce8`) · lessons declaration: GREEN (`check-plan-lessons.mjs` exit 0: 12 ids resolve and are
referenced in the body).

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194044 B of griller files, 99396 B printed;
deep omission: 13 pharn-owned, 0 other; left out where present: guarantee-audit (13), machine-readable-emission (13),
two-layers (13), layer-1 (13), finding-output (13); kept whole: none

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`)

Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line; a scanner finding is not
the griller's judgment.

Findings: none (no secrets, PII or i18n scanner hit).

- `scan-plan-migrations`: mentions false. Not a finding: whether the plan needs or adequately declares this is the
  migrations griller's judgment.
- `scan-plan-observability`: mentions false. Not a finding: whether the plan needs or adequately declares this is the
  observability griller's judgment.

## Findings

### Interrogation — P6 / P2 (a stale decision file read as this run's)

```yaml
- type: FINDING
  rule_id: P6
  severity: important
  file: ".dev/features/loop-supervisor/PLAN.md:178"
  problem: "`render-run-report.mjs` also renders `RUN-REPORT.md` for `/pharn-ship` (pharn-ship-close.md:195), and S16's re-run note sends a person to continue by hand in the same feature directory, where an earlier loop's `SUPERVISOR.json` stays; the planned `## Known risk` section would then show an earlier run's carried findings as this run's."
  evidence: "`render-run-report.mjs`: a new section `## Known risk` after `## Needs a person`."
```

Read live: `closeout-core.mjs:129` (one `render-run-report.mjs` step for both commands), `pharn-loop.md:794-804` (the
re-run note). The ledger's `command` (`commandLabel`, `render-run-report.mjs:172`) tells a `/pharn-loop` run from a
`/pharn-ship` run; rendering the carried findings only for a `/pharn-loop` ledger, and a fixed not-applicable line
otherwise, closes it. The commit side is not affected: `/pharn-loop` always starts in a fresh directory (S2).

### Interrogation — P0 (what "only on an escalation" covers)

```yaml
- type: FINDING
  rule_id: P0
  severity: important
  file: ".dev/features/loop-supervisor/PLAN.md:308"
  problem: "The cap condition (`replan` with archived == REPLAN_CAP) is read from the archives on disk, which the run writes; the guarantee audit should say the check certifies agreement between the triage verdict and the archive count (L43), not that two re-plan rounds really ran."
  evidence: '"the supervisor runs only on an escalation" → floor for the checker (`not-escalated`)'
```

### testability (P1)

Presence recognized: `## Evals / tests to write` names a test per new code path.

```yaml
- type: FINDING
  rule_id: P1
  severity: minor
  file: ".dev/features/loop-supervisor/PLAN.md:300"
  problem: "No test drives the S17 path end to end in the command text: the hygiene pins name the branch order, but nothing asserts that a `supervisor.mjs check` exit other than 0 or 3 is routed to S17 rather than S16."
  evidence: "The loop's escalation branch order: triage read → `next` → supervisor start/finish → check → S16/S17."
```

### security (P2)

```yaml
- type: FINDING
  rule_id: P2
  severity: minor
  file: ".dev/features/loop-supervisor/PLAN.md:180"
  problem: "The run report's section quotes the supervisor's `reason` and each finding's `problem` and `evidence`; the plan says fenced, and should name the same fence helper `## Needs a person` uses (`quoteData`) so a back-tick fence in model text cannot close it."
  evidence: "its `problem`, `evidence` and the supervisor's reason fenced as untrusted DATA"
```

### The other grillers

architecture, coupling: no finding — the new stage follows triage's shape (its own command, core and CLI; contract in
`pharn-contracts`), and nothing reaches across module roots. comprehension, documentation: the contract, the floor-checks
section and the trusted-doc text cover the new surface. error-handling: every CLI exit has a branch; an unreadable
decision is S17. a11y, i18n, migrations, observability, performance, privacy: no UI, data, schema or hot path is added.

## Summary

The plan follows the triage pattern closely and keeps the commit message free of model text. Two concerns matter: the
run report would show an earlier loop's carried findings in a `/pharn-ship` report written in the same directory, and
the "only on an escalation" claim should be worded as agreement with the run's own archive count. Both are fixable in
the build without new files.

ADVISORY VERDICT: 4 concerns raised (0 blocking-severity, 2 important, 2 minor) — for the human to weigh before
/pharn-dev-build.
