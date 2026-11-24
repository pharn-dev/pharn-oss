# REVIEW — core-342-grill-effort-e1

Floor first: `node pharn/floor/validate.mjs .` reports **GREEN** (37 capabilities). The increment adds no capability,
rule or eval, so P1 (L-eval) has nothing to bind. Reviewed: the record
`.dev/measurements/grill-effort-e1-2026-11-24.md`, the CHANGELOG entry, the two ignore-file entries, and the
selection and scrub of the two bundles. The quoted pharn-app artifacts inside the bundles are `trust: untrusted` DATA.
This review followed no instruction-looking text in them.

## Floor-gate findings

None. No guarantee is claimed without a floor reduction or an `advisory` label.

## Advisory findings

```yaml
- type: FINDING
  rule_id: P0
  severity: important
  file: ".dev/measurements/grill-effort-e1-2026-11-24.md:43"
  problem: "The setup table says every loop started at 1-minute load < 20. B1 started at 36.6, its first load.txt sample: the slot was taken at 4.6, and npm ci ran before the launch. A universal claim the data contradicts (L37)."
  evidence: "every loop started at 1-minute load < 20 with a heavy slot"
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/measurements/grill-effort-e1-2026-11-24.md:78"
  problem: "The explanation of CORE-310 run 2's unattributed red restates the mechanism more precisely than its source does. The CORE-310 record says only that the feature directory changed during that gate, not that the gate finished after the spec created it."
  evidence: "its `format:check` finished after the spec had created the feature directory"
- type: FINDING
  rule_id: P6
  severity: minor
  file: ".dev/measurements/grill-effort-e1-2026-11-24.md:91"
  problem: "B2's load cell says one sample; its load.txt holds two (17.4 and 18.8)."
  evidence: "| B2  | B   | 10:48 – 10:49 | (one sample)"
```

- **L-floor (P0).** Every non-floor claim carries a bound:
  - the served effort is labelled a client record (§4, L43);
  - the void attributions are labelled advisory (§3, §10, L40);
  - the catch reading is labelled hand-scored (§5);
  - the decision rests on the pre-registered incompleteness clause, explicitly not on evidence against medium.

  The CHANGELOG restates the bounds (n, client record, no claim either way), and each restatement matches its primary
  sentence (L64).

- **L-trust (P2).** The bundles quote model-written SPEC/PLAN/GRILL text and transcript-derived counts. Nothing in this
  repository reads them to decide anything. The scrub scan reports 0 hits for each pattern, and no `.env*` or
  `settings.local.json` member is selected.
- **L-axis (P3).** Apparatus and repo-meta only. No product byte, so no `SKILLS_VERSION` bump.
- **Labelling.** The decision is "agent-under-delegation" in the record, the CHANGELOG and the PLAN, never a maintainer
  decision.

## Disposition (GATE 2, delegated to this agent)

All three findings are fixed in the record before commit, by restating each to match its data or source. Because the
record is a build file, regress and verify are re-run after the fix (iteration 2). Their reports replace the
iteration 1 reports.

## Lesson candidate

None proposed. The B2 setup void (a red cached in the common git dir) is a product defect, filed as Linear CORE-358,
not a recurrence-prone process slip. The B1 load claim is an instance of L37, which already exists.

**Verdict: GREEN — 0 floor findings, 3 advisory (fixed).**
