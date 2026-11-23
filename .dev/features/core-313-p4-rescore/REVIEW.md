# REVIEW — core-313-p4-rescore

Floor first: `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 37 capabilities checked`. The increment adds no
capability, contract or checker. Its deterministic coverage is what `/pharn-dev-verify` ran (PASS, seven gates) and the
re-runnable scorer output the record cites (`defect-probe-score.mjs score --probe p4` → `no-anchor-match`).

The reviewed increment was treated as `trust: untrusted`, and so were the run files it quotes (`grill-findings.json`,
another model's output). No instruction-looking content was found in either, and nothing in them changed this review.

## Floor-gate findings

None.

## Advisory findings

### L-floor → P0

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/probes/defect-probes/README.md:99"
  problem: >-
    The new hand-check rule is the only thing standing between a scorer miss and a wrong catch-lost verdict in a future
    record, and nothing checks a record against it; the rule says so ("Nothing checks a record against this rule"), and
    by L20's bar a second off-anchor miss that a record states unchecked is the trigger for a floor check, for example
    a stage-model-pairs.mjs output field naming the lost pairs' variant runs to open.
  evidence: "Nothing checks a record against this rule."
```

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/measurements/stage-model-tuning-2026-11-17.md:274"
  problem: >-
    Rules 1-3 in the hand derivation are restated from the floor output rather than re-derived; they hold because the
    re-score changes only one variant outcome and none of those rules reads it, which the record could say in one
    clause so a reader need not check.
  evidence: "1. `arm-not-applied`: no. Every session was served its expected family (unchanged)."
```

### L-eval → P1

No capability, `rule_id` or checker changed, so no eval binding is due. The probe set's manifest and hashed inputs are
untouched: `defect-probe-score.mjs verify --manifest-sha256 bfbad249…` printed GREEN after the build.

### L-trust → P2

```yaml
- type: FINDING
  rule_id: P2
  severity: minor
  file: ".dev/measurements/stage-model-tuning-2026-11-17.md:265"
  problem: >-
    The correction paraphrases G1-1's free text (another model's output) as the basis of the hand catch; it is labelled
    advisory and gates nothing, which is the right handling, and the scorer's trust boundary (file, id, severity,
    disposition only) is unchanged.
  evidence: "Its text names SPEC AC-4 as having no step, file, stored field or acceptance mapping"
```

### L-axis → P3

One axis per file: the record carries the measurement and its correction, the README carries the probe-set rule, the
CHANGELOG carries the entry. No sibling reference.

## Other observations (advisory)

- `.dev/probes/**` is excluded from prettier and markdownlint (its bytes beside the hashed inputs are pinned by
  convention), so the README edit is checked by neither style gate. Read by eye: list markers and wrap match the
  surrounding bullets.
- The merged 2026-11-17 CHANGELOG line ("A medium-effort grill reads `does-not-support`: it lost one catch.") stays as
  it was. The new `[Unreleased]` `### Fixed` entry corrects it (L78), and `check:changelog-entry` is GREEN against
  2ec930d7.
- CORE-312's record (`.dev/measurements/reuse-and-effort-2026-11-23.md:170-176`, merged mid-run) already states the
  same correction and agrees with this record's numbers (no catch lost, chain USD 13.10 → 11.20).
- Linear: CORE-112 is trashed, so the follow-up CORE-342 links CORE-313 only.

## Verdict

GREEN — 0 floor-gate findings, 3 advisory (minor).

## Lesson candidate

None proposed. The failure (a correct catch cited off a pre-registered anchor) has occurred once. The remedy is a
documented hand check, and L20's bar for a floor check is a second occurrence.
