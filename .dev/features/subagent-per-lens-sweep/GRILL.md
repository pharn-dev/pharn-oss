# GRILL — subagent-per-lens-sweep

Plan `.dev/features/subagent-per-lens-sweep/PLAN.md` (approved bytes sha256 `f98eb743…d6f67b`, 47,275 B, plus the
appended `## GATE 1` section, commit `dbc86a10`) · spec-hash: `node .dev/floor/hash-doc.mjs pharn/ARCHITECTURE.md` →
`2c84959cbca0b2dc51aaad90f90d40e574732c9c5c83c0bda7e1481ecb0db12e`, equal to the plan's post-patch `spec_content_hash`
(no drift; the human patch `125ff0fe` produced the planned bytes) · **Step 1b lessons-declaration verdict (FLOOR):
GREEN**, `check-plan-lessons.mjs` exit 0:

```text
GREEN — applied_lessons: L1, L13, L19, L25, L29, L33, L36, L47, L49, L50, L64, L68, L71, L75 (.dev/features/subagent-per-lens-sweep/PLAN.md); all 14 cited id(s) resolve in .dev/memory-bank/lessons-learned.md and are referenced in the plan body. NOTE (P0): that these lessons were GENUINELY applied is advisory — this checker verifies the DECLARATION, never the application; a body line reading "L1: considered." satisfies the reference check.
```

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194015 B of griller files, 99391 B printed; deep
omission: 13 pharn-owned, 0 other; left out where present: guarantee-audit (13), machine-readable-emission (13),
two-layers (13), layer-1 (13), finding-output (13); kept whole: none

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`)

Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line; a scanner finding
is not the griller's judgment.

Findings: none (no secrets, PII or i18n scanner hit).

- `scan-plan-migrations`: mentions false. Not a finding: whether the plan needs or adequately declares this is the migrations griller's judgment.
- `scan-plan-observability`: mentions true — lines 67 (spans), 68 (spans). Not a finding: whether the plan needs or adequately declares this is the observability griller's judgment.

## L75 — the plan's sweep, re-run by this grill

Re-run at `c47707e` with a scratch runner under `.pharn/pharn-dev-grill/` (spawnSync argv arrays, deleted before lint):
the 15 pinned `git grep -n -I -i -E '<pattern>' c47707e -- . ':!CHANGELOG.md' ':!.dev/features/'` lines (R5 over
`.claude/commands/pharn-review.md` only), then the plan's `### Every hit` list parsed and compared.

- **Per-pattern line hits — all 15 match the plan:** P1 24, P2 34, P3 1, P4 2, P5 41, P6 1, P7 1, P8 7, P9 45, P10 4,
  R1 24, R2 8, R3 4, R4 26, R5 9.
- **Distinct line-level hits: 152.** With the one line the plan reaches only through its wrap-tolerant pass
  (`.claude/commands/pharn-review.md:23`, `W:P3,R2`), that is the plan's **153 rows**. Every row's line tags and `W:`
  tags equal the live ones (0 mismatches), no row is a non-hit, and no row is duplicated.
- **Dispositions: 59 edit, 3 human-applied patch, 91 still-true, 0 follow-up** — as the plan states.
- **Wrap-tolerant pass: not reproducible byte for byte.** The plan's runner was deleted. This grill's re-implementation
  (each line's leading `>`, `//`, `*`, `#`, `-` stripped, lines joined with `\n`, each pattern's spaces as `\s+`, a
  match counted when its first and last characters sit on different lines) finds **9** spanning matches over 8 lines,
  against the plan's 7. The plan's 7 are among them. The two extra are R3 spans with no row in the table:
  `pharn/floor/installed-skills-core.mjs:12` and `pharn/floor/lens-groups.mjs:159` (finding G1).

## Findings (advisory — every one gates nothing)

### L75 sweep completeness (P6)

```yaml
- type: FINDING
  rule_id: P6
  severity: minor
  file: ".dev/features/subagent-per-lens-sweep/PLAN.md:70"
  problem: "A wrap-tolerant re-run finds two R3 hits the table does not list, and one of them is the twin of E8's sentence, outside ## Files."
  evidence: 'Plan: "Result: 153 distinct `path:line` hits — 59 edit, 3 human-applied patch, 91 still-true, 0 follow-up." Unlisted: pharn/floor/installed-skills-core.mjs:12-13 "…and each `/pharn-review` / lens used to read every listed `SKILL.md` in full. They now read this catalogue first…" (since 6.64.0 Step 4 gives the catalogue instruction to each lens-group subagent once); pharn/floor/lens-groups.mjs:159-160 "(each / * active lens then runs alone)" (6.64.0 text, still-true).'
```

G1 for the human: `installed-skills-core.mjs:12` is the sentence E8 fixes in `catalogue-installed-skills.mjs:9` and H5
fixes in `THREAT-MODEL.md:58`. It is not in `## Files`, and the build may not add it after its anchor, so it stays as is
in this increment. The proposed disposition is follow-up. `lens-groups.mjs:159` is still-true.

```yaml
- type: FINDING
  rule_id: P6
  severity: minor
  file: ".dev/features/subagent-per-lens-sweep/PLAN.md:66"
  problem: "The wrap-tolerant pass is described in prose and its runner was deleted, so its 7-match result cannot be re-derived exactly, and the CHANGELOG's planned '153 hits' depends on it."
  evidence: "\"Wrap-tolerant pass: each file joined with line prefixes (`>`, `//`, `*`, `#`, `-`) stripped and each pattern's spaces matched as `\\s+`; it reported 7 matches that span a line break. Its scratch runner lived under `.pharn/` and was deleted.\" / PLAN.md:551 \"Checked by: the PLAN's sweep table (153 hits at `c47707e`, each with one disposition)\""
```

### Post-build checks (P0)

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/features/subagent-per-lens-sweep/PLAN.md:562"
  problem: "The first post-build grep is line-level: a rewrap that ends a line at 'per lens' (before 'family') makes it hit falsely, and a stale 'one subagent per' / 'lens' split across two lines escapes it."
  evidence: "`git grep -n -i -E 'subagents? per lens($|[^ ]| [^f])' -- pharn .claude/commands .claude/agents README.md LIMITS.md THREAT-MODEL.md` → no hit."
```

### Coupling — the fix restates the owner's mechanism in 19 files (P3)

```yaml
- type: FINDING
  rule_id: P3
  severity: important
  file: ".dev/features/subagent-per-lens-sweep/PLAN.md:280"
  problem: "E1–E4 replace one restated fact about /pharn-review Step 4's spawn policy with another restated fact in 19 lens bodies, so the next change to Step 4's grouping ripples to the same 19 files, which is the failure that triggered this increment."
  evidence: "NEW: ``The lens runner has LANDED — `/pharn-review` Step 4 spawns **one subagent per lens family** (`pharn/floor/lens-family-map.json`), each lens writing its own `findings.json` ``"
```

The plan considered the wording (open forms, L47) but not a cite-only form such as "the lens runner has LANDED
(`/pharn-review` Step 4)", which would carry no spawn count. That would be a different increment's choice. The plan's
form is true today. The concern is how long it stays true, for the human to weigh.

### Trust propagation — the human gate was an advance approval (P2)

```yaml
- type: FINDING
  rule_id: P2
  severity: important
  file: ".dev/features/subagent-per-lens-sweep/PLAN.md:604"
  problem: "The trust audit names the human reading and applying the patch as the control on model-authored text reaching three trusted docs, but GATE 1 approved the plan before its text existed, so nothing recorded shows that H1–H5 were read before they were committed."
  evidence: '"The trusted-doc patch text originates in this model-written PLAN, so its truth is advisory until the human reads and applies it; the human gate is the control." / GATE 1 record: "this records an approval of the plan''s intent given before its text existed"'
```

The patch's bytes are pinned (the digests match and `git diff c47707e 125ff0fe` is exactly H1–H5). What is unrecorded is
whether a human read them. The remaining place to do that is GATE 2, over that diff.

### Honest scope — two follow-ups in one increment (P7)

```yaml
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/subagent-per-lens-sweep/PLAN.md:28"
  problem: "The increment bundles the stale-prose sweep with the separate follow-up architecture-agents-dir (H1/H2), so a review or revert of one carries the other."
  evidence: '"The maintainer put trusted-doc hits in scope for a human-applied patch (2026-10-19), so that follow-up lands here too."'
```

The maintainer chose this bundle, and both parts are prose. The finding records it for attribution only.

## Griller axes with no finding (reasons, in prose)

- **testability (P1):** declaration recognized: `## Post-build checks`, `## Evals to write (P1)` (none, with reason),
  `validate.mjs` GREEN and the committed structural evals at verify. Adequacy: the edited sentences' truth has no
  checker, and the plan says so (L49). No finding beyond the post-build-grep note above.
- **architecture (P3):** fit recognized. H1/H2 give the shipped `.claude/agents/` a place in §4. The E-edits are prose
  in their own files, and no leaf-to-leaf reference is added (a lens citing a `pharn/floor/` data file is the
  established scanner-citing pattern).
- **comprehension (P7):** rationale recognized: each edit carries its why (E1's "isolated goes because …", E2's #168
  history, H3's prefilter note).
- **documentation (P7):** no public surface added. The CHANGELOG entry is declared.
- **error-handling (P7):** a prose-only change. The build's one failure mode, an OLD text matching 0 or 2+ times, is
  declared with HALT-and-ask.
- **observability (P6):** the scanner's two mentions ("spans", lines 67–68) are incidental: they mean line-break spans.
  No production runtime is built.
- **performance (P7):** no scaling risk. The P5 `fan-out` hits in the table are N+1 eval text, not work this builds.
- **security (P2) / privacy (P2):** scanners clean. The one trust concern is the P2 finding above.
- **i18n / a11y (P7):** no user-facing UI or translatable text.
- **migrations (P7):** no schema or persisted-data shape.
- **coupling (P3):** the finding above.

## Summary

The plan is grounded: the spec pin matches the human's patch, the 15 pinned greps reproduce the table's line-level hits
exactly (counts, the 153 rows, every tag, and the 59/3/91 split), and the post-build baselines hold at `c47707e` (21,
19, 19, 1, 1). The concerns are these. A wrap-tolerant re-run finds one more stale twin of E8's sentence in
`installed-skills-core.mjs:12`, outside `## Files`, so it is a follow-up. The wrap pass itself cannot be re-derived
exactly. The first post-build grep is blind across line breaks. The fix restates the review's grouping in 19 lens
bodies, so the next grouping change recurs the sweep. The advance GATE 1 approval leaves no record that H1–H5 were read
before they reached the trusted docs, which GATE 2 can close.

ADVISORY VERDICT: 6 concerns raised (0 blocking-severity, 2 important, 4 minor), for the human to weigh before
/pharn-dev-build. The Step 1b lessons-declaration result above is a separate floor verdict and is not part of this count.
