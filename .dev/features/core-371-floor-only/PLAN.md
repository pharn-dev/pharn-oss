# PLAN — core-371-floor-only

- spec_content_hash: 8566b4432ed6cc7035de5d925dafe3755086e23b12acacde0dcdda07a43a9167
- applied_lessons: [L33, L34, L43, L60, L75]
- increment: close the two items PR #496's review left on `/pharn-grill`'s `--floor-only` section — remove the
  now-unreachable "Run inside an orchestrator" closing sentence, and turn the command-hygiene pin of "No orchestrator
  invokes this form since 7.7.0" from a bare prose regex into a check that DERIVES the routing fact from
  `ROUTE_POLICY`, the rendered briefs, the orchestrator command families and the product floor scripts, and requires
  the sentence exactly while that fact holds.
- layer(s): product surface (`.claude/commands/pharn-grill.md`), which means a patch bump to 7.25.5; build apparatus
  (`.dev/floor/command-hygiene.test.mjs`); repo-meta (`CHANGELOG.md`, `SKILLS_VERSION`, the README badge, the generated
  `pharn-install.json`).
- constitution_refs: [P0, P4, P5, P6, P7]

## Discovery (read this run, origin/main 5d8dcddd, SKILLS_VERSION 7.25.4)

- **Fix 1 — the closing sentence is unreachable.** `.claude/commands/pharn-grill.md:111` opens the `--floor-only`
  section with "No orchestrator invokes this form since 7.7.0 … It remains for a direct call." and `:127` still ends
  "Run inside an orchestrator, Step 4's "end your turn" does not apply: return to it." Confirmed nothing invokes the
  form: `ROUTE_POLICY` (`pharn/floor/stage-agent-core.mjs:305-357`) has `pharn-grill` = `agent` in both `full` columns
  and the POLICY name `floor-only` in both `quick` columns; `INVOCATIONS` (`:364-395`) names `/pharn-grill <name>` for
  the two agent cells; the quick parts invoke `/pharn-grill <name> --quick` (`pharn-loop.md:814-815`,
  `pharn-loop-quick.md:74`, `pharn-ship-quick.md:76`). `grep -rn -- --floor-only` over `.claude/commands`,
  `.claude/agents`, `.claude/hooks/*.cjs` and `pharn/floor/*.mjs` (tests excluded) hits only `pharn-grill.md` itself.
  With no orchestrator, Step 4's "end your turn" (`:388`) already applies to the direct call as written, so the
  sentence is removed, not reworded.
- **Fix 2 — the pin freezes a descriptive claim.** `.dev/floor/command-hygiene.test.mjs:2747-2758` asserts
  `/No orchestrator invokes this form since 7\.7\.0/` with nothing tying it to routing; the pin of the opposite sentence
  (`/pharn-loop` invokes this form) stayed green for every release from 7.7.0 to 7.25.3. The test file already imports
  `ROUTE_POLICY`, `AGENT`, `modesOf` and `renderBrief` from `stage-agent-core.mjs`, and `commandText()` reads a
  command FAMILY (file + parts, `command-family.mjs`), so the derivation needs no new import beyond `readdirSync`
  (already imported).
- Lessons index: `node .dev/floor/check-lessons-index.mjs .` exit 0 (GREEN). Selected and read in full from canon:
  L4, L33, L34, L43, L50, L60, L75.

## Applied lessons

- L33 — the claim "no orchestrator invokes `--floor-only`" is forward-looking prose that expires the moment routing
  changes; instead of re-pinning the sentence, the test derives the fact and binds the sentence to it, and the derived
  scan uses the shortest invariant substring (`--floor-only`), not a sentence form.
- L34 — the derivation passes vacuously over an empty source set; the test asserts each orchestrator family text, each
  agent-cell brief and the floor script list is non-empty before it concludes "no invoker".
- L43 — the old pin checked the sentence agreed with itself; the new check binds the sentence to its referent
  (`ROUTE_POLICY` + the texts that would invoke the mode) so a routing change with the sentence untouched goes RED.
- L60 — each asserted property gets a negative control: an in-suite mutant (a `--floor-only` invocation spliced into
  the real `/pharn-loop` family text, and one into a rendered brief) must be flagged, and a temporary on-disk mutation
  in a scratch copy (an orchestrator line, and an `INVOCATIONS` cell) must turn the test RED; both are measured and
  recorded in `BUILD.md`.
- L75 — the sweep below lists each phrase with every hit and a disposition.

## Sweep (L33, L75): phrase → hits → disposition

- "Run inside an orchestrator" (`.claude/`, `pharn/`, `.dev/floor/`, `docs/`, `README.md`): `pharn-grill.md:127` —
  **edited** (removed). No other hit.
- "No orchestrator invokes" : `pharn-grill.md:111` — still true (kept, now derived); `command-hygiene.test.mjs:2751` —
  **edited** (bound to the derived fact).
- `--floor-only` outside `pharn-grill.md` on the product surface: `pharn/ARCHITECTURE.md:247` and
  `pharn/pharn-contracts/finding-shape.md:149` (define what the mode skips) — still true. Tests:
  `grill-scan.test.mjs:159`, `installed-skills-consumers.test.mjs:16, 101` — still true.
- "floor-only" as a grill history on the product surface: `pharn/floor/grill-scan.mjs:5-12`,
  `pharn/floor/grill-findings-core.mjs:9`, `pharn/floor/stage-agent-core.mjs:44-48`,
  `pharn/pharn-contracts/grill-triage.md:18` — dated past tense, still true. The policy name `floor-only` in
  `pharn-loop.md:590, 814-815`, `pharn-loop-quick.md:74`, `pharn-ship-quick.md:76`, `pharn-ship-stages.md:445` — still
  true (a policy cell, not the flag).
- Section comment `command-hygiene.test.mjs:2722-2726` — **edited**: says the test derives the fact rather than
  asserting it.

## The changes (exact intent)

1. `pharn-grill.md`: delete the sentence "Run inside an orchestrator, Step 4's "end your turn" does not apply: return
   to it." from the end of the `--floor-only` section. Nothing else in the file changes.
2. `command-hygiene.test.mjs`, FLOOR-ONLY GRILL section:
   - a function `floorOnlySources()` returning `[{where, text}]`: the family text (`commandText`) of every command that
     is a `ROUTE_POLICY` key (`pharn-ship`, `pharn-loop` — families include their parts); the `renderBrief` text of
     every `(command, mode)` whose `pharn-grill` cell is `AGENT`; and every non-test `pharn/floor/*.mjs` file.
   - a function `floorOnlyInvokers(sources)` returning `where:line` for each line holding `--floor-only`.
   - the existing test keeps its mode-line, skip-literal and scan pins, and replaces the bare sentence regex with:
     sources non-empty per class (L34), then `assert.equal(sentencePresent, invokers.length === 0, …)` with a message
     naming the invokers and telling the reader to update `pharn-grill.md`'s opening sentence of the `--floor-only`
     section when routing changes (and the reverse: restore it when the derived fact holds).
   - a control test (L60): splice ``invoke `/pharn-grill <name> --floor-only` `` into the real `/pharn-loop` family
     text and a `--floor-only` into a real rendered brief; `floorOnlyInvokers` must flag each.
   - the section comment says the fact is derived, not asserted.
3. Patch bump 7.25.4 → 7.25.5: `SKILLS_VERSION`, README badge, `npm run docs:generate` (pharn-install.json's
   `skillsVersion` and `pharn-grill.md` sha256), a new `## [7.25.5] - 2026-11-25` CHANGELOG section absorbing any
   `[Unreleased]` entries.

## Files

- `.claude/commands/pharn-grill.md` — remove the unreachable closing sentence — layer product command
- `.dev/floor/command-hygiene.test.mjs` — derive the routing fact, bind the sentence to it, controls — layer build
  apparatus
- `.dev/features/core-371-floor-only/BUILD.md` — build notes: the mutation measurements — layer build apparatus
- `CHANGELOG.md` — a new 7.25.5 section — layer repo-meta
- `SKILLS_VERSION` — 7.25.4 → 7.25.5 (patch: a correction to shipped bytes) — layer repo-meta
- `README.md` — the version badge only — layer repo-meta
- `pharn-install.json` — regenerated by `npm run docs:generate` — layer repo-meta (generated)

### Not in `## Files`, by design

- The temporary mutations (a `pharn-loop.md` line, an `INVOCATIONS` cell) are made in a scratch copy of the tree
  under the session scratchpad, never in this worktree.
- Generated regions (`docs/capabilities/**`, README `CURRENT-STATE`, `docs/lessons-index.md`): no `description:` or
  capability frontmatter changes; `docs:check` is re-run at build.

## Contracts satisfied

- None changed. The CHANGELOG entry follows CONTRIBUTING "CHANGELOG entries" and `.dev/guides/versioning.md`.

## Evals to write (P1)

- None: no capability, rule or checker behaviour changes. The test change is apparatus; its own negative controls are
  in-suite (change 2) plus the scratch-copy mutation run (BUILD.md).

## Guarantee audit (P0)

- "The `--floor-only` section's opening sentence is present exactly while no orchestrator text, agent-cell brief or
  floor script carries `--floor-only`" → floor: enum-regex (a `node --test` assertion over committed text and the
  rendered briefs). Bounded: it reads text for the literal flag, so an orchestrator that built the flag from parts, or
  a caller outside the scanned set (a user's own script), passes; it never proves a run did or did not invoke the mode.
- "Step 4's 'end your turn' applies to a direct `--floor-only` call" → advisory (command prose).

## Trust audit (P2)

- No untrusted input is ingested; the test reads committed repo files.

## Determinism audit (P5)

- The test's branch is a substring membership test over a fixed source set; no new runtime branch in any tool.

## Open questions (HALT)

- None open. GATE 1 is decided by the orchestrator under the user's delegation (recorded in SHIP.md, not a human
  approval).
