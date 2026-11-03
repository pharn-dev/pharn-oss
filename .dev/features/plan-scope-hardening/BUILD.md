# BUILD — plan-scope-hardening

GATE 1: decided by the batch orchestrator (a model) under the owner's delegation, 2026-11-03 — decisions 1–5 as
recommended (1 with two conditions: the `--check` plan-time line, and the one-sentence rule), decision 6 changed
(`core.hooksPath` best-effort outside an install). Recorded in `PLAN.md`.

## What landed (Write/Edit tool, inside the plan's `## Files`)

- `pharn/floor/plan-files-core.mjs` — `scanLines` / `commentStart` (HTML comments, code-span aware), `FILES_HEADING_RE`,
  `refusalReason`, the second-heading and colon-intro refusals; `fenceStates` is a view of `scanLines`.
- `pharn/floor/render-ship-briefing.mjs` — headings through `scanLines` text and `FILES_HEADING_RE`.
- `pharn/floor/apply-plan-deletions.mjs` — the reader's own refusal reason.
- Tests: `check-build-complete.test.mjs` (★ `READER_FIXTURES`, 20 fixtures), `render-ship-briefing.test.mjs`,
  `apply-plan-deletions.test.mjs`, `.claude/hooks/set-writes-scope.test.cjs` (7.3.0 block + ✧ pins),
  `.claude/hooks/enforce-writes-scope.test.cjs` (one fixture's `Written by \`/build\`:` label → blockquote),
  `.dev/floor/command-hygiene.test.mjs` (`--no-install` pins; ✧ canon in both ignore files).
- Commands: `pharn-dev-build.md` (`npx --no-install`, Step 0 STOP sentence), `pharn-plan.md` and `pharn-dev-plan.md`
  (the `--check` line and the rule), `pharn-loop.md` (one grant for the `--check` line).
- Config/docs: `.prettierignore`, `.markdownlint-cli2.jsonc`, `pharn/floor/README.md`, `pharn/pharn-contracts/ac-tests.md`,
  `.dev/guides/writes-scope.md`, `CHANGELOG.md` `[Unreleased]`, `DOCS-PROPOSAL.md`.
- Human patch: `.claude/hooks/set-writes-scope.cjs` via `apply.py` (uncommitted; see "apply.py proof").

## Measurements

- **Corpus** (all 342 committed `PLAN.md` / `AC-TESTS.md` at 7.2.1, current reader vs the new one): 0 carry two
  visible `## Files`; with comment stripping every list reads as before (a naive stripper broke
  `spec-template/PLAN.md` — `<!--` inside a code span — hence code-span awareness); 22 carry a `:`-ended label line
  with items under it (the first count, 15, missed `**Label:**` emphasis — the fixture `**Product files:**` caught it,
  and L18's own fail-open intro was that shape), every one a group label. A widened cue word list instead silently
  truncated 3 more plans.
- **markdown-it 15.0.3 oracle** (offline probe, `scratchpad/g1/mdit.mjs`; the visible `<li>` code items under a
  visible `<h2>Files</h2>`): agreement on the comment-hidden heading, multi-line and one-line comment items, `<!-->`,
  `<!--->`, the unclosed comment, `<!--` in a code span, a trailing inline comment, a fence line inside a comment and
  a comment opener inside a fence. Two divergences, both the reader hiding MORE (stated as bounds in the core header
  and pinned as `bound:` fixtures): an inline `<!--` at an item's end then a new `- ` item (markdown-it shows
  `src/b.ts`; the reader drops it), and a code span wrapped across lines holding `<!--` (markdown-it shows b and c).
- **Formatter reach:** `prettier --file-info .dev/memory-bank/lessons-learned.md` → `ignored: true` (also
  `pharn/memory-bank/x.md`); `markdownlint-cli2 --no-globs .dev/memory-bank/lessons-learned.md` → `Linting: 0 files`.

## Floor

- `node pharn/floor/validate.mjs .` — recorded below at the build's end.

## apply.py proof

Recorded below once run.
