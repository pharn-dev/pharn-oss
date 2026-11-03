# REVIEW — loop-record-honesty

The increment under review is `trust: untrusted`. No instruction-looking content was found in it.

**Floor first (P0):** `node pharn/floor/validate.mjs .` is GREEN (37 capabilities). The standing verdicts are verify
PASS and regress `no-regressions`.

**Verdict: GREEN — 0 floor-gate findings; 5 advisory findings.**

## Floor-gate findings (blocking)

None.

- **L-floor (P0).** Each new guarantee reduces to a primitive and states its bound:
  - repeated report key → INCONCLUSIVE: enum-regex scan, tested, top-level only;
  - `repeated-key` / `approved-by`: enum, tested;
  - `RESERVED_BY` / `realInstant`: enum plus arithmetic, tested, and labelled "not identity verification";
  - `left_dirty`: content-hash agreement through the snapshot's existing reader, labelled "agreement, never
    provenance".
- **L-eval (P1).** No capability (`role:`) changed. Every behaviour change has a test and a control.
- **L-axis (P3).** Every edited file stays on its own axis. `loop-closeout.mjs` now imports `pre-run-snapshot.mjs`;
  both are `pharn/floor/`, and the import reuses the regress side's reader rather than copying it (L35). No sibling
  `reads:`.
- **L-trust (P2).** Messages quote key names (bounded) and counts, never values. Paths in the closeout log are
  JSON-quoted. No decision rests on free text.

## Advisory findings

```yaml
- type: FINDING
  rule_id: P0
  severity: important
  file: ".dev/features/loop-record-honesty/VERIFY.md:33"
  problem: "Three build writes made between the epoch-1 reconcile capture and the mid-build re-anchor are covered by no reconcile window; the verify reconcile gate judges epoch 2 only."
  evidence: "No reconcile covers those three writes, and epoch 1's capture covers only what preceded them."
- type: FINDING
  rule_id: P7
  severity: important
  file: ".dev/features/loop-record-honesty/PLAN.md:195"
  problem: "The plan widened the repeated-key refusal and the --state reading beyond the finding without first running the test files of every reader of those fields; four tests outside ## Files pinned the deliberate 6.20.5 parity, which forced a widened plan after the anchor."
  evidence: "The first `npm run check` of the build was RED in four tests outside this plan."
- type: FINDING
  rule_id: P2
  severity: minor
  file: "pharn/floor/check-spec.mjs:189"
  problem: "approved_by ABSENCE is not detected, so a model-approved SPEC can still omit the marker; the rule only refuses a value other than model."
  evidence: "ABSENCE is not detected: a model-approved SPEC without the key passes"
- type: FINDING
  rule_id: P5
  severity: minor
  file: ".claude/commands/pharn-spec.md:302"
  problem: "Step 5 routes every non-pin RED back to Draft and Step 4; for repeated-key the remedy is deleting one line, which the routing text does not name."
  evidence: "**any** RED has another kind (for example `clarification`, a marker that survived, or `kind-in-body`"
- type: FINDING
  rule_id: P2
  severity: minor
  file: "pharn/floor/check-attestation.mjs:53"
  problem: "RESERVED_BY refuses `user` and `human`, which a real person could hold as a handle; the contract names the list as a placeholder deny-list, so the cost is stated, not hidden."
  evidence: '"human",'
```

Notes on the five advisory findings:

1. **Reconcile gap (VERIFY.md).** Recorded at the orchestrator's direction. The batch protocol would have committed
   before the second anchor. The three writes were hook-gated Edit-tool writes to declared paths.
2. **Plan widening.** This was the failure of the run; see the lesson candidate below.
3. **`approved_by` absence.** A known residual. `pharn/LIMITS.md §1d` already calls the marker ungated.
4. **Routing for `repeated-key`.** Advisory. Returning to Draft is the safe direction.
5. **`user` / `human` in `RESERVED_BY`.** GATE 1 Q3 chose the exact 15-name list.

## Not changed, stated

- `check-spec-approved.mjs`'s header still narrates check-spec's LAST-wins parse. That stays true for `--state`,
  which keeps `readField` parity.
- `loop-closeout.mjs` `BLOCKED_RE` is untouched (G2's area).

## Proposed lesson candidate (for `/pharn-dev-memory-promote`; NOT written to canon)

- target: `.dev/memory-bank/lessons-learned.md`
- type: `process` · concepts: `[plan-shape, parity-pin, scope-widening, reconciliation, lesson-recurrence]`
- title: "A refusal widened beyond its finding meets the parity pins of every other reader of that field — run their
  tests before the anchor, or the fix arrives as a widened plan and a re-anchor."
- body: This plan extended a `state:` repeat refusal to `spec_content_hash` / `spec_id`, and changed `--state`'s
  reading. Three test files outside `## Files` pinned the 6.20.5 decision that every reader takes the last copy. The
  build had to narrow the change and add a file after the anchor. The re-anchor then ran with the edits uncommitted,
  which left three writes unreconciled. Remedy: before the anchor, `grep` the field name across `*.test.mjs` and run
  those files against the planned change. Otherwise commit, set the scope, then anchor (L68).
- provenance source: `.dev/features/loop-record-honesty/REVIEW.md` (this file), advisory findings 1–2; feature
  `loop-record-honesty`.
