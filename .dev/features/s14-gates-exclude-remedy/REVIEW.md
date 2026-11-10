# REVIEW — s14-gates-exclude-remedy

Floor: `node pharn/floor/validate.mjs .` → **GREEN** (37 capabilities). Everything below is advisory.

Reviewed (`trust: untrusted`): `.claude/commands/pharn-loop.md` (S14/S14b rows, Step 4 exit-4/exit-6 bullets),
`pharn/floor/entry-gates.test.mjs` (the four-site test), `README.md`, `SKILLS_VERSION`, `CHANGELOG.md`. No
instruction-looking content in the reviewed files tried to direct the review.

## Floor-gate findings

None.

## Advisory findings

### L-floor → P0

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".claude/commands/pharn-loop.md:436"
  problem: "S14 says the `gates.exclude` declaration must be committed before the re-run, but the S14b row and the exit-6 bullet do not, although the same commit-before-the-run rule (`gate-run-record.md`) applies to both; a person following S14b with an uncommitted declaration would see regress read it `scope-escaped`."
  evidence: "make the gate finish in time or start, list it in `pharn.config.json` `gates.exclude` (an excluded gate does not run and is reported as excluded), or re-run with `--allow-red-entry`"
```

The four-site claim reduces to the new enum/regex test (floor); that an agent's stop message now offers the remedy is
labeled advisory in the CHANGELOG entry. The cost sentence is cited from 6.36.0's mechanism, not a new claim.
Classification of red/unmeasured gates is untouched: no checker, stamp or exit-code file changed (regress scope
confirms the inside set).

### L-eval → P1

No capability or `rule_id` changed, so no eval pair is owed. The test iterates one four-member enumeration (L29) and
bounds each slice (`< 900` chars) so a missed bullet terminator cannot pass on the next bullet's words. No finding.

### L-trust → P2

The stop procedure still copies only the entry JSON document's ids into `### next_steps` as DATA; the added remedy is
fixed command prose, not gate output. No finding.

### L-axis → P3

One axis: the S14/S14b remedies. No sibling reference. One note:

```yaml
- type: FINDING
  rule_id: P3
  severity: minor
  file: ".claude/commands/pharn-loop.md:417"
  problem: "Prettier re-padded every row of the stuck-point table because the S14 cell became the widest, so the diff shows 19 changed rows for 2 changed cells; a reviewer of the PR must read past whitespace-only churn."
  evidence: "| S1   | always, at entry … (all 19 rows re-padded)"
```

## Proposed lesson

None: both findings are one-off wording/formatting points with no recurrence evidence (L20's bar).

## Verdict

GREEN — 0 floor-gate findings, 2 minor advisory findings.
