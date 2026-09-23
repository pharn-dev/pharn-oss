# GRILL — cost-ledger-verify-tail

**Header.**

- Plan: `.dev/features/cost-ledger-verify-tail/PLAN.md`.
- Spec-hash check: **MATCH** (`edc3d07d…5d2c`).
- **Step 1b lessons-declaration verdict (FLOOR): GREEN.** `check-plan-lessons.mjs` exited 0, and all 5
  cited ids (L29, L34, L37, L42, L43) resolve and are referenced in the plan body. This covers the
  declaration only. It never says whether the lessons were applied.

Grillers discovered: 13 (`count-grillers.mjs`). The deterministic plan scanners were run over the plan, and
none of them reported anything:

- `scan-plan-secrets`: `{"found":false}`
- `scan-plan-pii`: `{"found":false}`
- `scan-plan-i18n`: `{"found":false}`
- `scan-plan-migrations`: `{"mentions":false}`
- `scan-plan-observability`: `{"mentions":false}`

Applied inline: testability, error-handling, documentation, migrations and architecture. The other eight
(a11y, comprehension, coupling, i18n, observability, performance, privacy, security) raised nothing. The
change is one comparison in a checker, one counter in an emitter and one predicate in a pure core. It
touches no UI, no network, no emitted byte and no user data.

## Findings

```yaml
- type: FINDING
  rule_id: P5
  severity: minor
  file: ".dev/features/cost-ledger-verify-tail/PLAN.md:102"
  problem: "The continuation WARN will fire on practically every manual --verify-transcript run, not only on long-continued sessions: the Bash call that invokes the checker is itself a request appended after the emission. A WARN that always fires is weak signal."
  evidence: "when the range was used (`recorded !== live`), one WARN"
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/features/cost-ledger-verify-tail/PLAN.md:161"
  problem: "The 'stable before-window part' also rests on dedup being first-occurrence over transcriptFiles() order. A transcript file created after emission that sorts before an existing one and repeats an already-counted requestId could move one count between the two parts. Not observed; the plan's advisory label covers the append-only assumption but does not name this variant."
  evidence: '"the before-window part never changes after emission" → **advisory**, because it rests on the transcript being append-only'
- type: FINDING
  rule_id: P7
  severity: important
  file: ".dev/features/cost-ledger-verify-tail/PLAN.md:69"
  problem: "The CHANGELOG entry is the only record a downstream user reads. It should say that ledgers ALREADY committed by 6.12.x/6.13.0 need no re-emission: they verify under the new rule unchanged, while their transcripts exist. The pharn-starter repo holds 14 such files."
  evidence: "`CHANGELOG.md` — open `## [6.13.1] - 2026-09-23` above `[6.13.0]` with a `### Fixed` entry for this increment"
```

## Summary

- **Testability.** The approach is concrete. The continued-session case must fail on the pre-fix checker
  (L4), the tamper table is materialised once (L29), and the edges are executed rather than read (L37).
  Non-vacuity is asserted on every part of the split (L34). The equivalence test over the fixture set is
  the right control for "the emitter is byte-identical".
- **Error-handling.** The RED keeps the prefix that the existing test matches, and it names both parts of
  the split, so a reader can see which bound was crossed. The unknown-window path keeps equality and
  cannot be reached after the existing WARN.
- **Documentation.** The contract edit covers the definition, the field-table row and rule 6. F3 asks the
  CHANGELOG to tell users what happens to their existing files.
- **Migrations.** No schema, key or byte changes, so there is nothing to migrate. Existing `/2` ledgers
  are judged by the new comparison as they are.
- **Architecture (P3).** `isAfterWindow` belongs in `run-window-core.mjs`, the one definition of the
  window. `deriveLedger` stays in the emitter, whose axis is deriving the ledger. There is no sibling
  import.

F1 and F2 are advisory. F1 could be answered either by keeping the WARN (the bound travels with the verdict)
or by moving the text into the GREEN note. F2 is a name-it item for the contract's bound list, not a code
change.

ADVISORY VERDICT: 3 concerns raised (0 blocking-severity, 3 advisory: 1 important, 2 minor), for the human
to weigh before /pharn-dev-build.
