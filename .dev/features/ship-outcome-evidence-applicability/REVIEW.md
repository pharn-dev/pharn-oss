# REVIEW — ship-outcome-evidence-applicability

**Floor:** `validate` GREEN. The standing verdicts are verify `PASS` (`reconcile` CLEAN) and regress
`no-regressions`. Everything below is advisory. The increment was reviewed as `trust: untrusted`.

## Floor-gate findings (blocking)

None. The claims reduce to floor primitives or carry an advisory label:

- Applicability is an enum/ordering test over the recorded markers, and the markers are labelled
  ADVISORY.
- Source selection is enum membership on `cost.command`.
- The refused-stage residual is stated in the module header, the contract, the ship command, `CLAUDE.md`
  and the CHANGELOG, and a test pins it.

No Capability was added, so no eval binding is owed.

## Advisory findings

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: "pharn/floor/render-run-report.mjs:520"
  problem: "A HISTORICAL cost.json whose stored outcome is `gate2` (derived before 6.9.1 from stale reports) will, when re-rendered, show `decision gate2` in ## Outcome while ## Verdicts labels the same reports NOT FROM THIS RUN. The two sections disagree, and nothing tells the reader why."
  evidence: "if (app.status === APPLICABILITY.CURRENT) return [];"
```

Correction: when the stored `outcome.decision` is `gate2` but applicability is not `current`, add one
line saying the stored outcome predates the applicability rule and would not be `gate2` today. Do not
rewrite the stored value, because the compatibility policy is that historical artifacts are not
re-derived.

## Lens notes

- **L-floor (P0).** Before/after was reproduced against `9d866ed`. The R1 stale run went from `gate2`
  to `stop:pharn-grill`. The residual is labelled at its true width (every attempt).
- **L-eval (P1).** The tests use literal decisions and go through the production reader. There are
  positive controls for applicable evidence and a completed retry, three end-to-end CLI chains, and a
  pinned residual.
- **L-trust (P2).** Only enums and marker structure are read. The label's `reason` text is fenced.
- **L-axis (P3).** "The current run" has one definition (`run-window-core.mjs`). Applicability lives in
  `ship-outcome-core.mjs` and is imported by the report, not copied.

## Verdict

GREEN at the floor. There is 1 advisory finding (important), and it will be fixed within the planned
files.

## Proposed lesson candidate

None. This is a first occurrence.
