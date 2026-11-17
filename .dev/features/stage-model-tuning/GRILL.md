# GRILL — stage-model-tuning

Plan: `.dev/features/stage-model-tuning/PLAN.md` · spec hash: matches the pin
(`f058fca367fabcdfecf939dc70bfb43deaadedb1b0e810b790c4aeb156d6775d`) · Step 1b lessons declaration: **GREEN** —
`applied_lessons: L4, L34, L36, L41, L43, L62, L66, L67, L84`; all 9 cited ids resolve and are referenced in the plan
body (the checker verifies the declaration, never the application).

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194044 B of griller files, 99396 B printed; deep
omission: 13 pharn-owned, 0 other; left out where present: guarantee-audit (13), machine-readable-emission (13),
two-layers (13), layer-1 (13), finding-output (13); kept whole: none

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`)

Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line; a scanner finding is
not the griller's judgment.

Findings: none (no secrets, PII or i18n scanner hit).

- `scan-plan-migrations`: mentions false. Not a finding: whether the plan needs or adequately declares this is the
  migrations griller's judgment.
- `scan-plan-observability`: mentions false. Not a finding: whether the plan needs or adequately declares this is the
  observability griller's judgment.

## Findings

### Inline — guarantee audit, determinism, trust

```yaml
- type: FINDING
  rule_id: P2
  severity: important
  file: ".dev/features/stage-model-tuning/PLAN.md:125"
  problem: >-
    The kit would execute the ARM's own copy of check-model-config.mjs inside each run project, so building a kit runs
    code from whatever checkout --arm names; until now the kit only copied the arm's bytes and ran git.
  evidence: "own `node pharn/floor/check-model-config.mjs agreement` in it."
```

```yaml
- type: FINDING
  rule_id: P0
  severity: important
  file: ".dev/features/stage-model-tuning/PLAN.md:22"
  problem: >-
    The control runs (CORE-90's kit, run first) and the variant runs (run later) are not interleaved or randomized, so
    a drift between the two windows (a Claude Code update, a served-model change behind an alias, service load) is
    confounded with the varied factor; E1 randomizes A/B order per task for this reason, and the plan names no bound.
  evidence: "Run order: `plan-sonnet` + `control-spec` first (about USD 54), `grill-sonnet` second"
```

```yaml
- type: FINDING
  rule_id: P5
  severity: minor
  file: ".dev/features/stage-model-tuning/PLAN.md:154"
  problem: >-
    One lost catch makes an arm `does-not-support` even when the control itself catches a probe only some of the time;
    the rule is strict on purpose (any loss is a visible regression), but the record should say so, so that a reader
    does not read the reading as a statistical test.
  evidence: "4. `does-not-support` / `catch-lost` — at least one complete pair lost a catch;"
```

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/features/stage-model-tuning/PLAN.md:155"
  problem: >-
    `no-saving` compares chain USD, which for the plan arm includes the unchanged opus grill whose cost depends on the
    plan the variant wrote; the per-stage figures are printed too, but the plan does not say which one the record
    leads with.
  evidence: "5. `does-not-support` / `no-saving` — variant chain USD is not below control chain USD;"
```

### error-handling griller

```yaml
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/stage-model-tuning/PLAN.md:140"
  problem: >-
    A run directory that holds the run files but no session file at all (a session refused before it started, or a
    chain aborted by `&&` after a failed first stage) is silently an incomplete pair; the plan should say the summary
    counts incomplete pairs per side, so a kit that lost most sessions is visible without reading every row.
  evidence: "A pair is complete when both sides have every stage's session valid."
```

### testability griller

No absence finding: a verification approach is present (`## Evals to write (P1)` lists the kit and reader cases,
including the real-arm agreement test and the reading/reason iteration). Layer 2: the condition the orchestrator added
at GATE 1 (control sessions passed as the variant must read `arm-not-applied`) is in the resolved questions but not in
the eval list; it should be a named case.

```yaml
- type: FINDING
  rule_id: P1
  severity: minor
  file: ".dev/features/stage-model-tuning/PLAN.md:233"
  problem: >-
    The eval list does not name the GATE 1 case "control run files passed as the variant with --expect-variant
    grill=sonnet read cannot-decide / arm-not-applied", which is the test that the served-model check cannot be
    satisfied by the control arm's own sessions.
  evidence: "reader: every reading and reason code is produced (iterated over the frozen sets); pairing order across two"
```

### Other grillers

- architecture, coupling: fit recognized — `.dev/floor` → `pharn/floor` cores only, the reader reuses the scorer and the
  kit's stage table rather than restating them; no sibling reach, no product file.
- comprehension, documentation: present — the README, the guide section and the record are in `## Files`.
- security: no new input surface beyond the session files, which the trust audit bounds (numbers and regex-checked
  model ids only); the one execution concern is the inline P2 finding above.
- performance: the real-arm kit test copies about 600 files once; acceptable for a hermetic suite if kept to one probe
  and one run.
- a11y, i18n, migrations, observability, privacy: not applicable (no UI, no user text, no schema, no service, no
  personal data) — no finding.

## Summary

The plan's core is sound and its main discovery (a `--model` flag the command frontmatter overrides) is the reason the
increment exists. The concerns: the kit should not execute the arm's code to check agreement (use this repository's
checker with `--config` / `--commands-dir` pointed at the project); the record must name the non-randomized,
sequential arm order as a confound and the strictness of the one-loss rule; the summary should count incomplete pairs;
the GATE 1 `arm-not-applied` case should be a named test; and the record should lead with chain USD and show per-stage
USD beside it.

ADVISORY VERDICT: 6 concerns raised (0 blocking-severity, 2 important, 4 minor) — for the human to weigh before
/pharn-dev-build. The Step 1b lessons-declaration verdict above is a separate floor result and is not counted here.
