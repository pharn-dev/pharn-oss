# GRILL — core-344-no-change-criteria

Plan `.dev/features/core-344-no-change-criteria/PLAN.md`; spec-hash check: `pharn/ARCHITECTURE.md` = `f058fca3…775d`,
equal to the plan's pin (no drift); Step 1b `check-plan-lessons.mjs`: **GREEN** (exit 0 — L83, L76, L64 resolve and are
referenced in the body).

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194044 B of griller files, 99396 B printed; deep omission: 13 pharn-owned, 0 other; left out where present: guarantee-audit (13), machine-readable-emission (13), two-layers (13), layer-1 (13), finding-output (13); kept whole: none

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`)

Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line; a scanner finding
is not the griller's judgment.

Findings: none (no secrets, PII or i18n scanner hit).

- `scan-plan-migrations`: mentions false. Not a finding: whether the plan needs or adequately declares this is the migrations griller's judgment.
- `scan-plan-observability`: mentions true — lines 21 (observability). Not a finding: whether the plan needs or adequately declares this is the observability griller's judgment.

## Findings

### Built-in interrogation

```yaml
- id: G1
  type: FINDING
  rule_id: P0
  severity: important
  file: .dev/features/core-344-no-change-criteria/PLAN.md:48
  problem: "The --model-approve handling lives only in Step 2, but /pharn-spec's amend mode (Step 1a) runs Step 3's checks, Step 4a's bullets and Step 5 — not Step 2 — so a criterion appended by amend mode escapes the rule."
  evidence: "Step 1a: 'Then run Step 3's two checks, Step 4a's bullets and Step 5's pin'. The plan's Step 4a is untouched."
- id: G2
  type: FINDING
  rule_id: P5
  severity: important
  file: .dev/features/core-344-no-change-criteria/PLAN.md:50
  problem: "Under --model-approve, when every criterion holds before the build (a pure 'nothing changes' intent), moving them leaves no criterion; the plan names this the Missing-criteria gap but does not say what the unattended stage does, so it would approve nothing coherent or carry the criterion to S9."
  evidence: '''If moving it leaves no criterion, that is the "Missing acceptance criteria" gap.'' Step 4a already has the analogous terminal: ''If no criterion would remain, approve nothing and report back blocked on thin intent.'' (/pharn-loop S6 `blocked: thin-intent`).'
- id: G3
  type: FINDING
  rule_id: P6
  severity: minor
  file: .dev/features/core-344-no-change-criteria/PLAN.md:42
  problem: "If the stage reuses S6 'blocked: thin-intent' for the all-criteria-hold case, /pharn-loop's S6 row lists its causes and would no longer name every one."
  evidence: "S6: 'the description cannot fill the SPEC's required sections without inventing intent, or every criterion needs a write no plan may scope (`/pharn-spec` Step 4a)'."
- id: G4
  type: FINDING
  rule_id: P1
  severity: minor
  file: .dev/features/core-344-no-change-criteria/PLAN.md:121
  problem: "Verification is bytes and style only: nothing re-runs the CORE-310 intent through /pharn-spec to see whether the criterion is now moved, so the rule's effect is unmeasured."
  evidence: "'Evals to write (P1): None … the existing command budget and stage-load tests … and npm run check'."
```

### Grillers

- **testability** — presence recognized (`## Evals to write`, `## Guarantee audit` name the gates); the gap in it is G4.
- **architecture / coupling** — fit recognized: each rule has one owner under `pharn-contracts`, the commands cite it
  (P3/P4); no sibling reference, no shared mutable state.
- **comprehension** — rationale recognized: `## The failure` and `## Decisions` give why a spec-time check is not
  deterministic and why the guard is refused.
- **documentation** — the contracts are the documentation of the rule; CHANGELOG entry planned. No finding.
- **error-handling** — the failure path of the new rule is G2. No separate finding.
- **observability** — the scanner's line-21 hit is the word inside the CORE-310 narrative (test-stage outcome), not a
  runtime surface; a prose rule needs no telemetry. No finding.
- **a11y, i18n, migrations, performance, privacy, security** — the change adds no UI, user-facing locale text,
  schema, hot path, personal data or trust boundary. No finding.

## Summary

The plan's split is sound: a spec-time check would be a heuristic, so the rule is advisory with the existing
`ac-test-passes-before-build` floor behind it, and the guard decision is ruled with its bound stated. Two real gaps:
the unattended path needs the rule in Step 4a as well (G1, which amend mode reaches), and a terminal for "every
criterion holds" (G2), which should reuse Step 4a's thin-intent report — and then `/pharn-loop`'s S6 row should name
that cause (G3). G4 is a measurement follow-up, not this increment's.

ADVISORY VERDICT: 4 concerns raised (0 blocking-severity, 4 advisory) — for the human to weigh before /pharn-dev-build.
