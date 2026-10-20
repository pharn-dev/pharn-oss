# GRILL — ship-step2-part

Plan: `.dev/features/ship-step2-part/PLAN.md` · spec-hash check: matches (`2c84959c…db12e`, recomputed this run) · Step 1b
lessons declaration: GREEN (`check-plan-lessons.mjs` exit 0 — L22, L29, L36, L55, L60, L67, L73 resolve and are
referenced in the body).

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194015 B of griller files, 99391 B printed; deep
omission: 13 pharn-owned, 0 other; left out where present: guarantee-audit (13), machine-readable-emission (13),
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

### Inline — guarantee audit (P0)

```yaml
- type: FINDING
  rule_id: P0
  severity: important
  file: .dev/features/ship-step2-part/PLAN.md:1
  problem: "The finding is about reliability (steps too long to follow), but the split reduces only what is held BEFORE GATE 1; the CHANGELOG and claims must not say the run holds less, or follows better, after it."
  evidence: "PLAN D2: 'Not reduced: the peak after GATE 1 (+≈1.5 KB of pointer)'."
```

### architecture / coupling (P3)

```yaml
- type: FINDING
  rule_id: P3
  severity: important
  file: .dev/features/ship-step2-part/PLAN.md:1
  problem: "commandFamilyText splices the stages part at the end of the parent's `## Step 2 — ` section, so `## Running a stage` moves from before `## Quick mode` to after Step 2 item 1 in the family text; any test that compares offsets across those sections changes meaning silently."
  evidence: "PLAN Files: '.dev/floor/command-family.mjs — `PART_KINDS` gains `stages`; it splices at the end of the parent's `## Step 2 — ` section'."
```

### error-handling (P7)

```yaml
- type: FINDING
  rule_id: P7
  severity: advisory
  file: .dev/features/ship-step2-part/PLAN.md:1
  problem: "The loop grant's trailing `*` admits any argument text after the fixed file; the extractor must refuse more than two operands, or a second file operand could ride the grant."
  evidence: "PLAN D5: '`Bash(node pharn/floor/command-section.mjs .claude/commands/pharn-loop.md *)`'; D4: 'usage (exactly two operands)'."
```

### testability (P1)

Presence recognized (fixture list per input kind, refusals, live headings, negative controls per pin). Layer 2:

```yaml
- type: FINDING
  rule_id: P1
  severity: advisory
  file: .dev/features/ship-step2-part/PLAN.md:1
  problem: "No differential check against a markdown renderer; the heading model is certified only against the author's fixtures and the committed command files (L55)."
  evidence: "PLAN D4: 'no markdown-it differential is added; stated as a bound'."
```

### comprehension (P7)

```yaml
- type: FINDING
  rule_id: P7
  severity: advisory
  file: .dev/features/ship-step2-part/PLAN.md:1
  problem: "The quick part cites Step 2 by item number ('Step 2 item 1 captured', 'item 3's kind read'); after the move those items sit under `### Step 2.N` headings in another file, so each quick-part cite must still name text that exists."
  evidence: "pharn-ship-quick.md item 7: 'Its base is the `<base sha>` Step 2 item 1 captured'."
```

No finding: documentation (the plan declares the guide and CHANGELOG edits), security/privacy (scanner clean; the
extractor reads only PHARN command files), a11y, i18n, migrations, observability, performance (not applicable).

## Summary

The plan is coherent and bounded. The concerns are about honest wording of what the split saves, an offset shift in the
family splice that tests may depend on, the operand count the grant relies on, the absent renderer differential (stated),
and the quick part's item-number cites.

ADVISORY VERDICT: 5 concerns raised (0 blocking-severity, 5 advisory or important) — for the human to weigh before
/pharn-dev-build. The Step 1b lessons-declaration result above is a separate floor verdict and is not counted here.
