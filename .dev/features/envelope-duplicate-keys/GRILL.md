# GRILL — envelope-duplicate-keys

Plan: `.dev/features/envelope-duplicate-keys/PLAN.md` (GATE 1 approved, amendment for Q3 recorded in the plan).
Spec-hash check: `node .dev/floor/hash-doc.mjs pharn/ARCHITECTURE.md` = `2c84959c…b12e` = the plan's pin — no drift.
Step 1b lessons declaration (FLOOR): `check-plan-lessons.mjs` exit 0 — GREEN, `applied_lessons: L6, L29, L31, L35,
L52, L60`, all resolve and are referenced in the body. (This covers the declaration only, never the application.)

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194015 B of griller files, 99391 B printed;
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

## Findings (advisory — each gates nothing)

### Inline axes

```yaml
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/envelope-duplicate-keys/PLAN.md:41"
  problem: "The 'no committed record repeats a key' measurement covers this repository only; a user install's own
    LOOP.md/BRIEFING.md is not measurable here, so 'no valid record becomes invalid' rests on the YAML-1.2 argument
    and the writers' shape, not on a measurement of installs."
  evidence: "(`pharn/features/loop-decision-integrity/LOOP.md`), **zero** repeated keys"
```

The bound is real but small: an old `LOOP.md` is never re-checked by a later stage (each `/pharn-loop` stop rewrites
its own record before `check-loop-record` runs), and `render-cost-ledger` reads only the record of the run it is
emitting for. Say so in the CHANGELOG entry's bound line rather than leaving the plan's measurement to read as
universal.

```yaml
- type: FINDING
  rule_id: P0
  severity: important
  file: ".dev/features/envelope-duplicate-keys/PLAN.md:92"
  problem: "The closure classifies callers of `fieldEntries(`; the five readers will no longer call `fieldEntries`
    directly once they move to `frontmatterEntries`, so the classification must also require every ENVELOPE_READER
    to call `frontmatterEntries(` AND forbid it from calling `fieldEntries(` over its envelope, or a reader that
    regressed to `fieldEntries` + last-wins would sit in the HEADER list unnoticed."
  evidence: "every non-test `pharn/floor/*.mjs` that calls `fieldEntries(` is classified — either in
    `ENVELOPE_READERS` (the five; each must call `frontmatterEntries(`) or in `HEADER_READERS`"
```

Concretely: the closure should range over the UNION of `fieldEntries(` callers and `frontmatterEntries(` callers,
require each to be in exactly the list(s) its role names, and make `ENVELOPE_READERS` the set of
`frontmatterEntries(` callers by equality (both directions — L36's presence-vs-closure point). `check-ship-briefing`
is the one module in both lists, so its entry needs the reason spelled out.

### error-handling (P7) — declaration recognized

The plan's table names each reader's behaviour on a repeat, and the GATE 1 amendment names the run report's
derived-source text. One gap:

```yaml
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/envelope-duplicate-keys/PLAN.md:51"
  problem: "loop-closeout's null envelope also feeds `excludedGates(feature, null)` and the ledger tail's quick check
    (`facts.mode === 'quick'`), not only the green gate; the plan should state that a null mode reads as full there
    (a regress side is read) and pin it with the end-to-end closeout test rather than leave it implied."
  evidence: "returns `null` → `recordFacts` all-null → green gate's existing `decision unverifiable`, exit 4, no
    commit"
```

(Measured: `recordFacts` already returns `mode: null` for an invalid `mode` value today, so the path exists and is
not new — the finding asks only that the plan say so.)

### architecture (P3) — fit recognized

The helper lands in the existing shared core (`frontmatter-core.mjs`, already imported by all five readers); no leaf
imports a sibling. `render-run-report.mjs` reads the outcome from `cost.json`, not from `LOOP.md`'s envelope, so it
is not a sixth envelope reader and correctly stays outside the closure.

### coupling (P3) — clean seams recognized

No shared mutable state. One ordering dependency is stated by the plan and is pre-existing: the ledger's fall-through
depends on `readOutcome` returning null, which the GATE 1 amendment couples to the run report's wording; the amendment
makes the report command-aware rather than outcome-aware, which keeps the two independent. `check-cost-ledger.mjs`
does not recompute `outcome` from `LOOP.md` (grep: no `readOutcome`/`LOOP.md` reference), so the null does not ripple
into the ledger checker.

### testability (P1) — presence recognized

`## Tests` names one test per reader through each reader's real entry point, each with a negative control and a
pre-change run. Adequacy: covered, with the closure gap above.

### comprehension (P7) — rationale recognized

Why any key (YAML 1.2, `blocked`), why null rather than RED for the two consumers that are not checkers, and why the
briefing contract version does not move are each written down.

### documentation (P7) — declaration recognized

Both contracts and the two dev guides are declared; the CHANGELOG section carries the user-facing change.

### performance (P7) — no scaling risk recognized

A count over the handful of envelope keys per read.

### security (P2) — scanner clean; no security concern warranted

The change narrows what untrusted envelope bytes reach control flow; refusal messages print keys (grammar-restricted)
and counts, never values.

### privacy (P2) — scanner clean; no privacy concern warranted

### observability (P6) — no finding

No production runtime of its own; every refusal is a printed RED line or an existing closeout outcome.

### migrations (P7) — no absence finding

A read-side tightening of a persisted record's shape, not a schema change; rollback is a revert, and the measured
bound is the inline P7 finding above.

### a11y, i18n — not applicable

No UI and no user-facing translated text.

## Summary

The plan is narrow and its trigger is the recorded ENF-4 deferral. Two things to carry into the build: make the
closure an equality over `frontmatterEntries(` callers (not only a classification of `fieldEntries(` callers), and
state plus test that loop-closeout's null mode reads as full in its non-gate steps. The install-side measurement bound
belongs in the CHANGELOG.

ADVISORY VERDICT: 3 concerns raised (0 blocking-severity, 3 advisory: 1 important, 2 minor) — for the human to weigh
before /pharn-dev-build
