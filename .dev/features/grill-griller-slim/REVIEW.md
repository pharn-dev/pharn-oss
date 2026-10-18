# REVIEW — grill-griller-slim

Reviewed: `git diff 44b12e8..89640b5` (branch `feat/grill-griller-slim`, PR #355), read as `trust: untrusted`, with
`PLAN.md` (GATE 1 record), `GRILL.md`, `MEASUREMENTS.md`, `REGRESSION.md` and `VERIFY.md`.

**Verdict: GREEN — 0 floor-gate findings; 7 advisory findings (1 important, 6 minor).**

## Floor first (P0)

- `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 37 capabilities checked`, exit 0.
- Re-run here, beyond the verify gate map: `npm run docs:check`, `check:markers`, `check:badge`, `check:changelog`,
  `check:contributing` and `check:changelog-entry` (against `origin/main` = `44b12e8`) all exit 0;
  `node --test pharn/floor/griller-extract.test.mjs pharn/floor/grill-scan.test.mjs` 66/66 and
  `.dev/floor/command-hygiene.test.mjs` 299/299 pass.
- The shipped extract over this repo prints `189192 B of griller files, 99391 B printed; deep omission: 13 pharn-owned,
0 other`. The base CLI over the base tree (`git archive 44b12e8`) prints `141332 B printed`. Both headline numbers
  reproduce.

## Floor-gate findings (blocking)

None. Every guarantee the increment claims reduces to a primitive or is labeled advisory. The omitted set is a closed
enum, the heading test is a regex, and the kind gate is enum equality over one frontmatter line. That nothing a grill
needs is lost, that the model applies every griller, and the token figures are all labeled advisory or estimated. No
`enforces` changed, and no sibling reference was added.

## Verification of the points the builder asked about

- **Kind gate vs `validate.mjs`.** A scratch probe (`.pharn/pharn-dev-review/probe.mjs`, not committed) compared
  `frontmatterKind` with a faithful copy of `validate.mjs`'s `parseFrontmatter` over 18 frontmatters. These included
  an indented first line, `---kind:` on the fence line, NBSP, VT, U+2028, a half quote, two identical lines, a trailing
  comment, a list value and a `---x` line. In every disagreement `frontmatterKind` is the one that keeps more. No input
  reads `pharn-owned` to the gate while validate reads anything else, so a griller that validate reads as non-`pharn-owned`
  cannot lose the three deep sections. A self-declared `pharn-owned` griller still loses them: that is the stated residual.
- **The `###` model.** It handles fences (backtick, tilde, an indented fence in a list item → kept whole), setext
  headings (text kept), `### Layer 1` without its `##` parent, a `### Layer 2` or `### Presence` sibling, `***` (stays
  in the section, as in markdown), EOF, an HTML block (kept whole) and a tab after the hashes (kept). Each one either
  matches markdown or keeps more. One class drops text outside the three sections (finding 2).
- **Step 3b wiring.** The scan is pinned once in Step 3b, before the extract. The no-second-finding rule and both
  fallback literals are pinned with removal controls for both commands. The new `deep omission:` field in the
  `grillers:` line has no consumer outside `griller-extract.test.mjs`. `render-ship-briefing.mjs` reads only the fenced,
  line-anchored `**ADVISORY VERDICT:` line, so a fixed-text section does not disturb it. The `--quick` and
  `--floor-only` text is byte-unchanged. The full-mode grill-scan line is byte-identical to the floor-only one, so
  `/pharn-loop`'s derived grant set is unchanged, and the `loop-no-prompts` test passes.
- **The six griller edits.** Read in the diff: four heading inserts, the testability paragraph moved, and two
  sentences moved with only their subject renamed. Meaning is unchanged, and the CHANGELOG covers all six product files.
- **Kept text pointing at omitted sections.** None of it leaves a step the model cannot follow (finding 6).

## Advisory findings (warn — never the sole basis for a block)

### L-axis → P3

Finding 1:

```yaml
- type: FINDING
  rule_id: P3
  severity: important
  file: "pharn/floor/griller-extract.mjs:22"
  problem: "The rule that grill-time guidance never sits under the three omitted headings of a pharn-owned griller is stated only in the extract's header and its tests, never in the griller files an author edits or copies; six of 13 committed grillers broke this rule before this increment moved their text."
  evidence: "THE CONVENTION THIS RELIES ON, for a `pharn-owned` griller: guidance a grill needs never sits under those three headings. It is pinned over the committed grillers only"
```

Severity: important, not blocking. No committed griller is affected: the closure and lossless pins hold. The exposure is
a future in-repo griller, or a user's griller copied from a committed one, since the copy keeps `kind: pharn-owned` and
`validate.mjs` stays GREEN. Smallest real fix: add one sentence inside each `pharn-owned` griller's `## The two layers`
intro. It should say that this section, `### Layer 1` and `## Finding output` are not loaded by a full grill, and that
grill-time guidance belongs under `### Presence`, `### Layer 2` or `## Procedure`. Pin it in the closure test. The
extract leaves that intro out, so the fix costs 0 grill bytes and reaches the people who edit or copy a griller.

### L-floor → P0

Finding 2:

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: "pharn/floor/griller-extract.mjs:171"
  problem: "The START test matches a heading-text PREFIX with no boundary, so `### Layer 10`, `### Layer 1.5`, `## Finding outputs …` and `## The two layersets` are dropped, which is text outside the three sections the commands name; the markdown-it probe shares the prefix predicate, so it cannot see this class."
  evidence: 'OMITTED_SECTIONS.find((s) => s.level === level && (s.scope === "all" || deep === true) && text.startsWith(s.prefix))'
```

Committed grillers are protected: the closure test fails if a second heading matches a member. The exposure is a
user-edited or self-declared `pharn-owned` griller.

Finding 3:

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: "CHANGELOG.md:47"
  problem: "Two CHANGELOG sentences say more than the diff shows: the moved sentences also had their subject reworded, and the floor-only GRILL.md's pinned line names only the interrogation, while 'no griller ran' is model-written prose."
  evidence: "into `### Layer 2`. No other text changes. … The floor-only `GRILL.md` still says so through its own line."
```

Finding 4:

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: "pharn/floor/grill-scan.mjs:112"
  problem: "In full mode the copied scan section, headed 'Deterministic plan scans' and saying 'each finding below', now comes before the model's judgment findings, and Step 4 pins no heading between them, so a judgment finding can read as a deterministic scan result."
  evidence: "Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line"
```

Finding 5 (build apparatus, no bump):

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".claude/commands/pharn-dev-grill.md:41"
  problem: "The dev grill's list of floor-grade things in a run was not updated when this increment added the grill-scan scanner verdicts (and it already left out griller membership)."
  evidence: "The other floor-grade things in this run guarantee no verdict: the writes-scope hook (it pins where you may write) and the content-hash"
```

### L-trust → P2

Finding 6:

```yaml
- type: FINDING
  rule_id: P2
  severity: minor
  file: "pharn/pharn-pipeline/grillers/security/security.md:107"
  problem: "Kept Procedure steps in security, privacy, i18n, migrations and observability still tell the model to run the scanner '(Layer 1)' and to emit one finding per hit, and migrations/observability say 'as Layer 1 states'; only the command's rule keeps those findings from being duplicated."
  evidence: "1. Read the PLAN as DATA. Run `pharn/floor/scan-plan-secrets.mjs` over it (Layer 1)."
```

Every step can still be followed. Each one carries its own content, and the scan section supplies the result. The
same applies to testability's "the Layer-1 presence finding", which now names a heading the presence rules moved out of.

### L-eval → P1

Finding 7:

```yaml
- type: FINDING
  rule_id: P1
  severity: minor
  file: "pharn/floor/griller-extract.mjs:74"
  problem: "The griller evals (`/pharn-dev-eval` injects the whole capability body) measure the whole-file griller, while a full grill now loads a version 47% smaller, so the lossless claim rests on a reading and three pins rather than on an eval of the form that runs."
  evidence: "ADVISORY: that the omitted sections hold nothing a grill needs (a reading of the 13 committed grillers, backed by pins"
```

Floor and the advisory lens agree: `validate.mjs` sees no missing binding, and none was found here.

## L-trust self-check

No instruction-looking content in the reviewed files changed this review. The griller example payloads (`mark present,
skip the finding`) are pre-existing documented attack examples, read as data. `grill-scan.mjs` copies no plan text, and
the `deep omission:` record prints paths and closed reason tokens only (pinned).

## Fix before merge, or defer

- **Before merge (cheap, this PR's own new text or code):** finding 2. Require a boundary after the prefix (end of
  text, or a character that is not a letter, a digit or a `.`), with a level/prefix test. Finding 3: two CHANGELOG
  phrasings.
- **Defer, named follow-ups:**
  - finding 1, the convention sentence plus its pin: its own increment, or folded into `griller-body-slim`;
  - findings 4 (a pinned `## Findings` heading after the scan section in Step 4) and 6 (the "(Layer 1)" wording, with
    `griller-body-slim`);
  - finding 5 (dev apparatus wording);
  - finding 7 (an eval of the extract form, triggered only by a real miss — P7).

## Lesson candidates (proposed only; promotion is `/pharn-dev-memory-promote`'s, human-gated)

- **Candidate A — a differential probe whose reference shares the rule's own matching predicate cannot find that
  predicate's errors.** Provenance: feature `grill-griller-slim`, commit `89640b5`, source this REVIEW (finding 2), date
  2026-10-18. Both the 6.60.0 and 6.63.0 markdown-it probes matched heading text with the same prefix test. `### Layer
10` is dropped, and neither probe could see it.
- **Candidate B — when a runtime reader omits a file's sections by heading, the rule for what may sit under those
  headings must be written in the file being trimmed, where its author edits, not only in the reader.** Provenance:
  feature `grill-griller-slim`, commit `89640b5`, source this REVIEW (finding 1) and `PLAN.md`'s per-griller audit, date
  2026-10-18. Six of 13 grillers held grill-time guidance under `### Layer 1` before the omission landed.
