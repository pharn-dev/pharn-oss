# BUILD — plan-scope-hardening

GATE 1: decided by the batch orchestrator (a model) under the owner's delegation, 2026-11-03 — decisions 1–5 as
recommended (1 with two conditions: the `--check` plan-time line, and the one-sentence rule), decision 6 changed
(`core.hooksPath` best-effort outside an install). Recorded in `PLAN.md`.

Round 2 (orchestrator, 2026-11-03, before the owner applied anything): an independent adversarial review of the first
`apply.py`, clone-tested, found fail-open paths — absolute and root-escaping entries past every prefix refusal (and
the Step 2b formatters rewrote canon through the absolute path), an unclosed inline `<!--` hiding a later visible
heading (a regression of the first patch), raw HTML blocks, lone-CR line endings, and labels the colon rule missed.
The colon rule was replaced by the one-contiguous-list rule, and the hook was re-patched from the same BEFORE pin.

## What landed (Write/Edit tool, inside the plan's `## Files`)

- `pharn/floor/plan-files-core.mjs` — `LINE_SPLIT_RE` (`\r\n|\r|\n`), `scanLines` / `commentStart` (CommonMark comment
  blocks, inline comments closed on their line, code spans and backslash escapes), `FILES_HEADING_RE`,
  `refusalReason`, the second-heading, raw-HTML-block and split-list refusals; `fenceStates` is a view of `scanLines`.
- `pharn/floor/render-ship-briefing.mjs` — lines split on all three endings; headings read through `scanLines`
  (comment blocks skipped) and `FILES_HEADING_RE`.
- `pharn/floor/apply-plan-deletions.mjs` — the reader's own refusal reason.
- Tests: `check-build-complete.test.mjs` (★ `READER_FIXTURES`; the older cue and fence fixtures re-expressed for the
  contiguous-list rule), `render-ship-briefing.test.mjs`, `apply-plan-deletions.test.mjs`,
  `.claude/hooks/set-writes-scope.test.cjs` (7.3.0 block, the escaping-entry matrix, ✧ pins),
  `.claude/hooks/enforce-writes-scope.test.cjs` (three setter fixtures: an exclusion under the heading form, and two
  head-less exclusion intros that now refuse), `.dev/floor/command-hygiene.test.mjs` (`--no-install` pins; ✧ canon in
  both ignore files).
- Commands: `pharn-dev-build.md` (`npx --no-install`, Step 0 STOP sentence), `pharn-plan.md` and `pharn-dev-plan.md`
  (the `--check` line and "one contiguous list; no labels between items"), `pharn-loop.md` (one grant for the
  `--check` line).
- Config/docs: `.prettierignore`, `.markdownlint-cli2.jsonc`, `pharn/floor/README.md`, `pharn/pharn-contracts/ac-tests.md`,
  `.dev/guides/writes-scope.md`, `CHANGELOG.md` `[Unreleased]`, `DOCS-PROPOSAL.md`.
- Human patch: `.claude/hooks/set-writes-scope.cjs` via `apply.py` (uncommitted; see "apply.py proof").

## Measurements

- **Corpus** (all 342 committed `PLAN.md` / `AC-TESTS.md` at 7.2.1, the pre-batch reader vs the round-2 one): 0
  carry two visible `## Files`; with code-span-aware comment handling every list reads as before (a naive stripper
  broke `spec-template/PLAN.md`, whose `<!--` sits in a code span); 32 would be refused by the contiguous-list rule
  (labels, exclusion intros, prose, lazy or post-blank continuations between items — the nested-under-a-wrapped-line
  check adds one of them). The first patch's colon rule counted 22 (15 before `**Label:**` emphasis was counted); a
  widened cue word list instead silently truncated 3 more plans.
- **markdown-it 15.0.3 oracle, round 2** (offline probe, `scratchpad/g1/mdit2.mjs`; the visible `<li>` code items
  under a visible `<h2>Files</h2>`): agreement on the comment-hidden heading, a comment block holding items, a one-line
  comment block, `<!-->`, `<!--->`, an unclosed comment block, `<!--` in a code span, a trailing inline comment, the
  stray unclosed inline `<!--` before `### Explicitly not touched` (2a), the escaped opener (2a) and the lone-CR
  heading (2c). Refusals where the renderer shows a list: a `<div>` holding a comment opener and a fence inside a
  `<div>` (2b, fail-loud), and an inline `<!--` at an item's end whose closer sits on a line between items (the closer
  line splits the list). One stated bound, fewer paths: a comment block opened inside a list item hides until its
  closer, past the item's end, where markdown-it shows the next item.
- **Formatter reach:** `prettier --file-info .dev/memory-bank/lessons-learned.md` → `ignored: true` (also
  `pharn/memory-bank/x.md`); `markdownlint-cli2 --no-globs .dev/memory-bank/lessons-learned.md` → `Linting: 0 files`.
  An absolute path never reaches them now: the setter refuses it (`notProjectRelative`).

## Floor

- `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 37 capabilities checked in "."` (exit 0).
- `check:changelog-entry --merge-base origin/main` → GREEN.

## apply.py proof (L26 — a real clone with its own configs and `node_modules`)

- Round 2 script `.dev/features/plan-scope-hardening/apply.py` (uncommitted), sha256
  `eb65e01ed3f8d525a0c676a47b2648e9f00b523b4058415b198f5225e5cc4b53`, byte-identical (`cmp`) to the generated script
  the clone ran (only `ROOT` differed there). Target `.claude/hooks/set-writes-scope.cjs`: BEFORE
  `a2fc1f0bac649f3558fc79c24c45bb50c7481a6f5d835b42fa35832a905a9d9b` (unchanged), AFTER
  `faaf76e41c4676d5f1c22406578c7e6f246eecffbc428d5c628b3c9442059ad2`.
- `git clone --branch fix/plan-scope-hardening` from origin at `5b18fdbf`, `npm ci`, the script run with `ROOT` at the
  clone: `apply.py: all targets patched and verified`, exit 0; a second run exits 1 (BEFORE mismatch, nothing
  written). `prettier --check` and `eslint` over the patched hook clean; every hook suite 601/601; with the patch
  committed in the clone (as the owner will), `npm run check` exit 0 — every gate GREEN, `npm test` 6221 pass, 0 fail,
  1 skipped of 6222 (2387 s).
- Round 1 (superseded, never applied): sha256 `132b1eb7…`, AFTER `9ef2028b…`; its clone run is the first proof.
- The Write tool turns the hook's backslash-u-FEFF escape into the BOM character; the generated script carries the
  character and restores the six characters with `chr(0xFEFF)` before hashing, so a transcription is checked by `cmp`
  and the payload by the AFTER hash.
