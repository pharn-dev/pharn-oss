# GRILL — docs-sync-6-11

Plan: `.dev/features/docs-sync-6-11/PLAN.md` · spec-hash: **match** (`2f8b9264…e838`) · Step 1b lessons
declaration: **GREEN** (`check-plan-lessons.mjs` exit 0).

Grillers: 13 registered. All five deterministic plan scanners reported no hits, and every axis beyond
documentation and honest scope is inapplicable to a prose-only increment.

## Findings

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/docs-sync-6-11/PLAN.md:63"
  problem: "Site 4 argues that because `MIN_CLI` is 0.5.0, every CLI that may install this tree copies all four docs. Probed in pharn-cli: `minCliGate` itself landed in `2db6563` (#120), first tagged `v0.4.0`. A pre-0.4.0 CLI never reads `MIN_CLI`, so the gate cannot refuse it. The claim holds for every CLI NEW ENOUGH TO HONOR the gate, not for every CLI."
  evidence: "`MIN_CLI` is `0.5.0`, so every CLI that may install this tree copies all four."
```

Recommendation: bound the CLAUDE.md sentence to CLIs that honor `MIN_CLI`, and name the pre-0.4.0 case
in one clause. README can drop the limitation outright: its quick start is `@latest` (0.5.0), and a
pre-0.4.0 CLI is already broken on this tree by the 5.0.0 relocation.

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/docs-sync-6-11/PLAN.md:42"
  problem: "Site 1's fix, that the shipped `settings.json` does not register the Stop guard, is a claim that expires the moment a human applies `loop-stop-guard/settings-patch/APPLY.md`, in a file nobody will be editing. That is L33's shape, and this increment would be creating a new instance of the defect it is repairing."
  evidence: "`.claude/settings.json` wires only `PreToolUse`"
```

Recommendation: write the non-expiring half as a rule ("it does nothing unless your settings register
it under `Stop`"). Date the half that can expire ("as of `6.11.1`"). Add a step to `APPLY.md`, the
checklist the human follows when the referent changes, telling them to revise that README sentence.
This adds `APPLY.md` to `## Files`.

```yaml
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/features/docs-sync-6-11/PLAN.md:48"
  problem: "The new guarantees row must carry 'that the stage ran at all' as a bound, not only forgery. Without it, 'the verdict map is produced by tested code' reads as 'the verify verdict is honest'. The contract lists both separately."
  evidence: "Its bound states the forgery and provenance limits"
```

## Summary

The sweep is thorough and every site is probed against source. Two of the fixes would themselves
overclaim or expire as first worded: the `MIN_CLI` argument and the settings sentence. The third concern
is a missing bound on the new row. All three are wording changes plus one added file.

ADVISORY VERDICT: 3 concerns raised (0 blocking-severity, 2 important, 1 minor) — for the human to weigh
before `/pharn-dev-build`. The Step 1b floor verdict is GREEN and is reported above, separately.
