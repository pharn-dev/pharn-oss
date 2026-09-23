# GRILL — cost-ledger-compact-rows

**Header.**

- Plan: `.dev/features/cost-ledger-compact-rows/PLAN.md`.
- Spec-hash check: **MATCH** (`edc3d07d…5d2c`).
- **Step 1b lessons-declaration verdict (FLOOR): GREEN.** `check-plan-lessons.mjs` exited 0, and all 8
  cited ids (L23, L24, L29, L34, L35, L41, L47, L50) resolve and are referenced in the plan body. This
  covers the declaration only.

Grillers discovered: 13 (`count-grillers.mjs`). Plan scanners:

- `scan-plan-secrets`: `{"found":false}`
- `scan-plan-pii`: `{"found":false}`
- `scan-plan-i18n`: `{"found":false}`
- `scan-plan-migrations`: `{"mentions":false}`
- `scan-plan-observability`: `{"mentions":true}` on lines 147 and 154, both for the term `spans`. Both
  mean "a JSON row spans several lines", not tracing spans. That is a vocabulary hit, not an observability
  concern, and it raises no finding.

Applied inline: testability, architecture, migrations, documentation and security. The other eight had
nothing to act on. No UI, no user data, no network, no i18n surface.

## Findings

```yaml
- type: FINDING
  rule_id: P0
  severity: important
  file: ".dev/features/cost-ledger-compact-rows/PLAN.md:173"
  problem: "The trust audit says JSON.stringify escapes every control character, so no raw newline can split a row. That is true for C0 characters, including \\n, but a probe run this stage shows JSON.stringify leaves U+2028, U+2029 and U+0085 RAW. cleanScalar admits them, since it rejects only code points below 0x20 and 0x7F, so an identity field or a marker's stage can carry one into a row. The \\n-delimited claim still holds, but an editor or a diff viewer may render those characters as line breaks. The contract and the test must say 'one element per \\n-delimited line', and a test should pin a U+2028-bearing row."
  evidence: "`JSON.stringify` escapes every control character, so a transcript-sourced string cannot inject a raw newline"
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/cost-ledger-compact-rows/PLAN.md:186"
  problem: "The migration side is unstated. A ledger committed before this change stays pretty-printed. The first time a later run re-emits cost.json for the same feature (a new /pharn-loop or /pharn-ship over it), the diff rewrites the whole file once, so the line savings arrive only from the next emission onward. The CHANGELOG entry should say so."
  evidence: "**A user project's own formatter** re-expanding `cost.json`."
- type: FINDING
  rule_id: P3
  severity: minor
  file: ".dev/features/cost-ledger-compact-rows/PLAN.md:64"
  problem: "render-cost-ledger.mjs now carries derivation, the screen table, and the on-disk serialization. The serializer is the file's writing half, so it is arguably the same axis ('what the emitter emits'). A separate module would add a floor file with no second consumer (P7). This is recorded as considered, not as a defect."
  evidence: 'add `ROW_ARRAYS` (`["markers", "requests"]`) and `serializeLedger(ledger)`'
```

## Summary

- **Testability.** Parse-equality over an enumerated shape set, a closure-style shape assertion, byte
  determinism, and both CLI output paths (L41) are the right set. The mutation control, where the old
  serialization must fail the shape assertion, keeps the shape test from being vacuous.
- **Architecture.** P3 is noted in F3 and accepted. There is no sibling import: the run-report reader is
  imported only by the test.
- **Migrations.** There is no schema change, so nothing needs migrating for parsing. F2 notes the one-time
  layout rewrite at the next emission.
- **Documentation.** The plan sweeps all three restatements of the size claim by referent (L50) and retires
  one (L35). The CHANGELOG entry is planned.
- **Security.** F1 is the one real edge: the row-per-line property is about `\n`, and three Unicode
  line-breaking characters pass through `JSON.stringify` raw.

ADVISORY VERDICT: 3 concerns raised (0 blocking-severity, 3 advisory: 1 important, 2 minor), for the human
to weigh before /pharn-dev-build.
