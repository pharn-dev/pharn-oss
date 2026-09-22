# REVIEW — run-scoped-token-accounting

**Floor:** `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 36 capabilities checked`. The standing
verdicts are verify `PASS` and regress `no-regressions`. Everything below is **advisory**.

The increment under review was treated as `trust: untrusted`. No instruction-looking content in it
changed this review's behaviour.

## Floor-gate findings (blocking)

None. Every guarantee the increment claims reduces to a floor primitive or carries an advisory label:

- The window rule and the per-row membership re-test are **FLOOR**: an enum/ordering test plus a
  recompute, in `run-window-core.mjs` and in the checker's RULE 8.
- Marker execution is labelled **ADVISORY** in the core header, `mark-phase.mjs`, the contract and both
  commands.
- The `excluded_requests` VALUE is labelled **ADVISORY** without `--verify-transcript`, in the contract's
  field table.
- `--verify-transcript` is labelled perishable.

No `role:`-bearing Capability was added, so no eval binding is owed (P1). `validate` agrees.

## Advisory findings

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: "pharn/floor/mark-phase.mjs:188"
  problem: "Every run-start adopts a same-session pending start, not only /pharn-ship's. A pending file left by an abandoned /pharn-ship (one that stopped before /pharn-spec named the feature) is therefore adopted by a later /pharn-loop run-start in the same session. That silently widens the loop's window back to the ship's moment, which is exactly the unrelated-earlier-activity inflation this increment exists to remove."
  evidence: "probe: writePendingStart @08:00, then markPhase(kind: run-start) for a loop feature @10:00 → ts 2026-09-21T08:00:00.000Z, origin: pending"
```

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: "pharn/floor/check-cost-ledger.mjs:392"
  problem: "--verify-transcript on an UNKNOWN-membership ledger reports GREEN with no WARN even when the transcript no longer exists. The 'transcript unavailable' warning is skipped whenever the re-derived membership is also unknown, so an empty-equals-empty comparison reads as a successful binding to the referent."
  evidence: "probe: unknown ledger, projectsDir absent → reds: 0, warns: []"
```

```yaml
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "pharn/floor/check-cost-ledger.mjs:388"
  problem: "The marker-completeness WARN still describes /1 semantics. Under /2, requests before a missing run-start are not 'unattributed': the whole run is unknown and has no rows."
  evidence: "no run-start marker — requests before the first marker are `unattributed`"
```

```yaml
- type: FINDING
  rule_id: "P5"
  severity: minor
  file: "pharn/floor/render-cost-ledger.mjs:374"
  problem: "attribute() still compares ISO timestamps as STRINGS. Membership was moved to numeric comparison, but a stage boundary between a millisecond-less and a millisecond-bearing timestamp can still attribute a member to the wrong stage. This is pre-existing and affects the stage VIEW only, never membership or totals."
  evidence: "if (m.ts === null || m.ts > ts) continue;"
```

## Lens notes

- **L-floor (P0).** Covered above. The contract's "Run membership" section states every bound the intent
  required: the initial request, the unwritten tail, marker execution, the selected session only, a
  stale pending start, and untrusted timestamps.
- **L-eval (P1).** Tests assert hand-computed literals (10, 27, 12, 4). The emitter/checker agreement is
  not the only evidence. The pre-fix 110 was reproduced against `81b5124` in the build (advisory
  evidence, see SHIP.md).
- **L-trust (P2).** Transcript `timestamp` and `sessionId` now also decide membership. This is disclosed
  as a residual. It affects a view that gates nothing.
- **L-axis (P3).** Membership lives in its own module (`run-window-core.mjs`, no imports), imported by
  the emitter and the checker, not copied. `mark-phase.mjs` imports only `tsMs` from it, and no cycle is
  introduced.

## Verdict

**GREEN at the floor, with 0 floor-gate findings.** There are 4 advisory findings: 2 important and 2
minor. The two important ones are small, and both are within the approved `## Files`.

## Proposed lesson candidate

None. The two important findings are first occurrences of their shape in this increment, so the L20
recurrence bar is not met.
