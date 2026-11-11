# GRILL — loop-amend-spec

Plan: `.dev/features/loop-amend-spec/PLAN.md` · spec-hash: matches (`14e5e084…`, `hash-doc.mjs`) — run BEFORE the
human trusted-doc commit for 7.10.0, so the plan re-pins after that commit and `/pharn-dev-build` re-checks the new pin
· lessons declaration: GREEN (`check-plan-lessons.mjs` exit 0: 11 ids resolve and are referenced in the body).

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194044 B of griller files, 99396 B printed;
deep omission: 13 pharn-owned, 0 other; left out where present: guarantee-audit (13), machine-readable-emission (13),
two-layers (13), layer-1 (13), finding-output (13); kept whole: none

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`)

Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line; a scanner finding is not
the griller's judgment.

Findings: none (no secrets, PII or i18n scanner hit).

- `scan-plan-migrations`: mentions false. Not a finding: whether the plan needs or adequately declares this is the
  migrations griller's judgment.
- `scan-plan-observability`: mentions false. Not a finding: whether the plan needs or adequately declares this is the
  observability griller's judgment.

## Findings

### Interrogation — P5 (which row a failed re-run spec stage stops at)

```yaml
- type: FINDING
  rule_id: P5
  severity: important
  file: ".dev/features/loop-amend-spec/PLAN.md:115"
  problem: "Step 3's spec lines carry their own stop rows (a thin-intent report-back is S6, a clarification marker S6b, a red `check-spec-approved.mjs` S9); the plan re-runs those lines on an amend but says only that 'anything else' after `begin` is S18, so a failure inside the re-run spec stage has two candidate rows."
  evidence: "`0` → run Step 3's routed spec lines again (start, brief, finish, `check-spec-approved.mjs`), then `node pharn/floor/spec-amend.mjs check '<name>'`. … Anything else → **S18**"
```

Read live: `pharn-loop.md:651-686` (Step 3's lines and their S6 / S6b / S9 branches). Naming every non-zero exit in the
amend branch (`begin`, the spec stage's `finish` read, `check-spec-approved.mjs`, `spec-amend.mjs check`) as S18, and
saying so in the S18 row, gives each exit one row and keeps the stop naming the amend. The entry-gates peek stays out of
the re-run, as the plan's list already implies.

### Interrogation — P0 / L65 (what the `.a1` hygiene pin covers)

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/features/loop-amend-spec/PLAN.md:63"
  problem: "The L65 line says a hygiene pin holds that 'no command names an `.a1` name', but amend mode reads `SUPERVISOR.a1.json` and `grill-findings.a1.json` and the loop record points at `SPEC.a1.md`; the pin the Files list names is over `writes:` only, and the applied-lessons line should say so."
  evidence: "(`writes:` unchanged, and a hygiene pin that no command names an `.a1` name)"
```

### error-handling (P6)

```yaml
- type: FINDING
  rule_id: P6
  severity: minor
  file: ".dev/features/loop-amend-spec/PLAN.md:90"
  problem: "`begin` copies `SPEC.md` to `SPEC.a1.md` before the renames; the rollback should remove that copy too, or a failed `begin` leaves `SPEC.a1.md` behind, after which `status` reads `pending` and every later supervisor decision is refused `amend-used`."
  evidence: "checking every source and destination first and moving back on a failed rename (`rename-failed` / `rename-partial`)"
```

### testability (P1)

Presence recognized: `## Evals / tests to write` names tests for every new CLI subcommand and every refusal code the
amend check has.

```yaml
- type: FINDING
  rule_id: P1
  severity: minor
  file: ".dev/features/loop-amend-spec/PLAN.md:217"
  problem: "`status` has a RED path (a link, or a partial `.a1` set) and `begin` has `supervisor-invalid` and `partial-archive`, but the test list names only `status`'s three green tokens and `begin`'s amend-used / not-amend-spec / link / rename refusals."
  evidence: "`begin` moves 6 files after a round-1 `spec` escalation and 14 at the cap; `status` goes `none` → `pending` → `applied`."
```

### The other grillers

architecture, coupling: no finding. The new CLI follows the `grill-round` / `supervisor` shape (a pure core and a thin
CLI, the contract in `pharn-contracts`), and its archive list is derived in code like `ARCHIVE_NAMES`. comprehension,
documentation: the contract section, the floor-checks section and the trusted-doc text cover the new surface. security:
the added criteria are model text from untrusted findings; the plan sends only AC ids to the commit and fences criterion
lines in `RUN-REPORT.md`, and the residual is in the trusted-doc text. a11y, i18n, migrations, observability,
performance, privacy: no UI, user data, schema or hot path is added.

Checked and not a finding: a second `pharn-spec` stage execution is an ordinary ledger shape (`stage-executions-core.mjs`
numbers rows sharing a stage, as the re-plan rounds' repeated plan and grill stages already do), and `SUPERVISOR.json`'s
`risks[].id` names the escalated findings amend mode reads (`supervisor-core.mjs:7`).

## Summary

The plan reuses the round-archive and supervisor patterns and keeps the amend's checks on byte equality against an
archive the run writes. One concern matters before the build: the amend branch re-runs Step 3's spec lines, which
already have their own stop rows, so the plan should say that every failure there is S18. The other three are small
(the L65 wording, removing the copy on rollback, two untested refusal paths), each fixable in the build without new
files.

ADVISORY VERDICT: 4 concerns raised (0 blocking-severity, 1 important, 3 minor) — for the human to weigh before
/pharn-dev-build.
