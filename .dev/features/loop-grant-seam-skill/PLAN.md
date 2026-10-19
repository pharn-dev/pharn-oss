# PLAN — loop-grant-seam-skill

- spec_content_hash: 2c84959cbca0b2dc51aaad90f90d40e574732c9c5c83c0bda7e1481ecb0db12e
- applied_lessons: [L22, L29, L33, L36, L60, L62]
- increment: `/pharn-build`'s seam-config `node -e` one-liner becomes a tested floor script called by one pinned line that `/pharn-loop` grants exactly (audit LOOP-5), and `/pharn-loop`'s wholesale `Skill` grant becomes five `Skill(<stage> *)` grants naming the stage commands it invokes inline (audit SEC-6).
- layer(s): product floor (`pharn/floor/`), product commands (`.claude/commands/pharn-build.md`, `pharn-loop.md`), dev floor test
- constitution_refs: [P0, P2, P5, P6, P7]

## Discovery (live, this run, at `94ad252b` = origin/main 6.64.3)

- `.claude/commands/pharn-build.md:187` holds the only copy of the seam one-liner (grep over the repo). The dev twin
  `pharn-dev-build.md` has no seam step, so nothing to change there.
- `.dev/floor/command-hygiene.test.mjs:5621-5624` excludes that line from the loop grant domain by name
  (`LOOP_GRANT_EXCLUDED`); `pharn-loop.md:186-188` discloses "the seam-config `node -e` line … may prompt".
- `pharn-loop.md:59` grants `"Skill"` wholesale; `command-hygiene.test.mjs:5620` (`LOOP_NON_BASH_GRANTS`) pins it.
- **The Skill tool IS used by a loop run — so dropping the grant would re-create the 6.58.0 prompt stall.** The loop
  tells the model to "invoke `/pharn-grill <name> --floor-only` yourself" (Step 4, every run) and, on a routed
  stage's start exit 3, to run `/pharn-spec --model-approve`, `/pharn-plan`, `/pharn-test`, `/pharn-build` inline.
  A model invokes a slash command through the Skill tool: that is recorded in `pharn/floor/stage-direct.mjs:18`
  (the 92-minute run called `/pharn-regress` / `/pharn-verify` through it) and in
  `.dev/features/orchestrator-direct-stage-calls/`. Stage AGENTS do not use it — their brief tells them to Read
  `.claude/commands/<stage>.md` (`stage-agent-core.mjs` `renderBrief`). The two parts carry
  `disable-model-invocation: true` and are Read. Regress/verify run through `stage-direct.mjs` (Bash) since 6.43.0.
- Claude Code docs (fetched this run via a docs agent; code.claude.com/docs/en/skills, /permissions,
  /tools-reference): `Skill(name)` is an exact match and `Skill(name *)` a "prefix match with any arguments"; the
  same `ToolName(specifier)` rule format applies in a skill's `allowed-tools`; matching is by skill NAME; the Skill
  tool is "Permission required: Yes"; commands were merged into skills. NOT documented: an example of a scoped
  `Skill(...)` inside `allowed-tools`. Every loop inline invocation carries arguments (`INVOCATIONS["pharn-loop"]`
  in `stage-agent-core.mjs`, plus `pharn-grill <name> --floor-only|--quick`), so the `*` form is the one needed.

## Applied lessons

- L22 — the seam step stops being inline JavaScript the model must reproduce byte-exact and becomes one pinned
  literal line (`node pharn/floor/seam-config-materialize.mjs`) whose behavior lives in a tested script.
- L29 — the Skill grant set is DERIVED from one enumeration (the loop's `INVOCATIONS` stage names plus the inline
  `pharn-grill`) and the test iterates it, not a hand list written for the stage in front of me.
- L33 — the "may prompt" disclosure in `pharn-loop.md` expires the moment the line is granted: removed in the same
  diff, and the CHANGELOG entry says it corrects CHANGELOG [6.61.0]'s "Not covered" bullet (no merged entry edited).
- L36 — closure both ways for the Skill grants (every `Skill(...)` grant equals the derived set; a bare `Skill`
  fails), the same equality the Bash grants already have.
- L60 — each new assertion gets a negative control that turns it red: a bare `Skill`, a `Skill(pharn-review *)`
  extra, a missing stage, and the seam line restored as `node -e` (no grant covers it).
- L62 — the script's HALT messages quote only `e.message` strings and fixed text; a parsed value is never
  stringified into a message, so no hostile JSON (`{"toString":1}`) can make the refusal throw. A test feeds one.

## Approach

1. **`pharn/floor/seam-config-materialize.mjs`** (new, product floor, Node stdlib, no args). Reads
   `pharn.config.json` at cwd and writes `.pharn/seam-config.json`, with the one-liner's three-way rule kept:
   absent → the documented default order; present + valid + no `seam` → default (`c.seam ?? default`, so a
   `"seam": null` still takes the default, as today); present + malformed JSON or unreadable → HALT exit 1, file
   not written. Output bytes identical to the one-liner (`JSON.stringify(seam, null, 2)`, no trailing newline).
   One stated change (Q1): a config whose top level is not a JSON object (`null`, an array, a string, a number)
   HALTs — `null` crashed the one-liner with a TypeError (exit 1, no message) and the others silently took the
   default. Prints one result line naming which branch ran. Validation stays `check-seam-config.mjs`'s job.
2. **`pharn-build.md` Step 2c**: the fence becomes the two pinned lines
   `node pharn/floor/seam-config-materialize.mjs` and the existing `check-seam-config.mjs` line; the comment block
   cites the script header instead of restating the three-way rule (P4); the HALT bullets keep their meaning.
3. **`pharn-loop.md` frontmatter**: add `"Bash(node pharn/floor/seam-config-materialize.mjs)"`; replace `"Skill"`
   with `"Skill(pharn-spec *)"`, `"Skill(pharn-plan *)"`, `"Skill(pharn-grill *)"`, `"Skill(pharn-test *)"`,
   `"Skill(pharn-build *)"`. **Prose (lines ~185-188 only):** "plus the file and Agent tools and the Skill tool for
   those five stage commands only"; drop "the seam-config `node -e` line … may prompt"; add one bound: the Skill
   grant matches by name, so whatever skill or command answers to that name runs, and any other skill (a user's
   `.claude/skills/` drop included) is not pre-approved. Concurrency: groups D/E edit other parts of this file.
4. **`command-hygiene.test.mjs`**: delete `LOOP_GRANT_EXCLUDED` and `isExcludedLoopLine`; `LOOP_NON_BASH_GRANTS`
   loses `Skill`; new `LOOP_SKILL_GRANTS` derived from `INVOCATIONS["pharn-loop"]` (both modes) + `pharn-grill`, the
   Skill grants must EQUAL it; negative controls per L60; the existing "only the loop carries a grant" and
   SEC-1/SEC-3 negative tests stay. Update the 6.61.0 header comment.
5. **Versions**: `SKILLS_VERSION` 6.64.3 → **6.65.0** (minor: a new product floor script). Command `version:`
   bumps — `pharn-build` 0.2.3 → 0.2.4, `pharn-loop` 0.13.0 → 0.13.1. One new CHANGELOG `## [6.65.0]` section.
6. Regenerate docs (`npm run docs:generate`) if `docs:check` REDs; raise a byte ceiling only by the documented rule
   if a measured total crosses one.

## Files

- `pharn/floor/seam-config-materialize.mjs` — new: extract the `seam` block to `.pharn/seam-config.json` — layer
  product floor
- `pharn/floor/seam-config-materialize.test.mjs` — new: hermetic tests, every branch, output fed through
  `check-seam-config.mjs` — layer product floor test (does not ship as methodology; no bump of its own)
- `.claude/commands/pharn-build.md` — Step 2c pinned line; `version:` — layer product command
- `.claude/commands/pharn-loop.md` — `allowed-tools` (one Bash grant added, `Skill` scoped), grant-bullet prose
  (~:185-188), `version:` — layer product command
- `.dev/floor/command-hygiene.test.mjs` — loop-grant test: exclusion removed, Skill grants derived and closed,
  negative controls; `COMMAND_BYTE_CEILINGS` only if a measured size crosses its ceiling — layer dev floor test
- `.dev/floor/stage-load-budget.test.mjs` — `STAGE_LOAD_CEILINGS` only if a measured total crosses its ceiling —
  layer dev floor test
- `SKILLS_VERSION` — 6.65.0 — repo meta
- `CHANGELOG.md` — new `## [6.65.0]` section — repo meta
- `README.md` — only the generated `CURRENT-STATE` region, only if `npm run docs:generate` changes it — generated
- `docs/capabilities/**` — only if `npm run docs:generate` changes it — generated
- `.dev/features/loop-grant-seam-skill/**` — this increment's stage artifacts (GRILL, REGRESSION, VERIFY, REVIEW,
  SHIP, reports)

## Contracts satisfied

- `pharn/pharn-contracts/seam-config.md` — the materialized file is the `seam` block that contract's schema
  describes; the script never validates it (that remains `check-seam-config.mjs`, cited, not restated).

## Evals to write (P1)

- No Capability (no `role:` file) is added, so no `evals/` pair is owed. The checker's tests are its spec:
  absent config → default bytes; config without `seam` → default; `seam` present → copied verbatim (2-space JSON);
  `"seam": null` → default; malformed JSON → exit 1 and no file; unreadable (a directory named
  `pharn.config.json`) → exit 1; top level `null` / `[]` / `"x"` / `3` → exit 1; `{"toString":1}` at top level is
  an object → its `seam` is absent → default (never throws); on HALT an existing `.pharn/seam-config.json` is
  untouched (Q1b); every written file passes `check-seam-config.mjs` when its source would.

## Guarantee audit (P0)

- "the seam step's extraction is tested" → floor: the script's behavior is pinned by its `node --test` suite
  (enum/regex + byte equality over spawned runs); that `/pharn-build` RUNS it is advisory (a model follows the step).
- "`/pharn-loop`'s grant covers every pinned line of its run, the seam line included, and nothing more" → floor:
  enum/regex — the command-hygiene equality between the Bash grants and the derived set, now with no exclusion.
- "the Skill grant names exactly the five stage commands the loop invokes inline" → floor: enum/regex equality in
  the same test, derived from `INVOCATIONS`.
- "an unattended inline build no longer prompts on the seam line" / "a user skill is no longer pre-approved" →
  **advisory**: whether Claude Code honors `allowed-tools`, and how it matches `Skill(name *)` there, is harness
  behavior (documented rule grammar; one live probe on Claude Code 2.1.303, `PROBE.md`, honored and
  name-discriminating — one version, `-p` only). Stated so in the command.
- "the grant matches by name" → advisory (Claude Code docs); a same-named skill answering to `pharn-build` would
  run under the grant — stated as a bound, not closed.

## Trust audit (P2)

- `pharn.config.json` is project input; the script copies its `seam` block without interpreting it and writes it
  to gitignored scratch. The verdict over it is still `check-seam-config.mjs`'s enum checks; free-text fields are
  ignored there. HALT messages carry fixed text plus `e.message` from Node, never a value read from the file.

## Determinism audit (P5)

- The script branches on `ENOENT` (code membership), `JSON.parse` success, and `typeof`/`Array.isArray` — all
  membership tests; every other case HALTs (the fail-closed fallback, which the command maps to "ask the human").

## Resolved at GATE 1 (2026-10-19 — a model decision by the orchestrator under the maintainer's delegation, not a human approval)

- Q1 — a `pharn.config.json` whose top level is not a JSON object HALTs (exit 1). Approved.
- Q1b — on HALT an older `.pharn/seam-config.json` is left in place, as the one-liner did. Approved.
- Q2 — NOT approved as first written (the orchestrator: the loop invokes `/pharn-grill` through the Skill tool on
  every run, so an ignored scoped grant would stall every unattended run). A live probe was run first:
  `PROBE.md`. Result: a scoped `Skill(<name> *)` in a command's `allowed-tools` IS honored and discriminates by
  name (Claude Code 2.1.303, `-p`, default mode) → decision branch (a): ship the five scoped grants and record the
  probe in the CHANGELOG. The probe also showed that a target declaring no `allowed-tools` (the five stage
  commands today) needs no grant at all, and that the bare `Skill` grant's only added effect was pre-approving a
  skill that declares `allowed-tools` — SEC-6's surface. The grant bullet states both.
- Q3 — follows from (a): no HUMAN-PATCH.md. The name-match bound lives in the loop's grant bullet.
