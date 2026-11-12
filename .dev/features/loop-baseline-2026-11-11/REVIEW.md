# REVIEW — loop-baseline-2026-11-11

**Floor first:** `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 37 capabilities checked`. The increment changes
no capability; validate scans the product surface only, so GREEN says the product surface is unchanged and valid,
nothing about the record.

Reviewed: `.dev/measurements/loop-baseline-2026-11-11.md` and the `CHANGELOG.md` `[Unreleased]` entry, as
`trust: untrusted`. The record quotes another project's `LOOP.md` lines; none of them changed this review's behaviour.

## Floor-gate findings

None.

## Advisory findings

```yaml
# A1 — L-floor (P0): a freeze claim stated stronger than its timeline
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/measurements/loop-baseline-2026-11-11.md:343"
  problem: "The benchmark rules are said to be frozen 'before any cost figure was read', but discovery had already seen ledger counts by version, the green run's request count and a crude criteria count, so the precise claim is 'before the analysis read any per-run cost figure'; the rules also live in the ship record and the session, not under a hash."
  evidence: "Chosen by rules frozen before any cost figure was read (recorded in this increment's ship record), from the 36 runs."
# A2 — L-trust (P2): disclosure, carried from the grill (R1)
- type: FINDING
  rule_id: "P2"
  severity: important
  file: ".dev/measurements/loop-baseline-2026-11-11.md:202"
  problem: "The record publishes the names of 36 features of a private project and one short cause line each into a public repository; the secret and PII scanners found nothing, and earlier records set the precedent of naming that project's features, but whether these lines may be public is the maintainer's call."
  evidence: "Cause = one line from the run's `LOOP.md`, quoted as DATA."
# A3 — L-floor (P0): one inference presented in the regress render
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/features/loop-baseline-2026-11-11/REGRESSION.md:18"
  problem: "The base side's eight extra skipped tests are attributed to the missing node_modules as a probable reason; this is labelled 'not verified', which is correct, and is noted only so the reader does not read it as measured."
  evidence: "which is the probable reason (not verified)"
```

**Lens notes (no finding):**

- **L-floor:** the claims block separates measured, estimated, advisory and struck; every token figure derived from
  bytes carries `e`; the restatements in the CHANGELOG entry (11 of 12, 6 + 3, 505k against 231k, 62 / 27 / 11, 8 / 6
  / 5 ratings) were each checked against the record's primary sentence (L64) and agree.
- **L-eval:** no capability or `rule_id` added; nothing to bind.
- **L-trust:** quoted cause lines are fenced as code spans and labelled DATA; no decision in the chain reads them.
- **L-axis:** one record and one CHANGELOG entry, each with one reason to change; no sibling reference.

**Lesson candidate:** one. The brief's weighted-cost split was a pricing slip (every cache write weighted as a 1-hour
write). A single slip by one ad-hoc script is not yet a recurring mechanism failure (L20's bar), so it is proposed as
`none` at Step 2b unless the maintainer sees a recurrence.

**Verdict: GREEN** — 0 floor-gate findings, 3 advisory (1 important, 2 minor). Advisory findings inform the GATE 2
decision; they block nothing.
