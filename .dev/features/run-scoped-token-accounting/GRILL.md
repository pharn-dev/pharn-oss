# GRILL — run-scoped-token-accounting

Plan: `.dev/features/run-scoped-token-accounting/PLAN.md` · spec-hash: **match** (`2f8b9264…e838` ==
recomputed) · Step 1b lessons declaration: **GREEN** (`check-plan-lessons.mjs` exit 0 — all 7 cited ids
resolve and are referenced in the body; declaration only, never application).

Grillers discovered: 13 (`count-grillers.mjs`). The deterministic scanners were run on the plan:
`scan-plan-migrations` `{"mentions":false}`, `scan-plan-observability` `{"mentions":false}`,
`scan-plan-pii` `{"found":false}`, `scan-plan-secrets` `{"found":false}`.

The a11y, i18n and performance axes do not apply: there is no UI, no user-facing translatable string,
and no scaling path beyond the existing linear transcript walk.

## Findings

### Error handling / determinism (P5)

```yaml
- type: FINDING
  rule_id: "P5"
  severity: blocking
  file: ".dev/features/run-scoped-token-accounting/PLAN.md:88"
  problem: "The 'current run = LAST run-start by seq; end = LAST run-stop' rule silently WIDENS the window when a new invocation skips its run-start: the old invocation's run-start plus the new invocation's run-stop bracket the unrelated gap between the two invocations."
  evidence: "Current run = the markers with seq ≥ the LAST valid run-start … End = ts of the LAST run-stop in the current run"
```

Recommendation: treat a `stage-start` or `orchestrator` marker that appears AFTER a `run-stop` inside
the current run as **ambiguous**, which gives `status: unknown`. A genuine re-emission of the same
invocation writes only `run-stop`s after the first one; neither command writes a stage marker after its
own `run-stop`.

```yaml
- type: FINDING
  rule_id: "P5"
  severity: important
  file: ".dev/features/run-scoped-token-accounting/PLAN.md:207"
  problem: "Lexical ISO-string comparison assumes every timestamp has the same precision. A transcript timestamp without milliseconds ('…:00Z') sorts AFTER '…:00.000Z', because 'Z' > '.', so an at-boundary request could be wrongly excluded or included."
  evidence: "ts string compare (ISO-8601 Z strings sort lexically; mark-phase emits toISOString())"
```

Recommendation: compare `Date.parse` epoch milliseconds in `run-window-core`, and treat an unparseable
`ts` as a non-member.

### Guarantee audit (P0)

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/run-scoped-token-accounting/PLAN.md:65"
  problem: "Adoption rewrites the named run-start's ts to the pending ts, and the marker keeps no trace that it was adopted. The ledger cannot tell a reader whether spec work is inside the window by design or because the marker was simply written early."
  evidence: "The written marker carries the pending ts, and the pending file is deleted."
```

Recommendation: either record the adoption (for example `origin: pending` on the marker, carried
through `readMarkers`), or state explicitly in the contract that the difference is not recoverable.

```yaml
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/features/run-scoped-token-accounting/PLAN.md:113"
  problem: "Under status unknown, 'excluded_requests = the number of session requests seen' labels UNMEASURED rows as excluded, which conflates 'outside the run' with 'run unknown'."
  evidence: "excluded_requests = the number of session requests seen (not measured)"
```

### Migrations (P7 — persisted-shape change)

```yaml
- type: FINDING
  rule_id: "P7"
  severity: minor
  file: ".dev/features/run-scoped-token-accounting/PLAN.md:117"
  problem: "The plan does change a persisted-data shape (cost.json /1 → /2), and it declares a read-compatibility policy. scan-plan-migrations reported mentions:false because its vocabulary is database-shaped. The compatibility policy is judged adequate here; the scanner miss is noted, not acted on."
  evidence: "Why a schema bump and not a correction within /1"
```

### Testability (P1)

```yaml
- type: FINDING
  rule_id: "P1"
  severity: minor
  file: ".dev/features/run-scoped-token-accounting/PLAN.md:182"
  problem: "The 'pre-fix violates' demonstration is planned as a BUILD-time run against git history rather than a committed test. That is acceptable, because a test must not depend on history, but it is advisory evidence and should be labelled as such in BUILD.md."
  evidence: "The pre-fix figure (110) is recorded in BUILD by running the same fixture against git show 81b5124:…"
```

## Summary

The design is sound in shape:

- one membership core;
- membership kept separate from attribution;
- an explicit `unknown` status;
- a schema bump that avoids reinterpreting `/1` files.

The one substantive gap is lifecycle **ambiguity** detection. The "latest `run-start` / latest
`run-stop`" rule is correct for compliant runs, but it fails **open** (widening the window) when a
`run-start` is skipped. That is the direction the intent explicitly forbids ("missing boundary evidence
must not silently fall back"). The timestamp-precision issue is a real correctness edge, and it also
affects the existing `attribute()`. Adoption traceability is a P0 honesty point.

ADVISORY VERDICT: 6 concerns raised (1 blocking-severity, 2 important, 3 minor) — for the human to weigh
before `/pharn-dev-build`. This interrogation gates nothing; the Step 1b lessons verdict is reported
above as its own floor result.
