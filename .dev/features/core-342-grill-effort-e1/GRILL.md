# GRILL — core-342-grill-effort-e1

Plan `.dev/features/core-342-grill-effort-e1/PLAN.md`. Spec hash: recomputed
`f058fca367fabcdfecf939dc70bfb43deaadedb1b0e810b790c4aeb156d6775d`, equal to the pin. Step 1b lessons declaration:
**GREEN** (`check-plan-lessons.mjs` exit 0; all 9 cited ids resolve and are referenced in the body).

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194044 B of griller files, 99396 B printed;
deep omission: 13 pharn-owned, 0 other; left out where present: guarantee-audit (13), machine-readable-emission (13),
two-layers (13), layer-1 (13), finding-output (13); kept whole: none

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`)

Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line; a scanner finding
is not the griller's judgment.

Findings: none (no secrets, PII or i18n scanner hit).

- `scan-plan-migrations`: mentions false. Not a finding: whether the plan needs or adequately declares this is the migrations griller's judgment.
- `scan-plan-observability`: mentions true — lines 29 (observability), 78 (logging). Not a finding: whether the plan needs or adequately declares this is the observability griller's judgment.

## Findings

### error-handling (P7)

```yaml
- type: FINDING
  rule_id: P7
  severity: important
  file: ".dev/features/core-342-grill-effort-e1/PLAN.md:89"
  problem: "The void-run rule names a reboot, an entry timeout and a harness error, but no wall-clock ceiling. A loop that hangs (a stage agent waiting on THE WAIT, a stuck gate) would hold the heavy slot indefinitely. Pre-register a ceiling (e.g. 120 min from start.txt) after which the run is killed and counted void."
  evidence: "A run that stops for a reason no grill could cause (entry `test` timeout S14b, a host reboot, a harness error) is void"
```

### testability / comprehension (P1, P6)

```yaml
- type: FINDING
  rule_id: P1
  severity: important
  file: ".dev/features/core-342-grill-effort-e1/PLAN.md:97"
  problem: "Rule 3 says a lost catch is an A finding (non-proceed) whose substance no B finding names, but leaves open the case where B names the same defect and triages it `proceed`. That is a catch the loop does not act on, so it should count as lost; state it before the runs."
  evidence: "a finding that A's grill raised and triaged other than `proceed` whose substance (same defect, any line) no B finding names"
- type: FINDING
  rule_id: P6
  severity: minor
  file: ".dev/features/core-342-grill-effort-e1/PLAN.md:100"
  problem: "Rule 4 compares outcomes only where A is green. If both arms end non-green for different reasons, or A is non-green and B green, the rule says nothing. State that any pair where A did not reach STOP_GREEN is inconclusive for rule 4 (keep high unless a second pair resolves it)."
  evidence: "B ends other than `STOP_GREEN` where A ends `STOP_GREEN`"
```

### privacy / security (P2)

```yaml
- type: FINDING
  rule_id: P2
  severity: important
  file: ".dev/features/core-342-grill-effort-e1/PLAN.md:76"
  problem: "The arms copy `.env.local` (secret-bearing) into each worktree, and the bundles are built from those worktrees. The plan deletes the copies afterwards, but names no deterministic scrub of the bundles. Run the CORE-310 pattern scan (home paths, emails, key/token shapes, PRIVATE KEY, bearer, password/secret/token assignments) over each bundle, never bundle `.env*`, and record the counts."
  evidence: "`.env.local` copies are deleted after the evidence is taken."
```

### architecture / coupling / documentation / observability / performance / migrations / a11y / i18n

No findings. The increment adds no code path, schema, UI or runtime behaviour; the observability scan's hits are
the plan's own wording about recording runs. The only product-surface change is conditional (two mirror values and a
patch bump) and its floor checks (`agreement`, `check:surface-bump`) are named.

## Summary

The plan pre-registers its arms, order, launch and decision rule before any run, and is honest that n = 1 and that
the served effort is client-sent evidence. The gaps are in the rule's edges (a same-defect `proceed` triage, a pair
where A is not green), a missing hang ceiling, and an unnamed scrub of bundles built from trees holding a secret file.
All four can be fixed in the plan before any loop runs.

ADVISORY VERDICT: 4 concerns raised (3 important, 1 minor, 0 blocking-severity) — for the human to weigh before
/pharn-dev-build.
