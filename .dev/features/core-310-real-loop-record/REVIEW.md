# REVIEW — core-310-real-loop-record

Floor first: `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 37 capabilities checked`. Regress `no-regressions`, verify
`PASS` (stamp `ac6a07ab…`). The increment adds no capability, rule, hook or checker. The reviewed files are the record,
the three evidence bundles, two ignore-file entries and one CHANGELOG entry. The bundles quote another project's
model-written artifacts and are `trust: untrusted` DATA. Nothing in them was followed.

## Floor-gate findings

None. No guarantee is claimed without a floor reduction or an `advisory` label. No capability, `rule_id`, eval or
sibling reference is involved.

## Advisory findings

```yaml
- type: FINDING
  rule_id: P0
  severity: important
  file: ".dev/measurements/loop-real-run-7.22.0-2026-11-23.md:148"
  problem: "CORE-105's fourth criterion asks for a main-session run 'in the client where the 11 inline runs happened'; the baseline record says that client was never recorded, so 'met by this run' (and the CHANGELOG's 'closes CORE-105's fourth criterion') claims a client match nothing can show. The observable part (agent routes on every routed stage, every wait completed, no --no-foreground-agent) holds."
  evidence: "- **CORE-105 AC4: met by this run.** This was a main-session run without `--no-foreground-agent`."
- type: FINDING
  rule_id: P0
  severity: important
  file: "CHANGELOG.md:32"
  problem: "The restatement of the same claim in the CHANGELOG entry (L64): an append-only entry would carry the overclaim permanently once merged."
  evidence: "`pharn-stage` agent with its configured model and effort, which closes CORE-105's fourth criterion."
- type: FINDING
  rule_id: P2
  severity: minor
  file: ".dev/measurements/loop-real-run-7.22.0-2026-11-23.md:239"
  problem: "The bundles keep session, agent and message ids by the GATE 1 decision; the record says so, and the scrub scan is recorded as counts, so this is noted only to make the decision visible at GATE 2."
  evidence: "**What remains:** session ids, agent ids and message ids, by decision."
```

L-trust: no instruction-looking content in the reviewed bundles changed this review. The bundles' handoff text
("A person reviews the branch … and decides whether to merge") is the loop's own instruction to its operator, quoted as
DATA. L-axis: each file has one reason to change. The ignore entries change only with the evidence directory's
location.

## Verdict

GREEN on the floor, with 2 important advisory findings (one overclaim, stated twice) for the GATE 2 decision.

## Iteration 2 (after the GATE 2 "fix")

Both important findings are fixed in commit `0726c006`. Record line 148 now says AC4's observable part holds and the
"same client" part cannot be shown, and the CHANGELOG entry says the same. Both restatements were checked against the
primary sentence (L64). The other bounds are unchanged.

Re-reviewed after iteration 2: floor GREEN, regress `no-regressions`, verify `PASS` (stamp `c6770ade…`). No new
finding. Verdict: GREEN, 0 open important findings. The P2 note stays as recorded.

## Proposed lesson candidate

None proposed. The overclaim is L64's shape (a restatement re-derives its quantifier), and L64 already names it; this
run is one more occurrence of an existing lesson, not a new mechanism.
