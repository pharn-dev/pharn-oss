# GRILL — grill-griller-trim

Plan: `.dev/features/grill-griller-trim/PLAN.md` · spec-hash: MATCH (`75088a82…fb0fd6`, recomputed with
`.dev/floor/hash-doc.mjs` after merging `origin/main` 791d205) · lessons declaration (Step 1b,
`pharn/floor/check-plan-lessons.mjs`): **GREEN** — L1, L29, L34, L41, L55, L56, L62, L71 resolve and are referenced in
the body.

Grillers: `node pharn/floor/count-grillers.mjs .` registered 13; each was applied inline from its `## Procedure`
section (plus the `scan-plan-*` scanners through `pharn/floor/grill-scan.mjs`: no secrets/PII/i18n hit; migrations and
observability mentions only, on the plan's own measurement lines). Reading only the procedure sections is a
deviation of this run's orchestration (advisory), recorded so it is not mistaken for the full-body read the dev command
prescribes.

## Findings (advisory — none gates `/pharn-dev-build`)

### Guarantee audit (P0)

```yaml
- type: FINDING
  rule_id: P0
  severity: important
  file: ".dev/features/grill-griller-trim/PLAN.md:67"
  problem: "Dropping `## Guarantee audit` also drops each griller's own struck claims (e.g. 'this griller ensures the plan is secure' -> struck) from the grill model's context; the plan leans on /pharn-grill's claims block, which strikes 'the plan is sound' generally but never per axis."
  evidence: '`## Guarantee audit` (the griller''s own floor/advisory split of its claims, for maintainers; `/pharn-grill` carries its own claims block and its own "never ''grill passed''" rule)'
```

Recommendation: the Step 3b text that introduces the extract carries one sentence that a griller's findings, or their
absence, never mean the plan is secure / private / accessible / reversible on that axis — so the rail the dropped
sections carried survives in the command that now feeds the model.

### Trust propagation (P2) — security griller, Layer 2

```yaml
- type: FINDING
  rule_id: P2
  severity: important
  file: ".dev/features/grill-griller-trim/PLAN.md:101"
  problem: "'inside the repo, a regular file' does not say whether the check follows a symlink; a symlinked griller path whose target lies outside the repo would be printed into the grill context if containment is tested on the link's spelling or with a following stat."
  evidence: "reads each listed file (inside the repo, a regular file, `.md`)"
- type: FINDING
  rule_id: P2
  severity: minor
  file: ".dev/features/grill-griller-trim/PLAN.md:102"
  problem: "The fixed begin/end frame lines can be forged by a griller body that contains a line starting with the same marker (an installed project can hold a non-pharn-owned griller), moving a section boundary the model relies on."
  evidence: "each griller framed by a fixed begin/end line naming its path and the section ids left out"
```

Recommendation: refuse (exit 2, so the command falls back to whole files) on any path that `lstat` reports as a symlink
or whose real path leaves the repo, and on any griller body that already contains a line starting with the frame
marker. Both move the failure toward the full-file read the command already prescribes.

### One axis of change (P3) — architecture / coupling griller

```yaml
- type: FINDING
  rule_id: P3
  severity: minor
  file: ".dev/features/grill-griller-trim/PLAN.md:104"
  problem: "The omitted-section prefixes are a second, undeclared store of the griller body shape (no contract in pharn-contracts declares griller section headings), so a floor CLI now changes when a griller's heading wording changes."
  evidence: "heading starts with an `OMITTED_SECTIONS` prefix, fence-aware"
```

The GATE-1 live pin (each member matches a heading in every one of today's 13 grillers; no other section is dropped) is
the right backstop, and its failure direction is safe (a renamed heading is kept, never something else dropped). The
module header should name this coupling and the pin as its detector.

### Comprehension / documentation (P7)

```yaml
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/grill-griller-trim/PLAN.md:1"
  problem: "The plan adds a floor CLI but no `.dev/guides/floor-*.md` section, while CLAUDE.md's guidance index routes 'running or citing a floor CLI' through those sections; a future agent grepping the guides finds nothing (as it already does for count-grillers.mjs and grill-scan.mjs)."
  evidence: "## Files lists pharn/floor/griller-extract.mjs and its test, pharn-grill.md, command-hygiene.test.mjs, MEASUREMENTS.md, measure.mjs, SKILLS_VERSION, README.md, CHANGELOG.md"
```

A question for the human rather than a gap the build should fill on its own: adding a guide section widens `## Files`
after approval. The module header carries the same content either way.

### Axes with no finding

- **a11y, i18n, privacy** — no UI, no user-facing text beyond fixed English CLI messages in the repo's existing
  vocabulary, no PII; scanners clean.
- **migrations** — the only persisted shape touched is `GRILL.md`, which gains one `grillers:` line. Its one structured
  reader, `render-ship-briefing.mjs`'s `grillVerdictLine`, matches only a line-initial `**ADVISORY VERDICT:` outside
  fences (read this run), so the added line moves no reader. The scanner's mentions are the plan's own prose.
- **observability** — the `grillers:` summary line (or `extract NOT run (… exit <n>)`) is the run's record of what was
  loaded and what was left out; declared and adequate for a stage-internal load.
- **error-handling** — every refusal exits 2 with nothing on stdout and the command falls back to the full-file read.
- **performance** — one `count-grillers.mjs` spawn plus 13 file reads; bounded.
- **testability** — a hermetic suite plus live-repo pins and mutation controls are declared; presence recognized.
- **architecture fit** — a floor CLI spawning another floor CLI and reusing its membership, the shape `grill-scan.mjs`
  already has; no sibling capability reference, no contract change.

## Summary

The plan's central claim is measured rather than argued, and the re-scope away from per-plan selection rests on
committed evidence. The two concerns worth acting on in the build: keep the per-axis "never means the plan is X" rail in
the command once the guarantee-audit sections leave the model's view, and make the path checks symlink-safe so the
extract can only fail toward the whole-file read. The rest is minor and recorded for the review.

**ADVISORY VERDICT: 5 concerns raised (0 blocking-severity, 5 advisory: 2 important, 3 minor) — for the human to weigh
before `/pharn-dev-build`.**
