# GRILL — run-report-ledger-honesty

Plan: `.dev/features/run-report-ledger-honesty/PLAN.md` · spec-hash: **match** · Step 1b lessons
declaration: **GREEN** (exit 0). The deterministic scanners (`migrations`, `observability`, `pii`,
`secrets`) all reported false. The other griller axes have no material in this increment (no UI, no
data shape, no secrets).

## Findings

```yaml
- type: FINDING
  rule_id: "P5"
  severity: important
  file: ".dev/features/run-report-ledger-honesty/PLAN.md:44"
  problem: "A 'greater seq' comparison fails OPEN after the markers file is reset. A user who clears .pharn/ restarts seq at 1, so a new run's run-start (seq 1) is not greater than the stale ledger's run-start (seq 1) and the old ledger reads as current."
  evidence: "The ledger is **STALE** iff the live file's greatest `run-start` `seq` > the greatest `run-start` `seq` recorded in `cost.markers`"
```

Recommendation: compare the IDENTITY of the latest `run-start`. A marker's `seq` together with its `ts`
identifies it. Treat the ledger as STALE iff the live file's latest `run-start` differs from the ledger's
latest recorded `run-start`, which includes the case where the ledger has none. This covers a reset and
a later run alike.

```yaml
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/features/run-report-ledger-honesty/PLAN.md:88"
  problem: "The staleness test is blind when the failed run never wrote a run-start either, for example an invocation abandoned before its named run-start. The plan states this. The report text should state it too, not only this file."
  evidence: "It is blind when the run wrote no `run-start` either."
```

## Summary

The design is small and correctly places the deterministic control in the renderer, with the command
prose as the advisory layer. The one real gap is the fail-open comparison after a reset.

ADVISORY VERDICT: 2 concerns raised (0 blocking-severity, 1 important, 1 minor) — for the human to weigh
before `/pharn-dev-build`.
