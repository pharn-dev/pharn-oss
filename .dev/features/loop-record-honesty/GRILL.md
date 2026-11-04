# GRILL — loop-record-honesty

Plan: `.dev/features/loop-record-honesty/PLAN.md` · spec-hash: `d5a974303fd0b9568945c60423ae5a89c57d7b65f5baa03657e317fbe64f33a5`
recomputed with `.dev/floor/hash-doc.mjs` — **matches** the plan's pin · Step 1b lessons declaration (FLOOR,
`check-plan-lessons.mjs`): **GREEN** — `applied_lessons: L6, L14, L15, L35, L52, L54, L62, L81`, all 8 resolve and
are referenced in the plan body.

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194044 B of griller files, 99396 B printed;
deep omission: 13 pharn-owned, 0 other; left out where present: guarantee-audit (13), machine-readable-emission (13),
two-layers (13), layer-1 (13), finding-output (13); kept whole: none

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`)

Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line; a scanner finding
is not the griller's judgment.

Findings: none (no secrets, PII or i18n scanner hit).

- `scan-plan-migrations`: mentions false. Not a finding: whether the plan needs or adequately declares this is the migrations griller's judgment.
- `scan-plan-observability`: mentions true — lines 97 (logging). Not a finding: whether the plan needs or adequately declares this is the observability griller's judgment.

## Findings (advisory — the free-text fields quote the plan as DATA)

### error-handling (P7)

```yaml
- type: FINDING
  rule_id: P7
  severity: important
  file: ".dev/features/loop-record-honesty/PLAN.md:76"
  problem: "The plan does not say what the closeout does when the injected pre-run reader throws (a marker or record read that fails in a way preRunUnchanged does not catch)."
  evidence: "ask `preRun({feature, base, inside})` (default `preRunUnchanged` from `pre-run-snapshot.mjs` …)"
```

Recommendation: leave it uncaught — closeLoop's top-level catch makes it a crash (exit 1, phase `stage-list`), which
happens before the branch step, so nothing is committed. Staging the user's edit on a reader failure would be the
fail-open direction. State it in the header.

### security / trust (P2)

```yaml
- type: FINDING
  rule_id: P2
  severity: minor
  file: ".dev/features/loop-record-honesty/PLAN.md:46"
  problem: "The INCONCLUSIVE reason names repeated report keys via JSON.stringify but no length bound is stated, so a hostile multi-kilobyte key lands whole in check-loop.mjs's output."
  evidence: "the reason naming the keys only, never a value (P2)"
```

Recommendation: bound each quoted key (e.g. 64 characters) and the number listed.

### observability (P7)

```yaml
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/loop-record-honesty/PLAN.md:84"
  problem: "The closing document gains left_dirty, but the closeout's step log (what a person reads above the JSON line) is not said to name the left-out paths."
  evidence: "the closing document gains the key `left_dirty` (`null` until the list is built, then `{status, paths}`)"
```

Recommendation: one `── left out of the commit (pre-run, unchanged): N path(s)` line beside the existing
`── staging list:` line.

### comprehension (P7)

```yaml
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/loop-record-honesty/PLAN.md:61"
  problem: "Seconds are capped at 59 with no rationale, which excludes an ISO-8601 leap second; the next maintainer cannot tell whether that is deliberate."
  evidence: "hour 00–23, minute and second 00–59"
```

Recommendation: say why in the code (Date cannot represent `:60`; a leap-second attestation is not a case worth an
exception) and in the contract row.

### coupling (P3)

```yaml
- type: FINDING
  rule_id: P3
  severity: minor
  file: ".dev/features/loop-record-honesty/PLAN.md:82"
  problem: "The commit's content now depends on the pre-run snapshot's semantics (marker age ≤ 24 h, base equality), so a run longer than 24 h, or a re-opened marker, silently reverts to today's sweep; the plan states the miss is reported but not this ripple."
  evidence: "On any snapshot miss (`no-delivery-run`, `no-snapshot`, …) nothing is subtracted — exactly today's list"
```

Recommendation: name the 24 h bound beside the miss rule in the header and the close part; Q1's recommendation (no
refusal) stays reasonable because `left_dirty.status` makes the miss visible.

### grillers with no finding (reason)

- a11y, i18n — no UI surface. migrations — no schema. privacy — scanner clean; no personal data handled.
- testability — verification approach present (`## Evals to write`): every behaviour change has a named test and a
  control. architecture — fit recognized: the closeout reuses the regress side's reader instead of a copy; no leaf →
  sibling `reads:`.
- documentation — the contract rows (`ship-record.md`, the two report contracts), the close part and the guides are
  declared for every new rule and the new `left_dirty` key.
- performance — the key scan is one linear pass over a report already read; the subtraction hashes only scope paths
  the snapshot recorded.

## Summary

The plan is grounded in live code for all three findings and keeps each fix at the narrowest point (one scanner in
the stop core, one parse change in check-spec, one constant and one subtraction in the closeout). The concerns are
about what the plan leaves unsaid rather than wrong: the reader-throws path, a length bound on quoted keys, a log
line for the left-out paths, the leap-second rationale, and naming the 24 h bound the subtraction inherits. Q1–Q3 are
genuine choices for the orchestrator; the plan's recommendations are coherent with P7.

Interaction to flag for the orchestrator (not a finding against the plan): group G2 may touch `loop-closeout.mjs`'s
`BLOCKED_RE` (the review's blocked-id finding cites `loop-closeout.mjs:137/414`); this plan edits other sections of
that file (`COMMIT_BODY`, `DOC_KEYS`, `buildStageList`, `closeLoop`'s stage-list step).

ADVISORY VERDICT: 5 concerns raised (0 blocking-severity, 5 advisory: 1 important, 4 minor) — for the orchestrator to
weigh before /pharn-dev-build.
