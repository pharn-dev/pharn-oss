# GRILL — loop-entry-preflight

`.dev/features/loop-entry-preflight/PLAN.md` (amended at GATE 1 to design (D)) · spec-hash: MATCH
(`d831d30d…f4f4` == the plan's pin) · **Step 1b lessons declaration: GREEN** (`check-plan-lessons.mjs`: L22, L30,
L34, L35, L38, L41, L44, L45, L54, L62, L66 resolve and are referenced in the body).

Grillers registered: 13 (`count-grillers.mjs`). Applied inline. `scan-plan-secrets.mjs` → `{"found":false}`;
`scan-plan-observability.mjs` → `{"mentions":false}`. a11y, i18n, migrations, privacy: no surface in this plan (a CLI
and command prose; no UI, no locale text, no schema, no personal data).

## Findings (ADVISORY — model judgment; none gates `/pharn-dev-build`)

### Built-in axes

```yaml
- type: FINDING
  rule_id: P5
  severity: important
  file: ".dev/features/loop-entry-preflight/PLAN.md:120"
  problem: "A stray write by a front-stage agent outside the feature directory during the entry run trips run-gates' tree-changed-between-gates, and the loop maps that to S9 — a possibly healthy run stops, with a detail that does not say the cause was a front-stage write."
  evidence: "`child-refused` — any runner refusal, `tree-changed-between-gates` included"
- type: FINDING
  rule_id: P0
  severity: important
  file: ".dev/features/loop-entry-preflight/PLAN.md:118"
  problem: "A gate that writes a tracked file at entry (recorded `mutated: true` by run-gates) moves the tree after the pre-run snapshot was taken; the plan's document does not surface which gates mutated, so a later regress scope escape on that path would have no visible cause."
  evidence: "`{schema, status, feature, gates: [{id, exit, timed_out}], red, unattributed, excluded, reason_code, detail}`"
- type: FINDING
  rule_id: P5
  severity: minor
  file: ".dev/features/loop-entry-preflight/PLAN.md:144"
  problem: "The S14 record and the opt-in summary are written by the close part, which this increment must not edit; the plan does not say where the red ids go in either."
  evidence: "`4` → **S14** `blocked: gates-red-at-entry` with the `red` ids as DATA, or, with `--allow-red-entry`, go on and keep the ids for the summary"
```

### testability (P1)

```yaml
- type: FINDING
  rule_id: P1
  severity: minor
  file: ".dev/features/loop-entry-preflight/PLAN.md:228"
  problem: "Tests that spawn detached runners can leak processes on CI if an assertion fails before the abort; the plan does not say every such test aborts in a finally block, nor how 'no gate left running' is observed."
  evidence: "abort kills a running gate's group, and a reused pid is never signalled; a superseding start;"
```

### error-handling (P7)

```yaml
- type: FINDING
  rule_id: P7
  severity: important
  file: ".dev/features/loop-entry-preflight/PLAN.md:105"
  problem: "Ordering race: `--start` records `runner.json` (with the pid) after the spawn, while the runner refuses unless `runner.json` names its nonce — a fast runner can read the directory before the record exists and refuse."
  evidence: "Else it records `runner.json` (`{schema, feature, nonce, pid, timeout_ms, d0}`), spawns the runner and exits `0`."
```

### architecture / coupling (P3)

```yaml
- type: FINDING
  rule_id: P3
  severity: minor
  file: ".dev/features/loop-entry-preflight/PLAN.md:110"
  problem: "The entry CLI reads its records through `regress-base-reuse.mjs` `readInProject`, a regress module whose load graph brings `run-gates.mjs`; reuse is right (L35), but the dependency direction should be stated so a regress change is known to reach the entry check."
  evidence: "reads `runner.json` and `result.json` only through `readInProject` (lstat-walked, not followed, capped)"
```

security (P2): scanner clean. The new surfaces are signals sent to processes and `ps` parsing. Both are bounded in the
plan: a signal goes only to a nonce-verified runner and its snapshotted descendants, and `ps` is read as three integer
columns. No finding.
performance (P7): the runner adds one small feature-directory walk per gate. The two whole-tree fingerprints per gate
already run at verify. No scaling risk.
observability (P6): the runner keeps a log and a result record, and `--wait` names every gate and exit. Presence
recognized.
documentation (P7): a contract section, a CLAUDE.md entry and a CHANGELOG section are declared. Presence recognized.
comprehension: no finding. The plan is long, but each invariant is named once.

## Summary

The design holds its three invariants on paper. The concerns are at the edges. One write-ordering race (runner vs.
`runner.json`) is a real bug to design out before the build. A front-stage write outside the feature directory reads as
an S9 with no named cause. A mutating entry gate is invisible in the document. The close part, which cannot be edited,
needs to be told where the red ids go. Detached-process tests need a leak-proof cleanup.

**Disposition (builder, after the grill):** the plan was amended for all six — `runner.json` is written before
the spawn (pid filled in after); the document gains `mutated` and `runner_reason`; the front-stage-write S9 is a
stated bound; the S14 ids go to `### next_steps` (the S12 precedent) and the opt-in ids to the Step 7 summary, both
named in the main file; every runner-starting test aborts in `finally` and observes ESRCH; the `readInProject`
dependency direction is stated. None declined.

ADVISORY VERDICT: 6 concerns raised (0 blocking-severity, 3 important, 3 minor) — for the human to weigh before
/pharn-dev-build.
