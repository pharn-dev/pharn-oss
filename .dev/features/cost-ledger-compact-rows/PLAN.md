# PLAN — cost-ledger-compact-rows

- spec_content_hash: edc3d07df3ef76f983fe3763671eb66aa37c242f46f0e4c0fbca30ce091a5d2c
- applied_lessons: [L23, L24, L29, L34, L35, L41, L47, L50]
- increment: `render-cost-ledger.mjs` writes `cost.json` with the two row arrays, `requests[]` and `markers[]`, one element per line, and the rest of the document pretty-printed as before. The parsed JSON is unchanged, and the output is still byte-deterministic.
- layer(s): product floor (`pharn/floor/`) + `pharn/pharn-contracts/cost-ledger.md`
- constitution_refs: [P0, P1, P3, P6, P7]

## The defect (measured this run, read-only, against the downstream repo)

A real dogfood failure (P7). `pharn-starter` (PHARN 6.12.1) merged PR #104 (`c241cb3`), and the parent
session measured it at 38,927 added lines. **33,051 of those lines are one file,**
`pharn/features/org-slug-routing/cost.json`. Measured here on that committed file:

- 630 request rows and 14 markers;
- 33,051 lines and 960,206 bytes (`wc -lc`);
- about 52 lines per request row. The emitter writes `JSON.stringify(ledger, null, 2)`
  (`render-cost-ledger.mjs:829` after increment (a)), which expands every nested object of every row,
  including the verbatim `usage` copy and its `usage.iterations[]`;
- the file is byte-equal to `JSON.stringify(JSON.parse(file), null, 2) + "\n"`, so it is the unmodified
  emitter output.

The 14 `cost.json` files that repo has committed total **231,615 lines** and 6,704,361 bytes.

The contract's "Size, disclosed rather than discovered" section measured the cost in **KiB** (402,567
bytes for a 275-row run). The cost that actually hurt was **LINE COUNT in PR diffs**, and nobody had
measured it. The parent session prototyped the change: pretty-printing everything except `requests[]` and
`markers[]`, written one element per line, gave 824 lines and 629,336 bytes, and `JSON.parse` of it is
deep-equal to the original.

## Applied lessons

- L24: the contract's size figure (and its two restatements) describes the OLD serialization. Once the
  emitter's output changes, the claim is void until it is re-measured on the new form. The build
  re-measures the downstream ledger with the new serializer and writes the before and after numbers, in
  lines and in bytes, rather than carrying the old sentence over with a softened adjective.
- L50: the retracted claim is "~393 KiB of pretty-printed JSON". It is swept by its REFERENT, not only by
  its wording. Every restatement of the emitter's size was found with a grep for `393 KiB`, `402,567` and
  `SIZE`: the contract's Size section, the emitter's `SIZE` header block, and `CLAUDE.md`'s cost-ledger
  paragraph. All three are in `## Files`. The released CHANGELOG entries that quote the old figure are
  frozen history and stay as they are.
- L35: the emitter header and `CLAUDE.md` each RESTATE the contract's numbers. That makes three stores of
  one measurement. The emitter header's copy is retired and replaced by a pointer to the contract section,
  so the numbers live in one shipped place. `CLAUDE.md` keeps a one-line summary, which is its role, and it
  cites the contract section for the figures.
- L47: the new Size text states **dated measurements with provenance** ("measured 2026-09-23 on …"), never
  an open-ended quantifier like "the file is N lines". A measurement stays true as the emitter changes; a
  present-tense count expires.
- L29: parse-equality is asserted over the SET of ledger shapes the emitter produces, in one table that
  one loop iterates. The set covers a bounded window with rows, an open window, the subagent rows, the
  observed-zero `partial`, the unknown-window `unavailable`, and a transcript-absence shell. It is not one
  hand-picked ledger.
- L34: the equality table asserts that it is non-empty, and that at least one case has rows AND markers.
  Otherwise "every element on its own line" could hold vacuously over empty arrays.
- L41: the CLI has two output paths, the file write and `--stdout`. Each gets a test that runs the real CLI
  and compares its bytes with `serializeLedger()`, so neither path can keep the old `JSON.stringify` call
  unnoticed.
- L23: `pharn/features/*/cost.json` is already in `.prettierignore` and excluded from markdownlint. So the
  new layout, which prettier would re-expand, cannot collide with this repo's own `format:check`. The build
  confirms the ignore entry still matches.

## Files

- `pharn/floor/render-cost-ledger.mjs` — add `ROW_ARRAYS` (`["markers", "requests"]`) and `serializeLedger(ledger)`; the CLI's file write and `--stdout` both use it; the `SIZE` header block becomes a pointer to the contract's Size section (L35) — layer product floor
- `pharn/floor/render-cost-ledger.test.mjs` — parse-equality over the enumerated shape set; byte-determinism; one-row-per-line shape; the CLI write path and `--stdout` emit exactly `serializeLedger`'s bytes; the checker CLI and the run-report reader accept the written file — layer product floor (test; does not ship)
- `pharn/pharn-contracts/cost-ledger.md` — the Size section states the serialization rule and the measured line-count and byte cost, before and after, dated and sourced — layer pharn-contracts
- `CHANGELOG.md` — a `### Changed` entry for this increment in the `## [6.13.1] - 2026-09-23` section this PR opened (not yet merged, so not frozen) — repo meta
- `CLAUDE.md` — the cost-ledger paragraph's `SIZE` sentence states the new layout and cites the contract section for the figures — repo meta

### Deliberately NOT touched

- `SKILLS_VERSION` and the README badge. This PR already bumps to 6.13.1 in increment (a), and one bump
  covers the PR. The change is a patch: parsed content is identical, and no consumer reads the layout.
- The ledger's schema, keys, and values. That includes `usage` and `usage.iterations[]`. Dropping the
  verbatim `usage` copy or its `iterations[]` would cut the byte cost much further, but it is a
  fidelity/schema decision (`pharn-cost-ledger/3`) and is OUT of scope. It is recorded as considered and
  deferred.
- `check-cost-ledger.mjs`, `render-run-report.mjs`, the two emitting commands, `reconcile-ignore.json`,
  `worktree-fingerprint.mjs`, `check-regress.mjs`. The consumer sweep below found none of them depending on
  the byte layout.
- The four trusted docs and `MIN_CLI`. An older CLI installs the same tree, and nothing it installs reads
  the layout.

## Design

**The rule.** The document is pretty-printed at a 2-space indent exactly as today, with one exception. The
**fact arrays** `markers[]` and `requests[]` are written one element per line: each element is
`JSON.stringify(element)`, indented 4 spaces, with a trailing comma on every element but the last. An
empty fact array stays `[]`.

**Why exactly those two, justified from the contract's own principle ("record facts, derive views"):**

- They are the two FACT arrays, in the contract's own term. `requests[]` is O(requests), and each element
  is a deep object of about 52 pretty-printed lines. `markers[]` is O(boundaries), and its elements are
  flat, so one per line costs nothing in readability. Every other array is either a derived view or an
  array of strings.
- The DERIVED views (`totals`, `by_model`, `by_stage_iteration_model`, `unattributed`) are bounded by
  stages × iterations × models. They are what a human reads to learn the cost, so they stay pretty-printed.
- `dropped[]`, `sessions[]` and `claude_code_versions[]` are arrays of strings. Pretty-printing already puts
  each string on its own line.
- With one row per line, a diff between two emissions touches one line per changed request, not about 52.

**Implementation.** Top-level keys are walked in insertion order, which is the emitter's own fixed order.
Each non-fact value is serialized with `JSON.stringify(v, null, 2)`, re-indented by two spaces. Keys whose
value `JSON.stringify` would omit (`undefined`, a function) are skipped the same way, and an element that
stringifies to `undefined` becomes `null`, as it does inside a JSON array. There is no clock, no
randomness, and no locale. Output bytes are a pure function of the ledger object, which is itself a pure
function of the transcript and markers bytes (unchanged). The file ends with `\n`.

**Consumer sweep (P6, read this run).** The command was
`grep -rln 'cost\.json' --exclude-dir=node_modules --exclude-dir=.git .`, plus the importers of
`render-cost-ledger`. Every consumer that reads the file's contents goes through `JSON.parse`, and the rest
name the file only by its name:

- `check-cost-ledger.mjs:581` uses `JSON.parse(readFileSync(file))`.
- `render-run-report.mjs` `readJson()` uses `JSON.parse`.
- `/pharn-loop` and `/pharn-ship` invoke the emitter and checker CLIs and stage the file by path. Neither
  reads bytes.
- `reconcile-ignore.json` (`pipeline_artifacts.names`), `worktree-fingerprint.mjs` (`EXCLUDED_ARTIFACTS`)
  and `check-regress.mjs` (its feature-artifact exemption) all match the FILENAME only.
- `.prettierignore` and `.markdownlint-cli2.jsonc` match the path only.
- The tests:
  - `render-cost-ledger.test.mjs` parses what the CLI writes;
  - `check-cost-ledger.test.mjs` writes `JSON.stringify(…, null, 2)` itself for its CLI cases;
  - `check-loop-fresh.test.mjs` writes a placeholder string into a `cost.json` it never parses.
- The historical `.dev/features/cost-ship-integration-review/integration-probe.mjs` parses it.

Nothing depends on the byte layout.

## Contracts satisfied

- `pharn/pharn-contracts/cost-ledger.md`: this edits the contract's own Size section. The object example,
  the field table, the closed key set and every FLOOR rule are unchanged, because they are about parsed
  content, which does not move.

## Evals to write (P1)

No capability (`role:`), so no eval pair is owed. Tests:

1. **Parse-equality over the shape set (L29/L34).** For each shape, `JSON.parse(serializeLedger(l))`
   deep-equals `JSON.parse(JSON.stringify(l, null, 2))`, and deep-equals `l`. The shapes are: bounded with
   rows, open with rows, subagents, observed-zero `partial`, unknown-window `unavailable`, and the
   no-session shell. The table is asserted non-empty, with ≥1 case that has rows and markers.
2. **Shape.** For a ledger with rows, each of `requests.length` lines starting with `{"request_id":`
   parses on its own (trailing comma stripped) to the corresponding row, and the same holds for markers.
   The line count equals the pretty-printed line count of the ledger WITHOUT the two arrays, plus one line
   per element. Recorded as a closure (L36): no row spans two lines.
3. **Determinism.** Serializing the same object twice gives identical bytes, and emitting the same inputs
   twice through the CLI gives identical file bytes.
4. **CLI paths (L41).** The file write and `--stdout` each equal `serializeLedger(renderLedger(sameOpts))`
   byte-for-byte. The checker CLI is GREEN on the written file, and `render-run-report.mjs`'s `readJson`
   parses it deep-equal to the object.
5. **Mutation control.** The old `JSON.stringify(l, null, 2) + "\n"` output FAILS the shape assertion in 2
   (a row spans many lines), so the assertion cannot pass on the pre-change emitter.
6. **The existing suites pass unmodified.**

## Guarantee audit (P0)

- "`cost.json` parses to the same object as before" → **floor: test.** Deep-equality over the enumerated
  shape set. That covers the shapes named, not every conceivable ledger. JSON.parse of `JSON.stringify` of
  each element is the standard round-trip, and it is the same function the old format used element by
  element.
- "the output is byte-deterministic for the same inputs" → **floor: test** (double serialization and a
  double CLI emission), resting on the existing "same transcript bytes AND same markers bytes" bound.
- "nothing depends on the byte layout" → **advisory.** It is a sweep of this repo read this run, and it
  cannot see consumers outside the repo, such as a user's own script that greps `cost.json`.
- "the new file is N lines for the downstream run" → **a dated measurement**, recorded with its method.
  It is not a floor claim, and the contract says so.

## Trust audit (P2)

No new input. The serialized values are the same sanitized values as before: identity fields bounded,
`usage` leaves filtered, no absolute path. `JSON.stringify` escapes every control character, so a
transcript-sourced string cannot inject a raw newline and break "one row per line". A test pins that with a
row carrying an escaped newline in a permitted field.

## Determinism audit (P5)

No branch beyond key membership in `ROW_ARRAYS` and an `Array.isArray` test.

## Deferred (considered, out of scope)

- **Dropping `usage.iterations[]` or the verbatim `usage` copy.** In the downstream ledger that copy is
  about 20,790 of its 33,051 lines in the old layout. It is the biggest remaining BYTE cost after this
  change. Removing it is a fidelity and schema decision, so it is recorded here and in the PR, not taken.
- **A user project's own formatter** re-expanding `cost.json`. PHARN ships no `.prettierignore` entry into
  an install. That changes bytes, never the parse, and nothing reads the layout.

## Open questions (HALT)

- none
