# GRILL — setter-dropped-bullets

Plan: `.dev/features/setter-dropped-bullets/PLAN.md` · spec-hash check: MATCH
(`f058fca367fabcdfecf939dc70bfb43deaadedb1b0e810b790c4aeb156d6775d`, `node .dev/floor/hash-doc.mjs pharn/ARCHITECTURE.md`)
· Step 1b lessons-declaration verdict (FLOOR): **GREEN** — `applied_lessons: L20, L29, L37, L46, L68, L71, L75`, all 7
cited ids resolve in `.dev/memory-bank/lessons-learned.md` and are referenced in the plan body.

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194044 B of griller files, 99396 B printed;
deep omission: 13 pharn-owned, 0 other; left out where present: guarantee-audit (13), machine-readable-emission (13),
two-layers (13), layer-1 (13), finding-output (13); kept whole: none

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`)

Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line; a scanner finding
is not the griller's judgment.

Findings: none (no secrets, PII or i18n scanner hit).

- `scan-plan-migrations`: mentions false. Not a finding: whether the plan needs or adequately declares this is the
  migrations griller's judgment.
- `scan-plan-observability`: mentions false. Not a finding: whether the plan needs or adequately declares this is the
  observability griller's judgment.

## Findings

### Inline — guarantee audit (P0) and the L74 shape

```yaml
- type: FINDING
  rule_id: P0
  severity: important
  file: ".dev/features/setter-dropped-bullets/PLAN.md:23"
  problem: "The plan-time measurement of which committed PLANs refuse used plan-files-core.mjs's copy of isConcrete, not the setter, so it inherits the predicate it is measuring (L74); the build must re-measure with the patched setter itself."
  evidence: "runs it over all 349 committed PLANs (measured at plan time: 18 refuse, 331 unchanged)"
```

### Inline — trust (P2)

```yaml
- type: FINDING
  rule_id: P2
  severity: minor
  file: ".dev/features/setter-dropped-bullets/PLAN.md:172"
  problem: "The refusal prints every non-concrete item whole; an item is bounded only by the plan's own size, so a very long one makes a very long message (other floor messages cut an entry to 80 characters)."
  evidence: "the refusal prints it through `JSON.stringify` (this check runs before the"
```

### Inline — scope honesty (P7)

```yaml
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/setter-dropped-bullets/PLAN.md:127"
  problem: "The `docs/capabilities/**` item the 16 historical plans carried was habit, not instruction (no guide, command or CONTRIBUTING line tells a planner to list it: grep of CLAUDE.md, CONTRIBUTING.md, .dev/guides, .claude/commands, pharn-contracts, docs), so no guide needs a change; the CHANGELOG should still tell a contributor what to write instead."
  evidence: "The 18 committed historical PLANs — never re-run."
```

### Griller axes

- **testability (P1):** presence recognized (`## Files` names the hook tests and the adjusted floor tests, and the
  guarantee audit maps each claim). Layer 2: adequate — the refusal is exercised in both modes, for each reason, with
  the record left byte-equal; the inline P0 finding above covers the one measurement that needs the real setter.
- **error-handling (P7):** the change IS error handling (a refusal with a remedy line); the existing empty-scope
  refusal stays reachable and is pinned. No finding.
- **security (P2):** scanner clean; the one trust concern is the inline P2 finding above. Removing a silent
  under-grant does not widen any scope: every path the setter accepted before it still accepts or refuses, never
  accepts more. No further finding.
- **architecture / coupling (P3):** the refusal lives in the setter, the canonical `## Files` reader; the parity copy
  (`plan-files-core.mjs`) is unchanged and still returns the non-concrete items to its consumers
  (`check-build-complete.mjs` `skipped[]`, `check-regress.mjs` `unenforced_globs`), whose parity tests are adjusted,
  not their logic. No finding.
- **comprehension / documentation:** the setter header, both plan commands, the writes-scope guide and the
  `ac-tests.md` sentence carry the new behaviour, and the sweep lists every hit. No finding.
- **a11y, i18n, migrations, observability, performance, privacy:** the change touches no UI, user-facing locale
  text, schema, production telemetry, hot path or personal data. No finding.

## Summary

The plan is narrow and its decision is recorded with the GATE 1 answer. Three concerns: the plan-time count of
refused committed PLANs borrowed the predicate it measures, so the build re-runs it with the patched setter (P0, L74);
the message is unbounded for a pathologically long item (P2, minor — every item is the plan author's own text and a
long one is visible in the plan anyway); and the CHANGELOG should say what replaces the habitual
`docs/capabilities/**` item (P7, minor).

ADVISORY VERDICT: 3 concerns raised (0 blocking-severity, 1 important, 2 minor) — for the human to weigh before
/pharn-dev-build. The Step 1b lessons-declaration result is reported in the header as its own floor verdict.
