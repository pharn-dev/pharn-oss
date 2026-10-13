# PLAN — grill-griller-trim

- spec_content_hash: 75088a82d113bc52cdd3d5fb2e44533e81cba5f520877f5eaa441ced45fb0fd6
- applied_lessons: [L1, L29, L34, L41, L55, L56, L62, L71]
- increment: A full `/pharn-grill` keeps running every registered griller, but loads each one through a new tested
  floor CLI that prints the griller without the two sections a grill never uses (`## Guarantee audit`,
  `## Machine-readable emission`), so Step 3b loads ~25% fewer griller bytes; review finding CTX-1.
- layer(s): product floor (`pharn/floor/`), product command (`.claude/commands/pharn-grill.md`), build apparatus
  (`.dev/floor/command-hygiene.test.mjs`, `.dev/features/grill-griller-trim/`)
- constitution_refs: [P0, P2, P3, P4, P5, P6, P7]

## GATE 1 record

- **Decision: APPROVED as re-scoped** — delegated: decided by the orchestrating model under the maintainer's 2026-10-13
  delegation, not a human approval. The review's proposed per-plan selection (skip a griller when its `scan-plan-*`
  scanner has no hit) was **measured and rejected** on the evidence below: ≥34 committed griller findings were raised on
  plans where that griller's scanner had no hit.
- Answers: Q1 yes — trim every griller instead of selecting; Q2 yes — keep each griller's frontmatter; Q3 no —
  `/pharn-dev-grill` is a named follow-up; Q4 no `--all` flag; Q5 minor, provisional 6.59.0 (renumber by diff when
  `main` moves).
- Two added requirements: (1) the CHANGELOG entry and the command say plainly that every griller still runs, that only
  two never-used sections are dropped, the measured before/after bytes, and that the review's selection idea was
  measured and rejected; (2) a test pins that every `OMITTED_SECTIONS` member matches a heading that exists in every one
  of today's 13 grillers (so a renamed heading makes the tool KEEP that section, visibly, and the test fails) and that no
  other `##` section of any live griller is dropped.
- Slug renamed at GATE 1 from `grill-griller-prefilter` to `grill-griller-trim` (branch `fix/grill-griller-trim`);
  nothing had been built or committed.
- Heads-up recorded: the parallel `stage-load-budget` test counts each griller file whole, so this change does not lower
  its grill row; its counting is not changed here.

## The triggering failure (P7)

Review finding CTX-1 (2026-10-12, `ctx-report.md`): a full `/pharn-grill` Step 3b reads all 13 griller bodies
(188,978 B, measured this run with `wc -c` over the 13 files `node pharn/floor/count-grillers.mjs .` lists) into ONE
context. The 2026-10-05 measured grill agent (`.dev/measurements/loop-wall-clock-2026-10-05.md` §3) made 41 requests
whose context grew from 302,208 to 425,373 tokens, so each request after the reads re-sent those bodies. The path is
`/pharn-ship` full (grill routed to an agent by `pharn/floor/stage-agent-core.mjs`) and standalone `/pharn-grill`;
`/pharn-loop` already runs the grill `--floor-only` and is not touched.

## What was measured, and why the increment is NOT the review's proposed prefilter

The increment description asked for a deterministic selection of the grillers a plan needs. Measured this run, over
every committed PLAN (282: 1 product, 281 dev) with a scratch runner that imports `runScans` from
`pharn/floor/grill-scan.mjs` and spawns `count-grillers.mjs` (the build commits it as `measure.mjs` and the numbers as
`MEASUREMENTS.md`):

1. **Scanner-hit selection (the review's fix) is unsound for every griller that has a scanner.** Skipping a
   scanner-backed griller when its `scan-plan-*` has no hit would skip security on 282/282 plans, privacy 278,
   i18n 281, migrations 232, observability 170 (mean 116,972 B loaded, −38%). But each of those grillers' own
   procedure judges beyond its scanner: security's and privacy's Layer 2, i18n's user-facing-text judgment, and
   for migrations and observability a NON-hit is the absence case where their main finding fires
   (`migrations.md` "The inverted polarity"; "the trigger is judgment"). Committed `GRILL.md` files confirm it: a
   heading-heuristic count (a lower bound) finds griller findings on plans whose scanner had no hit for security
   on 25 plans, privacy 4, i18n 1, migrations 3, observability 1 — ≥34 findings the prefilter would have dropped.
2. **No griller has a deterministic not-applicable signal from plan content.** All 13 grillers state their trigger
   ("touches UI", "touches schema", "needs it", "public surface") as judgment (`grep -n -i "trigger"` over
   `pharn/pharn-pipeline/grillers/*/*.md`). The 8 without a scanner have no plan-derived signal at all.
3. **The `applies:` archetype field (closed enum, validate-checked) is already applied by the installer**
   (`README.md` "What gets installed": the installer detects `ssr`/`backend`/`spa`/`lib` and copies only matching
   capabilities), so in an installed project `count-grillers.mjs` already returns the archetype-filtered set. A
   runtime filter would save 0 B there, and in this repo would need an archetype detector duplicating the external
   installer's (P7: no failure; a second copy of one fact). No runtime archetype source exists in this tree.
4. **Parallel per-griller subagents** would move the bodies out of one context but add 13 fresh-agent prefixes
   (68k–302k tokens each, `ctx-report.md` CTX-3/CTX-9), a larger bill than the bodies themselves.

**What is sound: every griller still runs, and each is loaded without the sections a grill never uses.** Per-section
byte counts this run: across the 13 grillers `## Guarantee audit` (the griller's own floor/advisory split of its claims,
for maintainers; `/pharn-grill` carries its own claims block and its own "never 'grill passed'" rule) and
`## Machine-readable emission` (the standalone `findings.json` path, which each griller says is "finalized when the live
griller runner lands"; inline, `/pharn-grill` folds findings into `GRILL.md`) total 47,646 B. Keeping each griller's
frontmatter (its `kind:` / `trust:` tags stay visible, P2 — 4,753 B), the extract is ≈141,300 B against 188,978 B
(−25%), identical for every plan because nothing is skipped. The build records the exact figure from the shipped CLI.

## Applied lessons

- L1 — meta-docs this increment changes are named in `## Files`: `CHANGELOG.md`, `SKILLS_VERSION`, the `README.md`
  badge and its generated `## Current state` floor-checker count (135 → 136, regenerated by `npm run docs:generate`,
  never hand-edited).
- L29 — the dropped sections are ONE exported closed enumeration (`OMITTED_SECTIONS`, id + heading prefix); the
  tests iterate it (each member dropped in its own case, and each member matched against every live griller), never
  one hand-picked member.
- L34 — zero registered grillers prints an asserted-silence summary (`grillers: 0 registered`) at exit 0, tested,
  and a non-empty registered set with zero printed bodies is impossible by construction (each registered path is
  printed or the run refuses); a test pins both.
- L41 — the CLI's one default (the repo dir `.`) lives in one place, and one test runs the CLI with no argument
  from a fixture cwd so the default path is exercised.
- L55 — the heading/fence model is probed against a reference renderer: in the build, a scratch markdown-it probe
  (already in `node_modules`, transitive) over the 13 real griller files plus adversarial fixtures compares the
  `##` headings markdown-it renders with the CLI's view; the result is recorded in `MEASUREMENTS.md`.
- L56 — the stated bound is probed too, and the model's failure direction is designed safe: an unclosed fence or a
  missing frontmatter close keeps the WHOLE griller (nothing dropped), and a heading the model does not recognize as
  an `OMITTED_SECTIONS` member is kept, so a mis-parse can only load more. The differential is a scratch probe, not a
  pinned test — pinning markdown-it is a human dependency decision (L56's named residual stays open).
- L62 — every refusal reason quotes untrusted values (a path from `count-grillers.mjs` stdout) through a total
  quoting helper that cannot throw; a test feeds the refusal path a non-string.
- L71 — `## Files` below names every path explicitly; no glob bullet.

## Files

- `pharn/floor/griller-extract.mjs` — NEW. Spawns `count-grillers.mjs <repo>` (membership stays owned there),
  validates its `{registered, grillers[]}` shape, reads each listed file (inside the repo, a regular file, `.md`),
  and prints on stdout: line 1 the `grillers:` summary for GRILL.md, then each griller framed by a fixed
  begin/end line naming its path and the section ids left out. Drops ONLY the column-0 `##` sections whose
  heading starts with an `OMITTED_SECTIONS` prefix, fence-aware (backtick and tilde fences, CommonMark open/close
  length rule); keeps the frontmatter and every other section; keeps the whole file when it finds an unclosed
  fence. Exit 0 the extract · 2 refusal (usage, count-grillers failure or bad shape, an unreadable or out-of-repo
  path), reason on stderr, nothing on stdout. First import `./runtime-floor.mjs`, `import.meta.main` gate (the
  `entry-point-guard.test.mjs` rules). — layer: product floor
- `pharn/floor/griller-extract.test.mjs` — NEW. Hermetic fixtures (a scratch repo with griller files) plus the live
  repo: each `OMITTED_SECTIONS` member dropped and the rest kept byte-for-byte; a `## Guarantee audit` inside a
  fence NOT dropped; an unclosed fence keeps the whole file; zero grillers; the no-argument default; every refusal
  (exit 2, empty stdout); the live run prints all 13 registered paths and fewer bytes than their sum; the GATE-1 pin
  that every `OMITTED_SECTIONS` member matches a heading in every live griller and that no other live `##` section is
  dropped; mutation controls (L60) that a broken drop rule or a broken fence rule fails a named test. — layer:
  product floor (tests never ship)
- `.claude/commands/pharn-grill.md` — Step 3b: replace "apply its procedure inline" with the pinned
  `node pharn/floor/griller-extract.mjs .` line, saying plainly that every registered griller still runs and only its
  two never-used sections are left out (measured bytes; the selection idea measured and rejected, cited to the CLI
  header and CHANGELOG); exit 0 → apply each printed griller; any other exit → read every file `count-grillers.mjs`
  lists in full and record `grillers: extract NOT run (griller-extract.mjs exit <n>)`. Step 4 full-mode GRILL.md gains
  the `grillers:` line; `reads:` gains the CLI; the claims block names it; `version:` 0.3.1 → 0.4.0. — layer: product
  command
- `.dev/floor/command-hygiene.test.mjs` — pin the invocation and its fallback in `pharn-grill.md` (with a
  discrimination control), and raise `COMMAND_BYTE_CEILINGS["pharn-grill.md"]` by the stated rule only if the
  measured bytes exceed 23,040 (today 23,012). — layer: build apparatus
- `.dev/features/grill-griller-trim/MEASUREMENTS.md` — NEW. The before/after bytes from the shipped CLI, the
  scanner-selection and GRILL.md evidence numbers above, and the markdown-it probe result. — layer: build apparatus
- `.dev/features/grill-griller-trim/measure.mjs` — NEW. The measurement runner, moved from `.pharn/` scratch so the
  numbers are reproducible. — layer: build apparatus
- `SKILLS_VERSION` — 6.58.0 → 6.59.0 (minor: a changed stage behaviour plus a newly shipped floor CLI); renumbered by
  diff if `origin/main` moves. — layer: repo meta
- `README.md` — the version badge, and the generated `## Current state` region via `npm run docs:generate`. — layer:
  repo meta
- `CHANGELOG.md` — one new section for this increment. — layer: repo meta

### Not changed (stated, so their absence is a decision)

- `/pharn-review` lens selection (`pharn-review.md`, `render-review-assignments.mjs`) — another agent owns it.
- `/pharn-loop`'s floor-only grill, `grill-scan.mjs`, `count-grillers.mjs`, `stage-agent-core.mjs`.
- The 13 griller files — the extract is computed from them; none is edited.
- `/pharn-dev-grill` (the dev twin, which also reads all 13) — a named follow-up (GATE 1 Q3).
- The parallel `stage-load-budget` test's counting.

## Contracts satisfied

- `pharn/pharn-contracts/finding-shape.md` — unchanged; griller findings keep the split. The CLI emits no finding.

## Evals to write (P1)

- No capability is added or changed (no `role:` file), so no eval. The CLI's behaviour is pinned by its `node --test`
  suite (`griller-extract.test.mjs`), the floor-CLI convention.

## Guarantee audit (P0)

- "the extract omits exactly the `OMITTED_SECTIONS` sections and keeps every other byte" → floor: enum-regex (closed
  heading-prefix set, column-0 match outside fences), pinned by the tests.
- "every registered griller is printed, or the run refuses" → floor: enum-regex over `count-grillers.mjs`'s membership
  (primitive #3) plus a length equality the tests pin.
- "each omitted heading exists in every live griller and nothing else is omitted" → floor at test time (a membership
  test over the 13 committed files), never at run time in an installed project.
- "the fence/heading model agrees with how markdown renders the 13 griller files" → advisory: a scratch markdown-it
  probe at build time, not a pinned test (L56).
- "the omitted sections hold nothing a grill needs to apply a griller" → advisory: a reading of the 13 files this run;
  a future griller that puts procedure under `## Guarantee audit` would lose it. The full file stays on disk at the
  printed path.
- "the grill loads fewer bytes" → advisory: the CLI's stdout is smaller (measured); that the model reads only the
  extract and not the files is orchestration.
- "the model applies every printed griller" → advisory, as today.

## Trust audit (P2)

- Griller files are capabilities (`trust: trusted` for `kind: pharn-owned`), read as procedure, exactly as today; the
  frontmatter stays in the extract so a griller's `kind:` / `trust:` remain visible. The PLAN under interrogation is
  never read by the CLI. Paths from `count-grillers.mjs` stdout are validated (inside the repo, regular file, `.md`)
  and quoted through a total helper in refusals.

## Determinism audit (P5)

- Selection: every registered griller (membership by `count-grillers.mjs`); no LLM classification. Omission: closed
  prefix set. Every refusal ends in the command's fallback (read the files in full), never a guess.

## Open questions (HALT)

- None open — all five were answered at GATE 1 (see `## GATE 1 record`).
