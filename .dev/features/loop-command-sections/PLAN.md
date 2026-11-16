# PLAN — loop-command-sections: drop the column padding from `/pharn-loop`'s stuck-point table

- spec_content_hash: d19c3ae5ef62837c025d3dffb5e878c114e0c1d4a745caf51b4c114b9e7a8bcf
- applied_lessons: [L12, L26, L57, L60]
- increment: rewrite the 26 lines of `.claude/commands/pharn-loop.md`'s Step 2 stuck-point table in Prettier's compact
  form (one space each side of every `|`, a `| --- | --- | --- |` separator) behind one `<!-- prettier-ignore -->` line,
  with every row's cell text unchanged; lower the file's command-budget ceiling with it; pin the compact form with a
  test. Linear CORE-109, step 1 only (SKILLS_VERSION 7.18.0 → 7.18.1, patch).
- layer(s): product command `.claude/commands/pharn-loop.md`; build apparatus (`.dev/floor/command-hygiene.test.mjs`,
  this feature folder); repo meta (`SKILLS_VERSION`, `CHANGELOG.md`, `README.md` badge).
- constitution_refs: [P0, P4, P6, P7]

## Scope decision — step 2 is not done

CORE-109 has two steps: (1) "reflow the stuck-point table without changing a row", then (2) "only if the baseline rates
it go", a new part file for the per-iteration steps (Steps 4 and 5). The baseline rates (2) **no-go**:
`.dev/measurements/loop-baseline-2026-11-11.md` §12 measures Steps 4 and 5 at 14,297 + 8,040 B on 7.10.3, about 5.6k
tokens (estimate), 2.4% of a 231k orchestrator request. So this increment delivers step 1 only: **no new part file, no
change to `EXPECTED_PARTS` (`pharn-loop: [quick, close]`) or to any pointer.** The decision is the batch
orchestrator's (a model) under the user's delegation, recorded here and in `SHIP.md`, not a human approval.

## Live state, read this run (main `259f27dd`, 7.18.0)

- `.claude/commands/pharn-loop.md`: 90,340 B. The stuck-point table is lines 472–497 under `## Step 2 — The stuck-point
table …`: a header, a separator and 24 rows (S1–S18, S6b, S6c, S9b, S14b, S14c, S15b), every line exactly 564
  characters, **14,738 B**. Every line splits into exactly three cells on `|` (no `\|` escape anywhere in the table) and
  no cell holds a run of two spaces, so trimming each cell loses nothing but padding.
- The compact form of the same 26 lines is **7,133 B** (7,158 B with the ignore line). Whole file: 90,340 → **82,785 B**
  (−7,555 B, −8.4%), measured on a scratch copy.
- **Prettier 3.9.10** (`.prettierrc.json`: `printWidth` 140, `proseWrap` unset = `preserve`): on the compact table it
  **re-pads every column** — measured. Its compact table printer is used only under `proseWrap: never`
  (`--prose-wrap never` printed the compact form, measured), and setting that for this file would re-flow every
  wrapped paragraph in it. So the one form that drops the padding and survives `format:check` is the compact table
  behind Prettier's own `<!-- prettier-ignore -->` (which skips the next node): `prettier --check` passed on it,
  measured with the repo config on a copy (re-measured at the real path at build, L26).
- **markdownlint-cli2 0.23.3 / markdownlint 0.41.1** with this repo's config: 0 issues on the compact table with the
  ignore line directly above it (MD055 pipe style, MD056 column count, MD058 blanks around tables all hold), measured on
  a copy with `--no-globs` (L57).
- Tests that read the table by regex (`command-hygiene.test.mjs` `STUCK_POINTS` and the S14b/S14c/S18 rows,
  `check-loop-record.test.mjs`'s `^\| S\d+[a-z]? +\|`, `entry-gates.test.mjs`'s `^\| S14\s+\|` family,
  `stage-agent-core.test.mjs`'s `LOOP_ROWS`) all accept one space: on a scratch copy of HEAD with the compact table,
  `command-hygiene`, `command-family`, `check-loop-record`, `stage-agent-core`, `entry-gates`, `command-section` and
  `stage-load-budget` ran 582 + 6 tests, 0 fail (2 skipped, as at HEAD). `npm run docs:check` stayed GREEN there.
- **The ceiling is not in `command-family.test.mjs`** (the ticket's wording): `command-family.test.mjs` closes the parts
  (`EXPECTED_PARTS`) and has no byte rows. The per-file ceiling is `COMMAND_BYTE_CEILINGS["pharn-loop.md"]` = 93,184 in
  `.dev/floor/command-hygiene.test.mjs` (THE COMMAND BUDGET section). By its rule (measured + 10%, up to a multiple of
  512): 82,785 × 1.1 = 91,063.5 → **91,136**.
- The family (`pharn-loop.md` + `pharn-loop-quick.md` 11,568 + `pharn-loop-close.md` 41,481): 143,389 → **135,834 B**.
  `STAGE_LOAD_CEILINGS["pharn-loop"]` (195,072, `stage-load-budget.test.mjs`) is left as is: the ticket names the
  command row, and a total that falls stays inside it.
- The ceiling comments record that the padding grew twice (7.5.0 and 7.9.0: a longer S14/S14b/S17 trigger "widened the
  stuck-point table's padding"): one long cell re-pads all 26 lines. After this change a new row costs its own bytes.
- Coordination: a sibling PR (CORE-107) edits stage Agent-call lines in `pharn-loop.md` and may move ceiling rows. This
  increment touches only the table lines, the ceiling row and its comment, one new test, and repo meta.

## Applied lessons

- L12 — Build Step 2b formats the written files (`prettier --write` + `markdownlint-cli2 --no-globs --fix` on the
  declared paths only), and the build checks that `prettier --write` leaves the compact table byte-identical, so the
  formatter cannot undo the change while verify's style gates stay the real check.
- L26 — The scratch-copy measurements above are not the proof: build re-runs `prettier --check` and markdownlint on
  `.claude/commands/pharn-loop.md` at its real path, under the repo's own config resolution, and verify runs the
  whole-repo `format:check` and `lint:md`.
- L57 — Every markdownlint call names its file with `--no-globs`, and the build reads `Linting: 1 file(s)` from its
  output; no repo-wide formatter run.
- L60 — The new compact-form test asserts three properties (the ignore line sits directly above the header, the
  separator is `| --- | --- | --- |`, every row equals its trimmed-cell rejoin), and each gets its own negative control
  run through the same predicate: the ignore line removed, a padded separator, one padded row. Its table anchor is
  asserted found before any slice (no `-1` slice).

## Files

- `.claude/commands/pharn-loop.md` — the stuck-point table (lines 472–497) rewritten compact, `<!-- prettier-ignore -->`
  directly above its header; no other line changes — layer product command
- `.dev/floor/command-hygiene.test.mjs` — `COMMAND_BYTE_CEILINGS["pharn-loop.md"]` 93,184 → 91,136 with one comment
  line; one ✧ test pinning the compact form, with its three negative controls — apparatus test
- `SKILLS_VERSION` — 7.18.0 → 7.18.1 — repo meta
- `CHANGELOG.md` — `## [7.18.1] - 2026-11-16`, one `### Changed` entry — repo meta
- `README.md` — the version badge 7.18.0 → 7.18.1 (`check:badge`) — repo meta
- `.dev/features/loop-command-sections/BUILD.md` — the measured before/after bytes, the Prettier and markdownlint
  readings at the real path, and the row-identity check (AC 6) — apparatus record

### Not changed

- No new part file, no `EXPECTED_PARTS` / `PLACEMENT` edit, no pointer text (step 2 is not done).
- `MIN_CLI` unchanged. `.prettierrc.json` and `.markdownlint-cli2.jsonc` unchanged (no override: `proseWrap: never` for
  this file would re-flow its prose).

## Acceptance criteria (CORE-109) and how each is shown

1. **`pharn-loop.md` bytes fall and its ceiling row goes down with them.** Met by construction: 90,340 → 82,785 B
   (re-measured at build), row 93,184 → 91,136; the COMMAND BUDGET R2 test holds the file under the new row.
2. **No fenced line or heading sits in two files of the family.** Unchanged headings and fences; shown by
   `command-family.test.mjs` R6 green at verify.
3. **The pointer names the path, load condition and not-loaded rule.** **N/A**: no new part, so no new pointer. The two
   existing pointers are untouched and R5 stays green.
4. **Every heading still resolves through `command-section.mjs`.** No heading changes; shown by
   `command-section.test.mjs` (every heading of both orchestrators resolves) and, at build, by running
   `node pharn/floor/command-section.mjs .claude/commands/pharn-loop.md '<heading>'` for every `##`/`###` heading of the
   file and recording each exit in `BUILD.md`.
5. **The family's total load does not rise.** 143,389 → 135,834 B; `stage-load-budget.test.mjs` green.
6. **The run reaches the same verdicts on the benchmark features.** Argued by construction instead of a loop run: the
   table's cell text is what a run reads, and the build records a differential check over `git show HEAD:…` and the
   working file — the same 26 lines in the same order, each splitting into the same three trimmed cells (header and the
   24 rows byte-identical after trimming; only the separator's dash count and the padding differ). The existing row pins
   (`STUCK_POINTS`, `BLOCKED_IDS` equality, the S14/S14b/S14c/S15/S18 row regexes) stay green unchanged. Bound: this
   shows the instruction text is identical; that a model reads a compact table as it reads a padded one is not measured
   (advisory).

## Evals to write (P1)

- No capability is added or changed (`pharn/floor/validate.mjs` scans none of these paths). The test is the check:
  `command-hygiene.test.mjs` ✧ compact-form test → GREEN on the live file; RED on each of its three mutants.

## Guarantee audit (P0)

- "`pharn-loop.md` is at most 91,136 B" → floor: enum/regex-class byte comparison in the COMMAND BUDGET R2 test.
- "The stuck-point table carries no column padding and keeps its ignore line" → floor: the new test's string equality
  over the file's lines (primitive #3).
- "Every row's text is unchanged" → floor for the existing per-row pins; the full-table identity is a one-time build
  record (`BUILD.md`), not a standing check.
- "`format:check` and `lint:md` stay green" → floor: verify's gate map (`check-verify.mjs`).
- "A run reaches the same verdicts" → advisory (by construction from identical text; no loop run).
- "The orchestrator carries ~7.5 KB less per request" → bytes measured; a token figure is an estimate (runs of spaces
  tokenize densely, so the token saving is smaller than bytes ÷ 4) and is stated as such.

## Trust audit (P2)

- No untrusted input is ingested. The test reads a trusted command file of this repo.

## Determinism audit (P5)

- No new branch in any shipped code. The test is string equality over fixed lines.

## Open questions (HALT)

- Q1 — The ceiling row lives in `command-hygiene.test.mjs` (`COMMAND_BYTE_CEILINGS`), not `command-family.test.mjs` as
  the ticket says. Recommended: edit `command-hygiene.test.mjs` only.
- Q2 — Add the compact-form pin test? Recommended: yes. Without it, removing the ignore line and running
  `prettier --write` re-pads the table (≈ 90.4 KB) silently under the new 91,136 ceiling. Trigger (P7): the padding grew
  twice already (7.5.0, 7.9.0 ceiling comments).
- Q3 — Lower `STAGE_LOAD_CEILINGS["pharn-loop"]` too? Recommended: no (the ticket names the command row; a falling
  total needs no row change, and it keeps the sibling CORE-107 conflict surface small).
