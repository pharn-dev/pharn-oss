# GRILL — grill-finding-ids

`.dev/features/grill-finding-ids/PLAN.md` · spec hash: MATCH (`ab4dbd92…7fd`, `hash-doc.mjs` = the plan's pin) ·
lessons: GREEN (verified by `pharn/floor/check-plan-lessons.mjs`, exit 0 — 10 cited ids resolve in canon and are
referenced in the body)

**Out of order, stated:** this grill ran AFTER `/pharn-dev-build`, `/pharn-dev-regress`, `/pharn-dev-verify` and
`/pharn-dev-review` — the plan went straight from approval to build at the maintainer's request, and the grill was run
afterwards for the ship record. It interrogates the approved plan as written; where the build or review already
acted on a concern, the finding says so. Its findings therefore steered no build decision.

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194044 B of griller files, 99396 B printed;
deep omission: 13 pharn-owned, 0 other; left out where present: guarantee-audit (13), machine-readable-emission (13),
two-layers (13), layer-1 (13), finding-output (13); kept whole: none

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`)

Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line; a scanner finding
is not the griller's judgment.

Findings: none (no secrets, PII or i18n scanner hit).

- `scan-plan-migrations`: mentions false. Not a finding: whether the plan needs or adequately declares this is the migrations griller's judgment.
- `scan-plan-observability`: mentions true — lines 42 (logging), 102 (logging), 287 (logging). Not a finding: whether the plan needs or adequately declares this is the observability griller's judgment.

## Findings

### Inline — eval coverage (P1)

```yaml
- type: FINDING
  rule_id: "P1"
  severity: important
  file: ".dev/features/grill-finding-ids/PLAN.md:305"
  problem: "The plan promises a hygiene pin that pharn-grill.md Step 4 holds the render line before the GRILL.md write and the check line after it, and the build did not add it: .dev/floor/command-hygiene.test.mjs gained only the byte ceiling, so the three lines' ORDER is pinned by nothing (the loop grant test pins only their presence)."
  evidence: "Hygiene: the grant test covers the three new lines; a new pin that `pharn-grill.md` Step 4 holds the render line before the `GRILL.md` write and the check line after it."
```

### Inline — guarantee audit (P0)

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/grill-finding-ids/PLAN.md:159"
  problem: "The plan fixes the accepted shapes of rule_id, file and the free text from the contract alone and never measures them against what real grills emit, so it does not foresee that 27 of 161 real GRILL.md files (17%) hold a value the check refuses; review A1 measured this and the fix (per-code repair hints, the two shapes stated in pharn-grill.md) landed before this grill ran."
  evidence: "`rule_id` through `RULE_ID_OK` (guard first — L14, L82), `file` a clean `path:line`, `problem` and `evidence` non-empty single-line strings"
```

### comprehension griller (P7)

```yaml
- type: FINDING
  rule_id: "P7"
  severity: important
  file: ".dev/features/grill-finding-ids/PLAN.md:155"
  problem: "The plan sets four bounds (round at most 99, at most 500 findings, free text at most 2,000 characters, and in the CLI a 4 MiB input cap) with no stated reason, so the next maintainer cannot tell whether a real grill could exceed one or which may be raised freely."
  evidence: "`round` a positive integer ≤ 99. `findings` ≤ 500 elements, `[]` allowed."
```

### coupling griller (P3)

```yaml
- type: FINDING
  rule_id: "P3"
  severity: minor
  file: ".dev/features/grill-finding-ids/PLAN.md:118"
  problem: "The grill's validator imports its enum rules from merge-findings.mjs, /pharn-review's merge module, so a change made there for review reasons (say, a widened RULE_ID_OK) changes what a grill file may hold without touching any grill file; both rest on the one finding-shape contract, which makes the edge defensible, but the plan does not name the ripple."
  evidence: "`pharn/floor/merge-findings.mjs` exports `TYPE_ENUM` (`:226`), `SEVERITY_ENUM` (`:184`), `RULE_ID_OK` (`:240`)."
```

### Grillers with no finding

- **testability:** presence recognized (`## Evals / tests to write (P1)`, a per-test list); its one gap is the inline
  P1 finding above.
- **architecture:** fit recognized — core + CLI split, the shape in `pharn-contracts`, floor modules only.
- **error-handling:** presence recognized — every exit code mapped, a bounded repair round, a still-RED check recorded.
- **documentation:** presence recognized — a contract section and a guide section are declared.
- **security:** scanner clean; the trust audit covers the untrusted free text, its escaping and value-free refusals.
- **observability:** the three `logging` mentions are prose about the CHANGELOG and the cost ledger; the increment is a
  floor CLI whose outcome is its exit code, so no observability concern is warranted.
- **performance:** bounded — 500 findings, 4 MiB inputs, five scanner spawns per check.
- **privacy, i18n, migrations, a11y:** scanner clean / not applicable — no personal data, user-facing text, persisted
  schema or UI.

## Summary

The plan holds together: the one-source design (JSON → derived section, byte-checked) is sound, and its guarantee and
trust audits are labeled. Two concerns are about what the plan left to discipline: an ordering pin it promised and the
build skipped (fixable now, inside `## Files`), and accepted shapes chosen without measuring real grill output (already
fixed after review). The unexplained bounds and the cross-module enum import are smaller.

ADVISORY VERDICT: 4 concerns raised (0 blocking-severity, 3 important, 1 minor) — for the human to weigh; the build
already ran, so the open one (the ordering pin) is a fix before commit.
