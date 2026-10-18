# GRILL — grill-griller-slim

Plan: `.dev/features/grill-griller-slim/PLAN.md` (commit `aa28be9`) · spec-hash: MATCH (`75088a82…fb0fd6`, recomputed
with `.dev/floor/hash-doc.mjs`) · lessons declaration (Step 1b, `pharn/floor/check-plan-lessons.mjs`): **GREEN** — all
19 cited ids (L1, L6, L22, L25, L29, L31, L33, L34, L36, L39, L41, L43, L50, L55, L56, L60, L69, L71, L72) resolve and
are referenced in the plan body.

Grillers: `node pharn/floor/count-grillers.mjs .` registered 13. Each was applied inline from the 6.60.0 extract
(`node pharn/floor/griller-extract.mjs .`, exit 0: 188,978 B of griller files, 141,332 B printed), and the five
`scan-plan-*` scanners ran through `node pharn/floor/grill-scan.mjs .dev/features/grill-griller-slim/PLAN.md` (exit 0):
no secrets, PII or i18n hit; migrations mentions on lines 22, 77, 105, 117, 191, 195, 238, 330, 332, 338, 423, 471 and
observability mentions on lines 78, 92, 105, 117, 191, 195, 239, every one of them the plan naming the griller or its
measurement. Loading the grillers through the extract instead of reading each file whole is this run's orchestration
(advisory): today's `/pharn-dev-grill` Step 2b does not pin how a griller is read, and this increment is the one that
pins it.

## Findings (advisory — none gates `/pharn-dev-build`)

### Guarantee audit (P0)

```yaml
- type: FINDING
  rule_id: P0
  severity: important
  file: ".dev/features/grill-griller-slim/PLAN.md:115"
  problem: "The design states that grill-scan.mjs's rule_id and severity match each griller's Procedure, and the full grill now relies on that, but no test pins the agreement: grill-scan.test.mjs pins only that GRILL_SCANS ids equal the scan-plan-*.mjs files on disk, and the planned lossless pin compares a griller's Finding output with its own Procedure, never with GRILL_SCANS."
  evidence: "Its `FINDING` objects ARE the security, privacy and i18n scanner-hit findings (rule_id and severity from `GRILL_SCANS`, which match each griller's Procedure"
```

Folded in (inside `## Files`, inside the approved design): `pharn/floor/grill-scan.test.mjs` gains a case that, for
every `GRILL_SCANS` entry with a `rule_id`, the named griller's `## Procedure` holds `rule_id: <id>` and
`severity: <severity>`, with a mutation control.

### One axis of change / coupling (P3) — architecture and coupling grillers, Layer 2

```yaml
- type: FINDING
  rule_id: P3
  severity: important
  file: ".dev/features/grill-griller-slim/PLAN.md:183"
  problem: "For every pharn-owned griller, the omission now makes a body convention load-bearing (runtime guidance must not sit under `## The two layers`, `### Layer 1` or `## Finding output`), but nothing a griller author reads declares it: it lives in the extract's header and in tests over the 13 committed grillers, so a future pharn-owned griller written in today's shape loses its Layer 1 guidance silently."
  evidence: "The audit and the lossless pins range over the 13 committed grillers only."
```

Not foldable within `## Files`: declaring the convention where a griller author reads it (a griller-shape contract under
`pharn/pharn-contracts/`, or the griller template if one exists) is a new file outside the plan. One half is already
closed: a new `scan-plan-*` scanner cannot be dropped this way, because `grill-scan.test.mjs`'s closure test fails until
`GRILL_SCANS` names it. For GATE 2.

### Comprehension (P7) — comprehension griller, Layer 2

```yaml
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/grill-griller-slim/PLAN.md:81"
  problem: "The plan leaves the inserted heading's text as an ellipsis, so the four presence grillers could each get a different heading and the pin only checks the `### Presence` prefix."
  evidence: "insert a `### Presence — …` heading before the presence block (no text moves)"
```

Folded in: the build uses one heading text for all four grillers and the lossless pin checks that exact text.

## Per-griller notes (no finding)

- **testability (P1):** presence recognized (`## Tests that pin the omitted set`, the mutation controls, the markdown-it
  re-probe). Adequacy: the controls name a killing test each; the kind gate has a fixture per reason token.
- **architecture (P3):** fit recognized; the extract stays the only reader of griller bodies, and membership stays
  `count-grillers.mjs`'s. The finding above concerns where the convention is declared, not the layering.
- **security (P2):** scanner clean. The kind gate reads a self-declared frontmatter field and fails toward keeping text;
  the residual (a self-declared or user-edited `pharn-owned` griller is trimmed) is stated at lines 177–183. The trim
  only removes text, so it cannot add an instruction.
- **privacy (P2):** scanner clean; no personal data is handled.
- **error-handling (P7):** declaration recognized: grill-scan failure → `scans: NOT run` and whole-file grillers;
  extract failure → whole-file grillers; an unreadable or ambiguous `kind` keeps the three sections.
- **observability (P6):** no production runtime is built; the mentions are the plan naming the griller. The summary
  line's `deep omission:` record is the run-time trace of the new branch.
- **performance (P7):** no scaling risk; the full grill gains five short scanner spawns.
- **migrations (P7):** no schema or persisted data. Two printed formats change (the extract summary line and
  grill-scan's section wording); the plan swept their consumers (L72, lines 377–379) and leaves committed `GRILL.md`
  records as written, so nothing needs a reverse path.
- **documentation (P7):** declaration recognized (CHANGELOG section, Step 3b and the dev Step 2b wording, the
  re-derived CLI header).
- **comprehension (P7):** rationale captured for the numbers (the per-griller audit, the byte table, the token
  estimate labeled as estimate). One finding above.
- **coupling (P3):** the extract and `grill-scan.mjs` stay separate CLIs joined only by the command's two pinned lines;
  no shared mutable state. The finding above covers the body convention.
- **a11y, i18n (P7):** no UI and no user-facing strings; scanner clean.

## Summary

The plan's floor claims reduce to enum/regex tests (the closed member set, the level-exact heading test, the `kind`
equality) and its advisory claims are labeled. Two gaps: the GRILL_SCANS-to-Procedure agreement the full grill now
relies on was unpinned (folded in as a test), and the body convention the omission depends on is declared only where a
maintainer of the extract looks, not where a griller author does (for GATE 2). The heading text is fixed by the build.

ADVISORY VERDICT: 3 concerns raised (0 blocking-severity, 2 important, 1 minor) — for the human to weigh before
/pharn-dev-build.
