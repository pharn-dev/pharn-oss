# GRILL — core-357-spec-constraints-measure

Plan `.dev/features/core-357-spec-constraints-measure/PLAN.md`. Spec hash: recomputed
`f058fca367fabcdfecf939dc70bfb43deaadedb1b0e810b790c4aeb156d6775d`, equal to the pin. Step 1b lessons declaration:
**GREEN** (`check-plan-lessons.mjs` exit 0; all 8 cited ids resolve and are referenced in the body).

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194044 B of griller files, 99396 B printed;
deep omission: 13 pharn-owned, 0 other; left out where present: guarantee-audit (13), machine-readable-emission (13),
two-layers (13), layer-1 (13), finding-output (13); kept whole: none

**Deviation (advisory):** the plan writes no product code (a measurement record, one evidence bundle, two ignore
entries, a CHANGELOG line), so the product grillers (a11y, i18n, migrations, observability, …) were applied by name
to the plan's surface rather than read in full; the questions below are the ones that bear on a measurement.

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`)

Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line; a scanner finding
is not the griller's judgment.

Findings: none (no secrets, PII or i18n scanner hit).

- `scan-plan-migrations`: mentions false. Not a finding: whether the plan needs or adequately declares this is the migrations griller's judgment.
- `scan-plan-observability`: mentions false. Not a finding: whether the plan needs or adequately declares this is the observability griller's judgment.

## Findings

### testability (P1)

```yaml
- type: FINDING
  rule_id: P1
  severity: important
  file: ".dev/features/core-357-spec-constraints-measure/PLAN.md"
  problem: "Answer 2 assumes the test stage ends in one of two states (green red run, or ac-test-passes-before-build). It can also stop on another closed reason (ac-test-not-collected, ac-level-unavailable, a type-error refusal new in 7.25.0) or the loop can stop before test (triage replan/spec). Pre-register: any other test-stage stop is quoted verbatim and answer 2 is 'no, for reason X'; a stop before the test stage leaves answers 2 and 3 unanswered and counts as void only if its cause is environmental."
  evidence: "answer 2 is the test stage's own result (lock `red_run` present and the loop not stopped with `ac-test-passes-before-build`"
```

### privacy / security (P2)

```yaml
- type: FINDING
  rule_id: P2
  severity: important
  file: ".dev/features/core-357-spec-constraints-measure/PLAN.md"
  problem: "Tree prep copies `.env.local` (secret-bearing) into the scratch tree. The plan names the scan for the bundle but not the selection rule. State that no `.env*` or `settings.local.json` file is ever selected into the bundle, that the copy is removed with the worktree, and record the scan counts."
  evidence: "copy pharn-app's `.claude/settings.local.json`, `.env.local`, ..."
```

### comprehension (P6)

```yaml
- type: FINDING
  rule_id: P6
  severity: minor
  file: ".dev/features/core-357-spec-constraints-measure/PLAN.md"
  problem: "The install leaves 37 PHARN files modified in the scratch tree, uncommitted. The loop snapshots the dirty tree (pharn-loop.md Step 4, pre-run-status.txt) and its close commits only its own changes, so this matches CORE-342's dirty-set precedent; but the record should state the tree was dirty with the install, and the evidence should keep pre-run-status.txt, so a reader can tell the install from the run's writes."
  evidence: "the install itself dirties the tree"
- type: FINDING
  rule_id: P6
  severity: minor
  file: ".dev/features/core-357-spec-constraints-measure/PLAN.md"
  problem: "If the rule fires, the loop runs on through build, regress and verify, where CORE-342's arm A runs hit the 540 s test-gate timeout under load. That cannot change answers 1-3 (they are fixed once the test stage reports), but it can push cost to the USD 8 budget. State that a later-stage stop or timeout is recorded and never voids the run for this question (the plan says so for the ceiling; say it for any later stop)."
  evidence: "If it passes, the loop runs on to its own stop, recorded but not a rule input."
```

## Verdict

Lessons declaration GREEN. Four advisory concerns, all foldable into the plan before the run; none blocks.
