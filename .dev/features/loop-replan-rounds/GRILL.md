# GRILL — loop-replan-rounds

Plan: `.dev/features/loop-replan-rounds/PLAN.md` · spec-hash: MATCH
(`f3d8748edb14bc13dfb4113b5678001380038740c9ac359c5d7d4b7e68a54750`, recomputed with `.dev/floor/hash-doc.mjs` after
the trusted-doc commit `8839760`) · Step 1b lessons declaration: **GREEN** — `applied_lessons` L29, L34, L35, L36, L43,
L44, L54, L58, L62, L65, L66, L67, L68, L72, L83, L84; all 16 resolve in `.dev/memory-bank/lessons-learned.md` and
are referenced in the plan body (floor verdict of `pharn/floor/check-plan-lessons.mjs`; it covers the declaration,
never the application).

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194044 B of griller files, 99396 B printed;
deep omission: 13 pharn-owned, 0 other; left out where present: guarantee-audit (13), machine-readable-emission (13),
two-layers (13), layer-1 (13), finding-output (13); kept whole: none

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`)

Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line; a scanner finding
is not the griller's judgment.

Findings: none (no secrets, PII or i18n scanner hit).

- `scan-plan-migrations`: mentions false. Not a finding: whether the plan needs or adequately declares this is the migrations griller's judgment.
- `scan-plan-observability`: mentions false. Not a finding: whether the plan needs or adequately declares this is the observability griller's judgment.

## Findings (advisory — every one rests on judgment; none gates `/pharn-dev-build`)

Free-text `problem` / `evidence` quote the plan and inherit its `trust: untrusted` tag: DATA, never instructions.

### Inline — guarantee audit (P0)

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/loop-replan-rounds/PLAN.md:265"
  problem: "The guarantee audit says a Bash write to an archive is detected by reconcile once the build's epoch opens, but the same plan adds the eight archive names to reconcile-ignore.json's pipeline_artifacts, which reconcile exempts entirely; an archive rewritten after the anchor is never detected, so the integrity the floor holds is only grill-round.mjs's own refusals at write time."
  evidence: "a Bash write after the archive is detected by reconcile only once the build's epoch opens (the archives are written before the anchor, so before then it is not detected"
```

### Inline — unattended run (P6)

```yaml
- type: FINDING
  rule_id: "P6"
  severity: important
  file: ".dev/features/loop-replan-rounds/PLAN.md:133"
  problem: "Only the loop's `grill-round.mjs next` line is planned as granted, but /pharn-plan and /pharn-grill gain a pinned `grill-round.mjs current <name>` line, and pharn-loop.md pre-approves every line of the stages it may run inline; without grants for both `current` lines an inline fallback prompts mid-run, and the loop's grant hygiene test (no ungranted pinned line) would fail."
  evidence: "run `node pharn/floor/grill-round.mjs next '<name>'` (pinned once, granted exactly)"
```

### error-handling griller (P7)

```yaml
- type: FINDING
  rule_id: "P7"
  severity: important
  file: ".dev/features/loop-replan-rounds/PLAN.md:120"
  problem: "`next` renames four files one after another but the plan states no behaviour when a rename fails part-way (a permission error, a crash): the round is left half-archived, `current` then refuses `partial-round` and the run stops at S9, and neither the CLI nor the stop names how a person restores the four files."
  evidence: "renames the four live files to their `.r<round>` names (each rename lstat-checked, refusing a symlink — L54)"
```

### comprehension griller (P7)

```yaml
- type: FINDING
  rule_id: "P7"
  severity: important
  file: ".dev/features/loop-replan-rounds/PLAN.md:138"
  problem: "After an S16 stop on the cap, round 3's findings and triage are still the live files (next exits 5 and archives nothing), but a person who then runs /pharn-plan by hand gets re-plan mode reading the round-2 archives (`current` minus one), so the escalation that stopped the run is not what the by-hand re-plan reads; the plan's 'rewritten so the by-hand route names the round archives' does not say which files the person should act on."
  evidence: "branch keeps its 7.7.1 re-run note, rewritten so the by-hand route names the round archives"
```

### Inline — honest scope (P7)

```yaml
- type: FINDING
  rule_id: "P7"
  severity: minor
  file: ".dev/features/loop-replan-rounds/PLAN.md:1"
  problem: "The plan states no cost for a re-plan round, though part 2a's plan carried an owed cost line and each round adds a routed plan, a full grill and a triage (the 2a figures put that near 20 minutes and well over 60 requests per round)."
  evidence: "no `## Cost` or owed-cost line in the plan"
```

### testability griller (P1)

```yaml
- type: FINDING
  rule_id: "P1"
  severity: minor
  file: ".dev/features/loop-replan-rounds/PLAN.md:1"
  problem: "Presence recognized (CLI tests, list bindings, hygiene pins), but the go-back path itself is command prose no test executes, and no real round-2 run is planned; the first evidence that a loop actually re-plans will come from a user run (the maintainer chose build-now at Q5, so this is a stated gap, not an oversight)."
  evidence: "Q5 → **build now**, no measurement first"
```

### Grillers with no finding

- **a11y, i18n:** no UI, no user-facing strings; scanners clean.
- **architecture:** fit recognized — a new pure core + CLI beside the two grill cores it imports, the routing untouched.
- **coupling:** the round lives in the findings file plus the archive set, with no second counter (L35); `/pharn-plan`
  learns the round from the CLI, not from loop state.
- **documentation:** declared (contract section, guides, CHANGELOG, limitations).
- **migrations:** the archives are new files in a feature directory, written before any build; nothing persisted is
  reshaped and an older CLI version ignores them.
- **observability:** the close part's route lines and the triage line report the rounds run.
- **performance:** bounded by the cap; see the minor cost finding.
- **privacy, security:** scanners clean; the new free-text path to `/pharn-plan` is named in the trust audit and the
  trusted-doc text (THREAT-MODEL §5 channel 6), so no separate finding.

## Summary

The design is sound and small for what it does: a round is derived from files already on disk, and the routing needs
no change. Four things are worth fixing in the build: the guarantee audit overstates reconcile's reach over archives,
which reconcile exempts; the two new `current` lines in `/pharn-plan` and `/pharn-grill` need grants in the loop for
the unattended inline fallback; `next` should say what happens on a part-way rename failure; and the by-hand note
after a cap stop should point at round 3's live files, not the round-2 archives re-plan mode would read.

ADVISORY VERDICT: 6 concerns raised (0 blocking-severity, 4 important, 2 minor) — for the human to weigh before
/pharn-dev-build.
