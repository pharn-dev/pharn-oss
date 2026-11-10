# PLAN — s14-gates-exclude-remedy

- spec_content_hash: ab4dbd928b96b51bdb54ee12b91e87a95d1ba144013a26b8f20ffa9b4122c7fd
- applied_lessons: [L29, L33]
- increment: `/pharn-loop`'s S14 and S14b rows and its Step 4 exit-4 / exit-6 stop procedure name the
  `pharn.config.json` `gates.exclude` declaration next to `--allow-red-entry`, with its disclosed cost; a test pins
  all four sites; `SKILLS_VERSION` 7.3.1 → 7.3.2 (patch) with its CHANGELOG entry.
- layer(s): product `.claude` surface (`.claude/commands/pharn-loop.md`); product-floor test (never ships); repo-meta
- constitution_refs: [P0, P4, P6, P7]

## Trigger (P7)

Measured 2026-11-10: a `/pharn-loop` run stopped S14 (`blocked: gates-red-at-entry`) because the `e2e` gate could not
run (Playwright browsers not installed). The S14 row (`pharn-loop.md:435`) offers only "fix the gate first, or re-run
with `--allow-red-entry`", and the exit-4 bullet (`:711–712`) offers nothing but `--allow-red-entry`. The declaration
built in 6.36.0 for exactly this case — `{ "gates": { "exclude": ["e2e"] } }` (`gate-run-record.md`, "Excluding a
discovered gate") — went unnamed, so the agent's stop message did not offer it. S14b is half-covered: its exit-6
bullet (`:713–717`) names `gates.exclude`, its row (`:436`) says only "exclude it", and neither states the cost.

Live check that the remedy works at entry: `entry-gates-core.mjs` reads the stamp's `excluded` block (`:297`), and the
entry runner discovers through `run-gates.mjs init --discover`, which applies the declaration — so an excluded gate is
neither run nor red at entry.

## Applied lessons

- L29 — the remedy is quantified over a set (S14 and S14b, each as a table row AND as a stop-procedure bullet), so the
  new test materializes that four-member enumeration in one array and every assertion iterates it; no assertion is
  written for one member.
- L33 — the remedy sites were enumerated from the shortest invariant substring (`allow-red-entry`) across `.claude`,
  `pharn/`, `README.md` and `docs/`, not from the prompt's list; that sweep found the README's stop paragraph
  (`README.md:142–145`), which makes the same incomplete offer and is included. The other hits are excluded below,
  each with its reason.

## Design

1. **S14 row** (`pharn-loop.md:435`, remedy cell). Becomes: stop `blocked: gates-red-at-entry` — fix the gate first;
   if the gate cannot run on this machine, list it in `pharn.config.json` `gates.exclude` and commit that before the
   re-run (an excluded gate does not run and is reported as excluded); or re-run with `--allow-red-entry` when fixing
   it is the feature.
2. **S14b row** (`:436`). "exclude it" becomes "list it in `pharn.config.json` `gates.exclude` (an excluded gate does
   not run and is reported as excluded)".
3. **Exit-4 bullet** (`:711–712`). After the copy-to-`### next_steps` sentence, add the remedies to copy with the ids:
   fix the gate; if it cannot run on this machine, list it in `pharn.config.json` `gates.exclude` (committed before
   the re-run; an excluded gate does not run and is reported as excluded); or re-run with `--allow-red-entry` when
   fixing it is the feature.
4. **Exit-6 bullet** (`:713–717`). Its existing `gates.exclude` remedy gains the same cost clause.
5. **No classification change.** Nothing about exit 4 vs 6, red vs unmeasured, or which gate is red changes, and the
   stop procedure still copies ids from the JSON document, never gate output. The new text only names a remedy for a
   person; the run itself never writes `pharn.config.json` (it is not in any stage's scope, and the loop has no ask).
6. **README** (`:142–145`, hand-written prose outside the generated markers): after "Pass `--allow-red-entry` …",
   add one sentence: a gate that cannot run on your machine can instead be listed in `pharn.config.json`
   `gates.exclude`; it then does not run and runs report it as excluded. The badge moves to 7.3.2 (`check:badge`).
7. **Test** (`pharn/floor/entry-gates.test.mjs`, beside the existing "S14 and S14b rows exist" test): one array of the
   four sites — the `| S14 |` row line, the `| S14b |` row line, the exit-4 bullet, the exit-6 bullet (each bullet
   sliced from its `- \`N\` → **S14…**`start to the next`\n- `) — and for each: it is found, and it matches
`gates.exclude`,`--allow-red-entry`,`does not run`and`reported as excluded`. The exit-6 bullet already names
`--allow-red-entry`. If the added bullet text pushes`changed_paths` past the WIRING test's 1900-char branch
   slice (today at offset 1181), widen that slice — a test-only change.
8. **Version + CHANGELOG.** `SKILLS_VERSION` 7.3.2; a `## [7.3.2] - 2026-11-10` section above 7.3.1 with one
   `### Changed` entry (the [Unreleased] section is empty, so nothing moves).

## Widened at GATE 2 (human-approved, 2026-11-10)

The verify re-run after the S14b fix failed one test: `check-ship-record.test.mjs` P5 asserts every committed
`.dev/features/*/SHIP.md` carries NO verdict block, exempting only `dev-verdict-discipline` by name. `/pharn-dev-ship`
Step 3 now requires that block, so this run's `SHIP.md` — the first written since 7.3.0 — reds it, and every later
ship record would too. P5 becomes: a record with no block reads as legacy (the >100 count stays), and a record that
carries a block parses with zero defects. Test-only, apparatus, no bump.

## Files

- `.claude/commands/pharn-loop.md` — S14/S14b rows and the exit-4/exit-6 stop procedure name `gates.exclude` with its
  cost — product `.claude` surface
- `pharn/floor/entry-gates.test.mjs` — the four-site enumeration test — product-floor test (never ships)
- `README.md` — the stop paragraph names `gates.exclude`; badge 7.3.2 — repo-meta
- `SKILLS_VERSION` — 7.3.1 → 7.3.2 — repo-meta
- `CHANGELOG.md` — the 7.3.2 entry — repo-meta
- `.dev/floor/check-ship-record.test.mjs` — P5 accepts a well-formed block (added at GATE 2, see below) — dev test

### Excluded (not written by this increment)

- `.claude/commands/pharn-loop.md:244–246` and `pharn-loop-quick.md:32` — they define the `--allow-red-entry` flag,
  not a stop's remedy.
- `.claude/commands/pharn-ship-stages.md` (entry exit 4/6) — `/pharn-ship` asks a person Stop / Continue with the ids
  in front of them; the measured failure is `/pharn-loop`'s, so changing the ship's form is unrequested (P7).
- `.claude/commands/pharn-loop-close.md` Step 7 — it reports the run's needs from the row and `### next_steps`, which
  this increment fixes at the source.
- `pharn/floor/entry-gates-core.mjs:58` — a different case (a non-style gate that may read a front-stage write), for
  which `gates.exclude` is not the remedy.

## Contracts satisfied

- `pharn/pharn-contracts/gate-run-record.md`, "Excluding a discovered gate" — cited for the declaration, its
  commit-before-the-run rule and the `excluded` block that reports it; not restated (P4).
- `pharn/pharn-contracts/loop-record.md` — the `blocked:` set is unchanged.

## Evals to write (P1)

No capability or `rule_id` changes, so no eval pair. The test in Design 7 → each of the four sites names
`gates.exclude`, `--allow-red-entry` and the cost; removing any one from any site REDs it.

## Guarantee audit (P0)

- "the S14/S14b rows and stop procedure name `gates.exclude` with its cost" → floor: enum-regex, the test in Design 7
  (presence in each of the four enumerated sites).
- "the agent's stop message now offers it" → advisory: the agent copies remedies into `### next_steps` and its
  summary; nothing checks the words it writes.
- "an excluded gate does not run and is reported as excluded" → cited from 6.36.0's mechanism (`resolveSet`, the
  stamp's `excluded` block, `pharn-loop-close.md` Step 7's excluded-gates line); this increment claims nothing new.
- "red-gate classification is unchanged" → no checker, stamp or exit-code file is in `## Files`; regress's scope check
  covers that.

## Trust audit (P2)

No new input. The ids copied into `### next_steps` stay DATA, as before; the added remedy text is fixed command prose.

## Open questions (HALT)

- none
