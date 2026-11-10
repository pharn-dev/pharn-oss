# GRILL — loop-grill-triage

`.dev/features/loop-grill-triage/PLAN.md` · spec hash: MATCH (`afa7dd52…bf7f`, `hash-doc.mjs` = the plan's pin) ·
lessons: GREEN (verified by `pharn/floor/check-plan-lessons.mjs`, exit 0 — 18 cited ids resolve in canon and are
referenced in the plan body)

**Out of order, stated:** this grill ran AFTER `/pharn-dev-build`, `/pharn-dev-regress`, `/pharn-dev-verify` and
`/pharn-dev-review` (with its four fixes) — the plan went from approval to build at the maintainer's request, and the
grill ran afterwards for the ship record, as part 1's did. It interrogates the plan as written (with its three
recorded amendments); where the build, regress or review already acted on a concern, the finding says so. Its findings
therefore steered no build decision.

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194044 B of griller files, 99396 B printed;
deep omission: 13 pharn-owned, 0 other; left out where present: guarantee-audit (13), machine-readable-emission (13),
two-layers (13), layer-1 (13), finding-output (13); kept whole: none

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`)

Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line; a scanner finding
is not the griller's judgment.

Findings: none (no secrets, PII or i18n scanner hit).

- `scan-plan-migrations`: mentions true — lines 120 (revert). Not a finding: whether the plan needs or adequately declares this is the migrations griller's judgment.
- `scan-plan-observability`: mentions true — lines 115 (observability), 286 (observability), 287 (telemetry). Not a finding: whether the plan needs or adequately declares this is the observability griller's judgment.

## Findings

### Inline — guarantee audit (P0)

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/loop-grill-triage/PLAN.md:164"
  problem: "The plan states as fact that every caller of the changed literal or the seven-stage list 'is found by the probe run', but the probe applied the routing change only and so could not see a test pinned on the loop's text; two entry-gates.test.mjs pins anchored on the removed grill marker line turned regress RED, and the file joined ## Files at regress."
  evidence: "every caller that tests that literal or the seven-stage list is found by the probe run, not by memory, and listed in `## Files`."
```

```yaml
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/features/loop-grill-triage/PLAN.md:30"
  problem: "Resolving triage through default makes pharn-triage.md the first shipped command no config key names, so in an install whose kept models block sets a default other than sonnet/high, check-model-config.mjs agreement reports that command's frontmatter as disagreeing; routing is unaffected (it calls resolve and validate only), and neither the plan nor the CHANGELOG states the cost."
  evidence: "resolve through `models.stages.default` (no `triage` key in the shipped `pharn.config.json`); `pharn-triage.md` frontmatter `model: sonnet`, `effort: high` to agree with this repo's `default`."
```

### Inline — eval coverage (P1)

```yaml
- type: FINDING
  rule_id: "P1"
  severity: important
  file: ".dev/features/loop-grill-triage/PLAN.md:159"
  problem: "L67 is applied to the grill side only: Q3 measured real grills against grill-findings.mjs check, but the triage side's producer, a model writing grill-triage.json, was never run against grill-triage.mjs check before the loop gates on it (a RED is S9); a fixture written by the checker's author is the shape L67 warns about."
  evidence: "Q3's measurement for the grill side, and the build's realistic CLI test for the triage side."
```

### comprehension griller (P7)

```yaml
- type: FINDING
  rule_id: "P7"
  severity: important
  file: ".dev/features/loop-grill-triage/PLAN.md:245"
  problem: "S16's remedy is 'a person revises the plan or the SPEC, then re-runs', but the plan never says what a re-run is: the blocked stop reverts the model-approved SPEC to Draft and leaves the feature directory (S2's case), so the next maintainer cannot tell whether a re-run repeats the spec and plan stages or how a revised plan is carried in."
  evidence: "**S16** (`blocked: grill-escalation`): copy the verdict and the `escalated` ids into `### next_steps` as DATA and point at `grill-triage.json` for the reasons"
```

### Grillers with no finding

- **architecture:** fit recognized — a contract in `pharn-contracts`, a pure core plus a CLI in the floor, the shared
  reader factored into one module at review (A4); the stage joins the one routing table every rule iterates.
- **coupling:** the triage validator imports the findings validator and `repeatedKeyCount` from
  `grill-findings-core.mjs` (one owner per shape, the same layer); the ship columns' `skipped` triage cells are the
  totality rule's cost, not an entanglement.
- **testability:** presence recognized (`## Evals / tests to write (P1)`, per-test); its gaps are the inline P1 finding
  above and review A1, which added the promised `writes:` pin.
- **error-handling:** presence recognized — every exit code of both new reads is mapped (S9, S16, S9b); a triage that
  writes nothing or a half-written file is a RED check, S9.
- **documentation:** presence recognized — the new contract, two guide sections, the CHANGELOG and the README rows.
- **security:** scanner clean; the trust audit names the steering residual (THREAT-MODEL §5 channel 6) and the checker
  never prints a reason.
- **observability:** the mention lines are the plan's prose about the observability griller and a SPEC revert; the
  stop is recorded in `LOOP.md` and the routed stages leave stage markers, so no further concern is warranted.
- **performance:** bounded — at most 500 findings and dispositions, 4 MiB inputs; the cost is the added agents, stated
  (the triage agent's time unmeasured — review A3).
- **migrations:** "revert" is the SPEC's Draft revert, not a schema change — not applicable.
- **privacy, i18n, a11y:** scanner clean / not applicable — no personal data, user-facing text or UI.

## Summary

The plan holds together: the triage file is bound to the findings by content hash, coverage is closed both ways, the
verdict is computed by code, and the only path past a `replan` or `spec` is a person. Its weak points are claims about
its own completeness: the probe could not have found a text pin (which regress then hit), and L67 was applied to one
of the two model producers. A blocked run's next step is unstated, and the default-model choice carries an unstated
agreement cost for customized installs.

ADVISORY VERDICT: 4 concerns raised (0 blocking-severity, 3 important, 1 minor) — for the human to weigh; the build
already ran, so the open ones are follow-ups (the triage measurement before part 2b gates on more, the re-run note, the
agreement cost line).
