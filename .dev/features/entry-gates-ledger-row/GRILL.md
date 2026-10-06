# GRILL — entry-gates-ledger-row

Plan: `.dev/features/entry-gates-ledger-row/PLAN.md` · spec-hash: recomputed
`d831d30d399a37dc403080072763d13383de6f6f31875e7e8cb4eadeb642f4f4` = the plan's pin (no drift) · **Step 1b lessons
declaration: GREEN** (`check-plan-lessons.mjs` exit 0; all 9 cited ids resolve and are referenced in the body).

Grillers: `count-grillers.mjs` registered 13. Their axes were applied inline. Deterministic scanners: `scan-plan-i18n`,
`-migrations`, `-pii` and `-secrets` returned nothing. `scan-plan-observability` returned `mentions: true` (lines 16, 103,
109, 128, 187: "logging", "telemetry", "instrumentation"). Those mentions are the increment's subject itself
(observational telemetry of the entry runner), so they are real and adequate for what it builds: no absence finding.
a11y, i18n, migrations, privacy and comprehension: nothing applicable (no UI, no user text, no schema migration of stored
data, no personal data, the plan is self-contained). The data migration question is answered by compatibility: no
historical ledger is rewritten.

## Findings (advisory — none is a gate)

```yaml
- type: FINDING
  rule_id: P3
  severity: minor
  file: ".dev/features/entry-gates-ledger-row/PLAN.md:115"
  problem: "`--start` must read the feature's markers to find the current run-start, and the only full marker reader (`render-cost-ledger.mjs readMarkers/normalizeMarkers`) would pull the transcript load graph into the entry runner; a second reader could disagree with the ledger's normalization about which run-start is current."
  evidence: "`--start` reads the current run-start"
- type: FINDING
  rule_id: P0
  severity: important
  file: ".dev/features/entry-gates-ledger-row/PLAN.md:78"
  problem: "Binding by exact `(seq, ts)` equality is safe only if every disagreement between the start-time reader and the ledger's `markers[]` produces UNBOUND, never attribution to another run; the plan should pin that direction with a test (a run-start the ledger normalizes away, a reset `.pharn/cost`)."
  evidence: "An invocation is in a ledger only when its `start.run` equals the ledger's current run-start `(seq, ts)`"
- type: FINDING
  rule_id: P0
  severity: important
  file: ".dev/features/entry-gates-ledger-row/PLAN.md:122"
  problem: "Every ledger the emitter writes now carries two more keys, so existing tests that compare a whole emitted ledger (or a serialized one) will change; the regression claim must be stated over the shared keys (requests, totals, views, membership, markers, executions, work) and proved by comparing them field by field, not by re-blessing a golden file."
  evidence: "the same request fixtures keep identical `requests`, `totals`, … with and without an entry file (regression)"
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/entry-gates-ledger-row/PLAN.md:94"
  problem: "Supersession by a later `--start` kills the earlier runner without writing any event for the earlier nonce; that earlier invocation's lifetime stays `incomplete` in any re-emission. That is the honest reading, but the plan should state it where supersession is described rather than leave it implicit."
  evidence: "One `O_APPEND` write per line … consecutive invocations for one feature keep their history and bind apart by run-start"
- type: FINDING
  rule_id: P5
  severity: minor
  file: ".dev/features/entry-gates-ledger-row/PLAN.md:85"
  problem: "Admission uses `isMember`, whose session opening is per session; a runner or `--wait` event carrying a session id different from every current-run marker's (a resumed session with a new id) is not a member and silently leaves the ledger, so an `incomplete` segment could be caused by session identity rather than timing. The contract should name this bound."
  evidence: "an event is a fact only when it is a run-window member, `run-window-core.mjs isMember`"
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/features/entry-gates-ledger-row/PLAN.md:59"
  problem: "`segments_overlap_marked_stages_ms` compares wall intervals from different processes (runner timestamps vs marker timestamps); the field and the rendered line must carry the placement-only wording, and the report must not present it as time saved."
  evidence: "It says where the runner's observed execution fell on the wall clock relative to PHARN's marked stages."
```

## Summary

The plan holds together. It reuses the 6.35.0 facts/view split, the window admission rule and the nonce. It binds a run
by the run-start recorded at entry, with no proximity heuristics. Instrumentation stays off every control path. The
concerns are about making the bounds explicit and testing the safe direction of each: binding disagreement must read
unbound, supersession leaves incomplete, a session-id change leaves events out, and overlap is placement only. One is
about the regression proof's method (field-by-field over the shared keys, not a re-blessed golden). For the marker reader,
the build should reuse `run-window-core.mjs currentRunMarkers` over a bounded line read and not import the emitter.

ADVISORY VERDICT: 6 concerns raised (0 blocking-severity, 3 important, 3 minor) — for the human to weigh before
/pharn-dev-build. This verdict covers the interrogation only; the Step 1b lessons-declaration verdict above is a separate
floor result.
