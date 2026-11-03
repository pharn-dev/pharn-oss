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
  `.claude/hooks/enforce-writes-scope.test.cjs` (one fixture's "Written by /build:" group label becomes a
  blockquote), `.dev/floor/command-hygiene.test.mjs` (`--no-install` pins; ✧ canon in both ignore files).
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
  and pinned as `bound:` fixtures): an inline `<!--` at an item's end then a new list item (markdown-it shows
  `src/b.ts`; the reader drops it), and a code span wrapped across lines holding `<!--` (markdown-it shows b and c).
- **Formatter reach:** `prettier --file-info .dev/memory-bank/lessons-learned.md` → `ignored: true` (also
  `pharn/memory-bank/x.md`); `markdownlint-cli2 --no-globs .dev/memory-bank/lessons-learned.md` → `Linting: 0 files`.

## Floor

- `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 37 capabilities checked in "."` (exit 0).
- `check:changelog-entry --merge-base origin/main` → GREEN, 4 new entries.

## apply.py proof (L26 — a real clone with its own configs and `node_modules`)

- Script `.dev/features/plan-scope-hardening/apply.py` (uncommitted), sha256
  `132b1eb7b90aafabf6a07a727a1f9f289ff85460c652a78342bec63540fd79dd`. Target `.claude/hooks/set-writes-scope.cjs`:
  BEFORE `a2fc1f0bac649f3558fc79c24c45bb50c7481a6f5d835b42fa35832a905a9d9b`, AFTER
  `9ef2028bee4f4e569eaf7feb7789a922fbe89e6811a9b8524053adbb406a3775`.
- `git clone --branch fix/plan-scope-hardening` (from origin, commit `a5170d45`) into the scratchpad, `npm ci`, the
  script run with `ROOT` pointed at the clone: `apply.py: all targets patched and verified`, exit 0. A second run
  aborts with `BEFORE hash mismatch … nothing written`, exit 1.
- In the clone: `prettier --check` and `eslint` over the patched file clean; the six hook suites 598/598; then (the
  patch committed in the clone, as the owner will) `npm run check`: every gate GREEN through `check:reconcile`, and
  `npm test` 6217 pass, 1 fail, 1 skipped of 6219 (2617 s, other agents loading the host). The one failure is the
  known load-timing pair's first test, `entry-gates.test.mjs` "CLI: TAKEOVER — the runner killed mid-gate …"
  (17.9 s under load); re-run alone: `✔ … (5252.618ms)`, and its twin `✔ OBSERVED: TAKEOVER … (4702.037292ms)`,
  2/2 pass (review LOW-1).
- Unpatched (this worktree), the new ★ setter cases fail as they must: the `READER_FIXTURES` parity test fails on its
  first fixture ("setter scope").
- One transcription defect found and fixed before hand-over: the Write tool turned the hook's literal `﻿` (in
  `hooksPathValues`) into a BOM character; the script now restores the six characters with `chr(0xFEFF)` before
  hashing, and its payload was re-verified to hash to AFTER.
