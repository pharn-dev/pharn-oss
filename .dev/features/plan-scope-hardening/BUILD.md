# BUILD — plan-scope-hardening

GATE 1: decided by the batch orchestrator (a model) under the owner's delegation, 2026-11-03 — decisions 1–5 as
recommended (1 with two conditions: the `--check` plan-time line, and the one-sentence rule), decision 6 changed
(`core.hooksPath` best-effort outside an install). Recorded in `PLAN.md`.

Round 2 (orchestrator, 2026-11-03, before the owner applied anything): an independent adversarial review of the first
`apply.py`, clone-tested, found fail-open paths — absolute and root-escaping entries past every prefix refusal (and
the Step 2b formatters rewrote canon through the absolute path), an unclosed inline `<!--` hiding a later visible
heading (a regression of the first patch), raw HTML blocks, lone-CR line endings, and labels the colon rule missed.
The colon rule was replaced by the one-contiguous-list rule, and the hook was re-patched from the same BEFORE pin.

Round 3 (orchestrator, after a clone-tested re-review of round 2): (A) an entry with spaces or quotes reached Step
2b's `xargs` as separate arguments — ``- `src/a.js --plugin=./pharn/features/probe/evil.mjs` `` made prettier load the
plugin, ``- `src-a.md <abs canon>` `` rewrote canon (both reproduced in the round-2 clone). The setter now refuses
quotes, back-ticks, backslashes and control characters, and tests every whitespace-separated token of an entry for the
absolute / escaping / leading-`-` shapes (plain spaces are kept); Step 2b passes paths NUL-separated
(`join('\0')` + `xargs -0 -r`) and ends each tool's options with `--` (prettier, markdownlint-cli2 and eslint all treat
what follows as paths: a `--plugin=…` after `--` is reported as a missing file and the plugin does not run). Step 2b is
the only shell consumer of `pharn/.run/writes-scope.json`; `loop-closeout.mjs` stages through `--pathspec-file-nul`
with literal pathspecs. (B) a path item hidden as lazy paragraph text inside an inline comment
(``- `a` <!--`` / ``      - `b` `` / `      -->`, or with a no-break space indent) was scoped: an item marker is now `-`
plus spaces or tabs only, an item indented four or more columns past the previous item's text refuses, and an inline
`<!--` left open on a line inside `## Files` refuses. (C) both plan commands now say "`## Files` lists only files this
increment writes; put anything excluded under its own `###` heading after the list". (D) the corpus was re-measured
through the full setter (below).

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

- **Corpus, round 3, full setter** (every committed `PLAN.md` / `AC-TESTS.md` at `dd0bb3d3`, 342, through the
  pre-batch setter and the round-3 setter, `--from-plan`, a dev-posture temp tree with no marker; `scratchpad/g1/
corpus3.mjs`): 293 identical; 44 newly refused — 27 split list, 14 CI workflow, 3 canon; 5 already refused by the
  control-surface check and now refused first by the split-list rule; 0 silent changes; 0 newly accepted; 0 by the
  HTML-block, unclosed-comment, indented-item, second-heading or project-relative refusals. (The reader-only count was
  32 — the 27 plus the 5. The first patch's colon rule counted 22, 15 before `**Label:**` emphasis; a widened cue word
  list instead silently truncated 3 more plans. With code-span-aware comment handling every list reads as before; a
  naive stripper broke `spec-template/PLAN.md`, whose `<!--` sits in a code span.)
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

- Round 3 script `.dev/features/plan-scope-hardening/apply.py` (uncommitted), sha256
  `8144ec71d232b280dd0de5b9347e68de6f237c046a8e00faeb97dcc1d8bb0736`, byte-identical (`cmp`) to the generated script
  the clone ran (only `ROOT` differed there). Target `.claude/hooks/set-writes-scope.cjs`: BEFORE
  `a2fc1f0bac649f3558fc79c24c45bb50c7481a6f5d835b42fa35832a905a9d9b` (unchanged), AFTER
  `ecd2812e66910f0e15f1169efb03de487fc70d8ef02ec93f1393bba7a6ffafa2`.
- `git clone --branch fix/plan-scope-hardening` from origin at `56cdc0f1`, `npm ci`. BEFORE the patch (pre-batch
  setter, round-3 Step 2b), the four round-3 entries pass the setter and Step 2b runs, but the plugin does not run and
  canon is not rewritten (the NUL-safe `--` form alone holds). The script then: `apply.py: all targets patched and
verified`, exit 0; a second run exits 1. AFTER the patch the setter refuses all four (exit 1) and Step 2b is never
  reached. In the round-2 clone (round-2 setter, newline-separated Step 2b) the same probe had the plugin run and canon
  rewritten. `prettier --check` and `eslint` over the patched hook clean; with the patch committed in the clone (as
  the owner will), `npm run check` exit 0 — every gate GREEN, `npm test` 6222 pass, 0 fail, 1 skipped of 6223 (2662 s).
- Round 2 (superseded, never applied): sha256 `eb65e01e…`, AFTER `faaf76e4…`, clone `npm run check` exit 0. Round 1
  (superseded): sha256 `132b1eb7…`, AFTER `9ef2028b…`.
- The Write tool turns the hook's backslash-u-FEFF escape into the BOM character; the generated script carries the
  character and restores the six characters with `chr(0xFEFF)` before hashing, so a transcription is checked by `cmp`
  and the payload by the AFTER hash.
