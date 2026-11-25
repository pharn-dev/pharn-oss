# GRILL — core-371-floor-only

Plan: `.dev/features/core-371-floor-only/PLAN.md` · spec-hash: `8566b443…a9167` matches `pharn/ARCHITECTURE.md` (no
drift) · Step 1b lessons-declaration verdict (FLOOR, `check-plan-lessons.mjs` exit 0): GREEN — applied_lessons: L33,
L34, L43, L60, L75; all 5 cited ids resolve and are referenced in the plan body.

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194044 B of griller files, 99396 B printed;
deep omission: 13 pharn-owned, 0 other; left out where present: guarantee-audit (13), machine-readable-emission (13),
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

### Inline interrogation (P5 — determinism)

```yaml
- type: FINDING
  rule_id: P5
  severity: minor
  file: ".dev/features/core-371-floor-only/PLAN.md:75"
  problem: "The floor-script class matches any line holding `--floor-only`, so a future product floor script that only MENTIONS the flag in a comment would read as an invoker and demand the sentence be removed — a false RED in the safe direction."
  evidence: "every non-test `pharn/floor/*.mjs` file. … `floorOnlyInvokers(sources)` returning `where:line` for each line holding `--floor-only`."
```

Disposition suggested to the human: acceptable as planned (fail-closed toward re-reading the sentence, and the failure
message names the line), but build should say so in the test's comment so the next reader knows a mention counts.

### Inline interrogation (P0 — guarantee audit)

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/features/core-371-floor-only/PLAN.md:45"
  problem: "The in-suite controls splice a mutant into the real family text and a real brief, which proves the scanner flags a planted line, but not that floorOnlySources() itself still reaches every family part; the scratch-copy on-disk mutation is the only check of that, and it runs once."
  evidence: "an in-suite mutant (a `--floor-only` invocation spliced into the real `/pharn-loop` family text, and one into a rendered brief) must be flagged"
```

Disposition suggested: have one on-disk mutation in the scratch copy land in a PART file (e.g. `pharn-loop-quick.md`)
rather than the command file, so the measured RED also covers the family splice.

### Grillers

- testability: verification approach present (in-suite controls + a scratch-copy mutation run recorded in BUILD.md) —
  presence recognized; no finding.
- architecture / coupling: the test imports only `stage-agent-core.mjs` exports it already imports and the existing
  `command-family.mjs` helper; no new cross-module edge — fit recognized, clean seams recognized.
- comprehension: the one non-obvious choice (scan the literal flag, not a sentence form) carries its WHY (L33 line) —
  rationale recognized.
- documentation: no new public surface; the shipped change removes one sentence — no documentation needed.
- error-handling, performance, observability, migrations: a test-and-prose change with no runtime path, no persisted
  state and a bounded read of ~10 files — no concern warranted.
- a11y, i18n, privacy, security: no UI, no user-facing text, no personal data, no untrusted input; scanners clean — no
  concern warranted.

## Summary

The plan is small and matches live state: nothing passes `--floor-only` (re-checked this run against `ROUTE_POLICY`,
`INVOCATIONS`, the two orchestrator families and the floor scripts), so removing the closing sentence is right and
Step 4's "end your turn" already covers the direct call. The two concerns are about the new test's edges: a mention
counts as an invocation, and the family splice is measured only by the one-off scratch mutation.

ADVISORY VERDICT: 2 concerns raised (0 blocking-severity, 2 advisory) — for the human to weigh before /pharn-dev-build.
