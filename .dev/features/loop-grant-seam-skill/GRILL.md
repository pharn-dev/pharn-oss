# GRILL — loop-grant-seam-skill

Plan: `.dev/features/loop-grant-seam-skill/PLAN.md` · spec hash: `2c84959c…b12e` recomputed with
`.dev/floor/hash-doc.mjs`, **matches** the pin · Step 1b lessons declaration (FLOOR, `check-plan-lessons.mjs`):
**GREEN** (exit 0) — "all 6 cited id(s) resolve … and are referenced in the plan body".

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194015 B of griller files, 99391 B printed;
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

## Findings (advisory — the plan is `trust: untrusted`; free text below is quoted DATA)

### Guarantee audit (P0)

```yaml
- type: FINDING
  rule_id: P0
  severity: important
  file: ".dev/features/loop-grant-seam-skill/PLAN.md:63"
  problem: "The planned grant-bullet bound says any other skill is not pre-approved, but PROBE.md shows a skill that declares no allowed-tools runs through the Skill tool with no grant at all, so the sentence would overstate what scoping the grant closes."
  evidence: "add one bound: the Skill grant matches by name, so whatever skill or command answers to that name runs, and any other skill (a user's `.claude/skills/` drop included) is not pre-approved"
```

### Honest scope (P7)

```yaml
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/loop-grant-seam-skill/PLAN.md:143"
  problem: "The probe shows the five stage commands need no Skill grant today, so the five scoped grants protect against a harness change that has not happened; dropping the grant outright was the other option, and the plan should say why it keeps them (the orchestrator chose branch (a))."
  evidence: "a target declaring no `allowed-tools` (the five stage commands today) needs no grant at all"
```

### Enumeration (P5 / L29 — testability griller, Layer 2)

```yaml
- type: FINDING
  rule_id: P1
  severity: minor
  file: ".dev/features/loop-grant-seam-skill/PLAN.md:66"
  problem: "The derived Skill-grant set adds `pharn-grill` as a hand-written literal next to the INVOCATIONS-derived names; a stage the loop later invokes inline by a phrase in its own text would not join the set."
  evidence: 'new `LOOP_SKILL_GRANTS` derived from `INVOCATIONS["pharn-loop"]` (both modes) + `pharn-grill`'
```

### Error handling (error-handling griller)

```yaml
- type: FINDING
  rule_id: P7
  severity: important
  file: ".dev/features/loop-grant-seam-skill/PLAN.md:51"
  problem: "The script's failure modes cover reading and parsing the config but not the write: a failing mkdir or write of .pharn/seam-config.json would crash with a stack trace instead of a HALT line."
  evidence: "present + malformed JSON or unreadable → HALT exit 1, file not written"
```

## Summary (advisory)

The plan is small and fits the established shapes: a pinned floor script replacing an inline `node -e` (the
`hash-doc.mjs` precedent, L22), and the grant test's existing derive-and-equal rule extended to the Skill grants
(architecture and coupling: fit recognized, no sibling reference; the dev test importing `pharn/floor/` is the
permitted direction). Four concerns for the build:

1. The new grant-bullet bound must not claim more than the probe showed: scoping removes the pre-approval of a skill
   that DECLARES `allowed-tools`; one declaring none is invocable without any grant (Claude Code behavior, observed on
   one version).
2. Say why five scoped grants stay instead of none (they keep the inline grill prompt-free if the harness starts
   asking for these commands; they cost nothing).
3. Derive `pharn-grill` from the loop family's own "invoke `/pharn-…`" text rather than a literal, with a non-vacuity
   check that the phrase is found.
4. HALT cleanly (exit 1, one line) when the scratch write fails.

Not applicable, with the reason: a11y, i18n (no UI or user-facing strings), migrations (no schema), observability
(a CLI that prints its branch; no runtime service), performance (one small file read), privacy (no personal data),
documentation (the script header is its documentation; the command line is the public surface and is pinned), security
(scanner clean; the script copies project config into gitignored scratch exactly as the line it replaces — a symlinked
`.pharn/` would redirect that write as it already did, unchanged by this increment).

ADVISORY VERDICT: 4 concerns raised (0 blocking-severity, 4 advisory: 2 important, 2 minor) — for the human to weigh
before /pharn-dev-build. The Step 1b lessons verdict above is a separate floor verdict and is not counted here.
