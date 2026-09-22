# REVIEW — cost-ship-integration-review

**Floor:** `validate` GREEN. Verify is `PASS` and regress is `no-regressions`. What was reviewed is the
review increment itself: one report and one probe under `.dev/`. Everything below is advisory.

## Floor-gate findings

None. No product surface changed, no Capability was added, and there is no guarantee claim without a
floor reduction. The report labels its probe results as fixture-bound.

## Advisory findings

```yaml
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/features/cost-ship-integration-review/integration-probe.mjs:12"
  problem: "The probe deliberately exits 1 at the reviewed HEAD because of the F1 reproduction. A future reader who runs it after F1 is fixed will see exit 0, and a reader who runs it now may mistake the 1 for a broken probe. The header says so, which is sufficient. It is noted only so the exit code is not later read as a gate."
  evidence: "At the reviewed HEAD 760c5de it exits 1 on I1b by design."
```

## Lens notes

- **L-floor (P0).** The conclusion follows from the evidence. The only confirmed defect is at the report
  layer, and it affects no decision, so "non-blocking" is justified. F2 is correctly kept as a risk,
  because its trigger is an orchestration error.
- **L-eval (P1).** The probe asserts literals through the production CLIs and was re-run from its
  committed location with the same result.
- **L-trust (P2).** The probe reads no real transcript, and everything it touches is synthetic under
  `tmpdir()`.
- **L-axis (P3).** The artifacts live under the feature's own `.dev/features/` directory. There are no
  product-module references beyond invoking the public CLIs.

## Verdict

GREEN at the floor, with 1 minor advisory finding and no fix required.

## Proposed lesson candidate

A **candidate** for `/pharn-dev-memory-promote`, not promoted: _"When a machine artifact gains a status
dimension, every human-facing VIEW over it must branch on that dimension too."_ #233 added the `unknown`
/ `unavailable` distinction to `cost.json` and to its checker, while the `RUN-REPORT.md` view branched
on only one of the two axes (F1). This is a first occurrence, so the L20 bar is not met, and it is
recorded here only.
