# GRILL — test-infra-pin-all-gates

Plan: `.dev/features/test-infra-pin-all-gates/PLAN.md` · spec hash: `2c84959c…db12e`, matches live
`pharn/ARCHITECTURE.md` · Step 1b lessons declaration: **GREEN** (`check-plan-lessons.mjs` exit 0, L36 L37 L52 L64
L65 L75 resolve and are referenced in the body).

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194015 B of griller files, 99391 B printed;
deep omission: 13 pharn-owned, 0 other; left out where present: guarantee-audit (13), machine-readable-emission (13),
two-layers (13), layer-1 (13), finding-output (13); kept whole: none

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`)

Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line; a scanner finding
is not the griller's judgment.

Findings: none (no secrets, PII or i18n scanner hit).

- `scan-plan-migrations`: mentions true — lines 80 (migration), 107 (migration). Not a finding: whether the plan needs or adequately declares this is the migrations griller's judgment.
- `scan-plan-observability`: mentions false. Not a finding: whether the plan needs or adequately declares this is the observability griller's judgment.

## Findings (advisory — none gates `/pharn-dev-build`)

### testability (P1)

```yaml
- type: FINDING
  rule_id: P1
  severity: important
  file: ".dev/features/test-infra-pin-all-gates/PLAN.md:29"
  problem: "No test ties the pinned gate set to the set the gate runner actually runs; the plan's tests enumerate ALLOWLIST but never assert ids(gates) ∪ ids(other_gates) == discoverGates(scripts) ids, so a later ALLOWLIST or discovery change could leave a run gate unpinned with every listed test green (L36 closure)."
  evidence: "`other_gates` — `{id, script, pre, post}` for every `ALLOWLIST` id `package.json` HAS that is not a candidate level gate"
```

### documentation (P7)

```yaml
- type: FINDING
  rule_id: P7
  severity: important
  file: ".dev/features/test-infra-pin-all-gates/PLAN.md:81"
  problem: "The approved Q3 answer (a build that ADDS or changes any allowlisted gate script reads test-infra-changed) must reach a planner in pharn-test.md and pharn-plan.md, and the CHANGELOG needs an explicit upgrade note for in-flight features; pharn-test.md has ~390 bytes under its 20480 ceiling, so the plan should declare the ceiling table (.dev/floor/command-hygiene.test.mjs) in case the documented raise rule is needed."
  evidence: "`.claude/commands/pharn-test.md` — Step 4 sentence: what the pin covers (within its byte ceiling)"
```

### security (P2)

```yaml
- type: FINDING
  rule_id: P2
  severity: important
  file: ".dev/features/test-infra-pin-all-gates/PLAN.md:120"
  problem: "Detection-after-execution is stated, but the bound sentence should name every run before verify's AC gate — /pharn-build's own build gate (6.39.0, discovered gates minus e2e), every /pharn-loop iteration's build gate, regress's head side and verify itself — so no restatement reads as 'the attacker command never runs'; prevention stays a named follow-up."
  evidence: "**DETECTED at verify, never PREVENTED**: by then the changed command has already run (build gate, regress head side, verify itself)."
```

### error-handling (P7)

```yaml
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/test-infra-pin-all-gates/PLAN.md:31"
  problem: "Widening the pin widens its refusal surface: a non-string or over-long non-level script, or a chain from `build`/`lint` deeper than 8 hops, now makes `--write` exit 2 where 6.65 pinned fine; the plan should test one such refusal and add it to pharn-test.md's / the contract's refusal list."
  evidence: "Read with the existing `valuesOf` (own-property, string, ≤ MAX_SCRIPT — a refusal otherwise)."
```

## Griller notes (no finding)

- architecture / coupling: the change stays inside `test-infra-core.mjs` (the one pin definition) and its existing
  consumers; no new module, no sibling reach — fit recognized; clean seams.
- migrations: the lock schema is a persisted shape; the plan declares the forward change (`/6`), reading of every old
  schema, the old-lock verdict (`unpinned`) and the rollback reading (`lock-unusable` on a pre-6.66 floor) — present
  and adequate.
- observability, performance, privacy, a11y, i18n, comprehension: no runtime service, no scale surface, no PII, no UI,
  no user-facing strings; the one non-obvious decision (no named files for non-level gates) carries its WHY.

## Summary

The plan is narrow and its old-lock decision is explicit. The gaps are a missing closure test between the pinned and
the run gate sets, the planner-visible wording the GATE-1 answers require (with a possible ceiling raise), naming
every pre-verify run in the detection bound, and the new refusal surface.

ADVISORY VERDICT: 4 concerns raised (0 blocking-severity, 4 advisory) — for the human to weigh before /pharn-dev-build
