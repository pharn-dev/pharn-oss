# GRILL — inline-fallback-stop

Plan `.dev/features/inline-fallback-stop/PLAN.md` · spec hash: matches (`d19c3ae5…8bcf`) · Step 1b lessons
declaration: **GREEN** (`check-plan-lessons.mjs` exit 0 — L1, L27, L34, L50, L51, L75 resolve and are referenced; the
checker verifies the declaration, never the application).

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194044 B of griller files, 99396 B printed; deep
omission: 13 pharn-owned, 0 other; left out where present: guarantee-audit (13), machine-readable-emission (13),
two-layers (13), layer-1 (13), finding-output (13); kept whole: none

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`)

Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line; a scanner finding is
not the griller's judgment.

Findings: none (no secrets, PII or i18n scanner hit).

- `scan-plan-migrations`: mentions true — lines 126 (revert), 205 (revert). Not a finding: whether the plan needs or
  adequately declares this is the migrations griller's judgment.
- `scan-plan-observability`: mentions false. Not a finding: whether the plan needs or adequately declares this is the
  observability griller's judgment.

## Findings

### Inline interrogation — guarantee audit (P0)

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/features/inline-fallback-stop/PLAN.md:134"
  problem: "The guarantee audit labels the ignored flag 'floor: the CLI's tested decision'; a test is not one of the three primitives, so the line should name the reduction (a membership test over argv) and keep 'tested' as evidence, not as the primitive."
  evidence: '"`start` ignores the flag" → floor: the CLI''s tested decision (the flag no longer reaches `decideStart`).'
```

### error-handling griller

```yaml
- type: FINDING
  rule_id: P7
  severity: important
  file: ".dev/features/inline-fallback-stop/PLAN.md:123"
  problem: "Between merge and the maintainer's observation, an installed project whose main-session wait fails would stop S9b at its first routed stage (the 6.73.2 failure) with no inline fallback left; the plan states the revert condition for the observation but not what such a user does meanwhile."
  evidence: "not met by this increment: pending the maintainer's observation."
```

Remedy offered for the human (advisory): name the user-side recovery in the CHANGELOG entry (S9b's existing remedy
already applies: stop the agent, set its work aside, re-run), and say in the PR body that running the kit before the
merge is the cheaper order.

### Other grillers — no finding (reasons)

- **architecture / coupling (P3):** fits. The change edits the one module that owns each fact (`stage-agent.mjs` the
  CLI, `stage-agent-core.mjs` the reasons and residuals, `route-token-core.mjs` the grammar); no new cross-module
  reference, no new shared state.
- **comprehension:** the non-obvious choice (accept and ignore instead of refuse) carries its WHY in Design 2 and the
  Q1 resolution, including its bound (an edited 6.73.2 command file).
- **documentation:** the changed surface's docs are named (`floor-orchestration.md`, CHANGELOG, the CLI header).
- **migrations:** no persisted shape changes; the retired token stays in the grammar, so markers and ledgers written
  before still validate (criterion 3 pins it). The scanner's two hits are the word "revert" in the PR-body condition.
- **testability (P1):** a verification approach is present (`## Acceptance criteria`, the tests named in Design 5).
  Criterion 2's two pins predate this change and were green before it, so they do not discriminate it; the new item-2
  clause pin and the family-wide absence pin are the change-specific ones (noted, not a finding: the plan says so).
- **security (P2):** scanner clean; no new input, the stderr note is a fixed string.
- **a11y, i18n, privacy, performance, observability:** the change touches no UI, user text in a locale, personal
  data, scaling path or production telemetry.

## Summary

The plan's scope is narrow and its sweep lists a disposition per hit. Two concerns: a guarantee-audit wording that
names a test as a primitive (minor), and the window between merge and the main-session observation, during which an
install has no inline fallback if the wait fails there (important).

ADVISORY VERDICT: 2 concerns raised (0 blocking-severity, 2 advisory: 1 important, 1 minor) — for the human to weigh
before /pharn-dev-build.
