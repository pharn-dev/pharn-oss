# PLAN — plan-scope-hardening

- spec_content_hash: d5a974303fd0b9568945c60423ae5a89c57d7b65f5baa03657e317fbe64f33a5
- applied_lessons: [L7, L18, L26, L27, L28, L31, L55, L56, L57, L68, L69]
- increment: close the plan-sourced scope routes the 2026-11-03 review found — the setter (`set-writes-scope.cjs
--from-plan`, by human patch) refuses memory-bank canon and executable config in every posture, refuses PHARN's
  own surface and the instruction files in a dev or unsignalled tree while a `/pharn-loop` or `/pharn-ship` run is
  open (and the instruction files in an installed project), and both `## Files` readers stop reading HTML comments,
  refuse a second `## Files` heading and refuse a `:`-ended intro line that has path items under it; the dev
  formatter pass gets `npx --no-install` and both canon dirs leave the formatters' reach.
- layer(s): product `.claude/` surface (one hook script by HUMAN patch, hook tests, two commands), product floor
  (`plan-files-core.mjs`, `render-ship-briefing.mjs`, `apply-plan-deletions.mjs`), one contract, repo config
  (`.prettierignore`, `.markdownlint-cli2.jsonc`), dev floor test, dev guide
- constitution_refs: [P0, P2, P5, P6, P7]

## Trigger (P7) — the observed failures

From the 2026-11-03 principal review (`pharn-oss-principal-review-2026-11-03.md` §3, axis1 §3/§7, axis2), each
re-checked in code this run:

- **BLOCKER, setter half.** `set-writes-scope.cjs:784` and `:801` gate the PHARN-surface and exec-config refusals on
  `isPharnInstalledProject()`. Probe p17: in the dev posture a plan naming `pharn/floor/x.mjs`,
  `.github/workflows/ci.yml` and `.claude/commands/pharn-build.md` is scoped and both hooks then allow the Write.
  `/pharn-loop` pre-approves `--from-plan pharn/features/*/PLAN.md` (`pharn-loop.md:151`) over a model-written plan.
- **HIGH (canon).** No `--from-plan` refusal names canon. Probe A: a plan naming `.dev/memory-bank/lessons-learned.md`
  is scoped; probe D: `/pharn-dev-build` Step 2b's Bash formatter pass then rewrote canon. Neither ignore file lists
  a `memory-bank` dir (read this run).
- **MEDIUM (HTML comment / first heading).** Both readers match `## Files` and items inside `<!-- -->`; p16 scoped a
  comment-hidden path; a comment-hidden `## Files` above the visible one wins.
- **MEDIUM (cue wording).** p04b/p04d/p04e: `NOT in scope:`, `Excluded:`, `Leave unchanged:` intros do not end the
  list, so the paths under them are scoped, while the setter comment (`:614`) says "however the exclusion is worded".
- **MEDIUM (installed plan scopes `.mcp.json`, `CLAUDE.md`).** Probe i6: `.mcp.json`, `CLAUDE.md`, `lefthook.yml`,
  `.github/actions/x/action.yml` accepted from an installed plan.
- **Overflow.** `render-ship-briefing.mjs:176` (`^##[ \t]+Files\s*$`) vs `plan-files-core.mjs:212`
  (`^##\s+Files\b`): `## Files:` is scoped by the floor and "not found" in the GATE-2 briefing.

## Discovery (P6) — live state read this run

- Branch `fix/plan-scope-hardening` from `origin/batch/audit-2026-11-03` (== main `dd0bb3d3`, 7.2.1). Dev posture
  (`.dev/floor/` present, no `skillsVersion`). Spec hash above computed with `.dev/floor/hash-doc.mjs` this run.
- **Corpus measurement** (scratch runner over all 342 committed `PLAN.md` / `AC-TESTS.md`, current reader vs a
  prototype of the new one): 0 files carry two visible `## Files` headings; 29 files contain `<!--`, and with
  code-span-aware comment stripping all 342 read the same list as today (a naive stripper broke
  `spec-template/PLAN.md`, whose `` `<!--\s*pharn:guidance` `` sits in a code span — hence the code-span rule);
  15 files have a `:`-ended non-item intro line with path items under it ("Written by `/build` …:",
  "Product (root …):") — every one a GROUP label, none an exclusion; a widened cue word list instead silently
  truncated 3 further plans (narrative lines saying "excluded").
- **Historical plans the new setter refuses** (dev posture, no marker): 17 named `.github/workflows/*.yml`; 3 named
  `.dev/memory-bank/lessons-learned.md` (each also denied at write time by `protect-trusted-paths.cjs`); none named
  `.mcp.json`, `.github/actions/**` or `.husky/**`. Root `CLAUDE.md` is named by ~100 dev plans — so the
  instruction-file refusal is installed-posture (plus dev-with-a-product-run-open) only.
- **Other `--from-plan` callers** (grep this run): `/pharn-dev-build` Step 0, `/pharn-dev-ship --loop`'s re-set,
  `/pharn-build` Step 0, `/pharn-test` Step 0 (`AC-TESTS.md`), `/pharn-loop` (two grants), `/pharn-loop-close` step 1
  and `loop-closeout.mjs` step 10. Tests driving the real setter (`check-ac-tests`, `stage-verify`,
  `check-bash-reconcile`, `check-build-complete`, enforce/protect suites) use temp trees with no product marker and
  no exec-config/canon entries — unaffected, verified by running them at build.
- **Consumers of `plan-files-core.mjs`** handle `ok:false` generically by printing `reason`, except
  `apply-plan-deletions.mjs:134`, which hard-codes "the PLAN has no `## Files` heading" for every refusal (already
  wrong for the 6.61.0 fence refusal). `check-ship-briefing.mjs` / `render-ship-briefing.mjs` use `fenceStates`.
- markdown-it 15.0.3 is in `node_modules` (transitive). It is the oracle for the comment rule's fixtures (L55), as an
  offline probe recorded in BUILD notes, not as a test import.

## Applied lessons

- L7 — canon is reachable only through the promote command's own scope: the setter now refuses a `--from-plan` canon
  entry in every posture, so no plan can hand a build (or its Step 2b formatter) a canon path.
- L18 — the exclusion block stays a heading; the setter no longer GUESSES what a `:` intro means — it refuses when
  path items sit under one, so a fail-open wording can no longer slip through silently.
- L26 — `apply.py` is proven in a `git clone` of this branch with its own configs and `node_modules`: hook tests,
  `npm test`, and `format:check` + `lint` over the patched file, never in a bare copy.
- L27 — every new refusal message names only remedies that work for it (canon: the promote command, no flag;
  marker-gated: close the marker or the operator flag; exec config / instruction files: the matching flag or a hand
  edit), each pinned "present in its own case AND absent from the others".
- L28 — the colon rule exempts an open item's wrapped continuation lines (the L28 exemption is kept verbatim), and it
  refuses loudly instead of truncating silently, so the count-reading discipline is no longer the only signal.
- L31 — the copy-pair (setter ↔ `plan-files-core.mjs`) gets ✧ byte-equal pins on the new shared functions and ★
  PARITY fixtures for every new reader rule; `CANON_SUBTREES` is ✧ pinned to protect's `PROTECTED_SUBTREES`.
- L55 — the comment rule is a parser model of what a renderer hides; its fixtures (`<!-->`, unclosed `<!--`,
  `<!--` in a code span, comment-hidden heading) are checked against markdown-it before they are written as tests.
- L56 — the module headers' stated BOUNDS for the comment rule are probed the same way, not written from the model.
- L57 — the formatter pass stays an explicit-path run; both canon dirs join `.prettierignore` and
  `.markdownlint-cli2.jsonc` `ignores`, verified by the tools' own counts on a named canon path (prettier silent
  skip, `Linting: 0 file(s)`).
- L68 — the human patch lands OUTSIDE the anchor→verify window: build writes and commits everything else, the owner
  applies `apply.py`, the patch is committed, then build Step 0 (setter, then `--anchor`) is re-run before regress.
- L69 — the briefing's `## Files` heading test is imported from `plan-files-core.mjs`, not hand-written a third time.

## Design

### A. The `## Files` reader (both copies; setter by human patch)

1. `scanLines(lines, nested)` replaces the fence-only pass: per line `{ fenced, text }`. Fence transitions are
   unchanged. Outside a fence, HTML comments are cut out of `text`: an opener is `<!--` outside a back-tick code
   span on that line; the closer is the first `-->` from the opener's third character on, so `<!-->` and `<!--->`
   close at once (CommonMark); an unclosed comment runs on, across lines; a fence line inside a comment is not a
   fence. `fenceStates()` stays exported as `scanLines(…).map((s) => s.fenced)`.
2. Heading, item and cue tests read `text`. A second visible `## Files` (outside fences and comments) → refuse,
   naming both line numbers.
3. **The colon rule.** A non-item, non-blockquote, non-continuation line under `## Files` that matches the existing
   cue still ends the list silently (today's behaviour). Any OTHER such line whose text ends in `:` ends the list
   too, and if a path item follows it before the next heading the reader REFUSES (setter exit 1, core `ok:false`),
   naming the two line numbers — it cannot tell a group label from an exclusion intro. Remedy in the message: move
   excluded paths under a `### …` heading after the list; drop the `:` from a group label or make it a `> …`
   blockquote. Line numbers only, never the line's text (P2: the plan is untrusted).
4. The two readings (`nested` false/true) must still agree on heading, list AND refusal, else the fence refusal.
5. `FILES_HEADING_RE = /^##\s+Files\b/` is exported from the core; `render-ship-briefing.mjs` uses it and reads
   headings from `scanLines` text, so `## Files:` renders and a comment-hidden heading is skipped.

### B. The setter's refusals (human patch; `--from-plan` only; `--from-frontmatter` unchanged)

Layered after CONTROL_SURFACE, each writing nothing and exiting 1:

| class                                                                                                       | posture                                                                                 | opt-in (BEFORE the mode)                |
| ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------- |
| canon — `pharn/memory-bank/**`, `.dev/memory-bank/**` (`CANON_SUBTREES`, ✧ = protect's)                     | every                                                                                   | none — the promote command is the route |
| exec config — `.github/workflows/**`, `.github/actions/**`, `.husky/**`, `core.hooksPath` dirs, `.mcp.json` | every (`core.hooksPath` fail-closed when installed, best-effort otherwise)              | `--allow-exec-config`                   |
| PHARN surface — `isReserved()` (unchanged)                                                                  | installed; dev/unsignalled while a `pharn-loop` or `pharn-ship` marker is open (< 24 h) | `--allow-pharn-surface`                 |
| instruction files — basename `CLAUDE.md`, `CLAUDE.local.md`, `AGENTS.md`, any depth, case-folded            | installed; dev/unsignalled while a `pharn-loop` or `pharn-ship` marker is open          | `--allow-instruction-files` (new)       |

- Entries are judged as written and with `..` collapsed (the 7.0.0 rule). The marker scan is `openLoopRuns()`
  generalised to `openRuns(root, dirs)` (presence + age, read-only, fail-closed on an unreadable state dir); the
  promotion-origin refusal keeps scanning `pharn-loop` only. `pharn-review` markers are not read (it sets no plan
  scope).
- **Self-hosting is unchanged where it matters:** `/pharn-dev-build` of `pharn/floor/**`, `.claude/commands/**` or
  root `CLAUDE.md` with no product marker open is scoped as today. **What changes for the dev loop:** a dev plan
  naming a CI workflow or canon is refused. Replacement routes, named in the messages and in
  `.dev/guides/writes-scope.md`: canon only through `/pharn-dev-memory-promote` (its `--from-frontmatter` scope);
  CI files through an owner-run patch, or the owner re-running the setter with `--allow-exec-config` before the
  mode. `/pharn-dev-build` Step 0 gains one sentence: a setter refusal is a STOP for the human; never add an
  `--allow-*` flag yourself.
- **Not closed here, stated (P0):** `/pharn-dev-build` of a model-written, model-approved dev plan can still scope
  `pharn/floor/**` and `.claude/commands/**` — that is self-hosting, and what guards it is GATE 1 plus the GitHub
  layer (BLOCKER fix (2), ruleset/review — the owner's). `always_reconciled` for workflows is G7's. Every refusal
  is an argv/marker reading by a Bash-run program (`LIMITS.md §6`): an agent holding Bash can pass a flag, delete a
  marker, or write the scope record itself.

### C. Formatter reach (dev)

`pharn-dev-build.md` Step 2b: `npx --no-install` on the prettier, markdownlint-cli2 and eslint lines (a missing local
binary fails instead of fetching from the registry). `.prettierignore` and `.markdownlint-cli2.jsonc` list
`.dev/memory-bank/` and `pharn/memory-bank/`. Consequence, stated: canon leaves `format:check` / `lint:md`, and the two
promote commands' advisory `--check` lines over canon become no-ops (G9 owns those commands).

### Decisions (GATE 1 — decided by the batch orchestrator (a model) under the owner's delegation, 2026-11-03)

1. **Colon rule = refuse, not silently end, not a wider word list.** P5 (a structural test, not wording), loud
   (L28), never opens scope. Cost measured: 15 of 342 historical plans would be refused at the next run of their
   build; all 15 used the `:` as a group label (historical plans are not re-run, so none is edited). **GATE 1
   conditions:** (a) the refusal surfaces at PLAN time — neither plan command reads `## Files` today, so each gains
   one pinned line, `node .claude/hooks/set-writes-scope.cjs --check --from-plan <PLAN.md>` (a new setter
   modifier: every parse and refusal, nothing written, placed BEFORE the mode like the opt-ins so a granted
   line's `*` cannot carry it), and a non-zero exit means fix the PLAN before halting; `/pharn-loop`'s
   `allowed-tools` gains the one matching grant (a line in a G2-owned file — flagged to the orchestrator); (b)
   `pharn-plan.md` and `pharn-dev-plan.md` state the rule in one sentence. The orchestrator's wording suggested
   "group with a blank line or sub-heading text"; a heading ENDS the list (Boundary 1), so the sentence says: group
   with a blank line or a label line that does not end in `:`.
2. **Instruction files at any depth**, not root only — Claude Code loads a nested `CLAUDE.md` when it reads files
   there; a membership test on the basename costs one line.
3. **A new flag `--allow-instruction-files`** rather than folding the class into `--allow-pharn-surface` (whose name
   and message say "PHARN's own files").
4. **`.mcp.json` and `.github/actions/**` join exec config in every posture** (0 historical dev plans name either;
   GitHub runs a local action with the workflow's token). **`lefthook.yml` / `.pre-commit-config.yaml` declined**:
   hook-manager config names are an open set, the managers run only once installed into `.git/hooks` (already
   gitmeta-denied), and a name list would be the heuristic the stated bound already declines; it stays a bound.
5. **Marker-gated, not plan-path-gated**, for the dev-posture PHARN-surface refusal (the orchestrator's design): a
   rule keyed on "plan under `pharn/features/`" would also refuse the unsignalled temp trees several floor tests
   build, for no gain against a run that keeps its own marker.
6. **CHANGED at GATE 1: `core.hooksPath` is read fail-closed in the INSTALLED posture only.** In a dev or
   unsignalled tree the fixed dirs (`.github/workflows`, `.github/actions`, `.husky`) and `.mcp.json` are refused,
   plus every `core.hooksPath` the reader could read, best-effort: an unreadable git config file there is skipped,
   never a refusal of the plan. The existing "dev unaffected by unreadable git config" control test is kept,
   adjusted only for the fixed dirs. Reason (orchestrator): worktree / odd layouts in self-hosting must not halt
   every build; dev has GATE 1 + reconcile.

## Files

- `pharn/floor/plan-files-core.mjs` — `scanLines` (fences + HTML comments, code-span aware), `FILES_HEADING_RE`,
  the second-heading and colon-intro refusals, `fenceStates` as a view of `scanLines`; header bounds updated.
- `pharn/floor/check-build-complete.test.mjs` — ★ PARITY fixtures (setter vs core) for every new reader rule, with
  their markdown-it verdicts noted.
- `pharn/floor/render-ship-briefing.mjs` — section headings read through `scanLines` and `FILES_HEADING_RE`.
- `pharn/floor/render-ship-briefing.test.mjs` — `## Files:` renders; a comment-hidden `## Files` is skipped.
- `pharn/floor/apply-plan-deletions.mjs` — an unparseable plan's refusal carries the reader's own reason.
- `pharn/floor/apply-plan-deletions.test.mjs` — the reason passes through for a non-heading refusal.
- `pharn/floor/README.md` — the setter paragraph states the new refusals and postures.
- `pharn/pharn-contracts/ac-tests.md` — "the setter reads a file's first `## Files`" becomes the refusal.
- `.claude/hooks/enforce-writes-scope.test.cjs` — its setter fixture's "Written by `/build`:" group label (the
  historical pattern the colon rule refuses) becomes a blockquote; added at build, after the first anchor — the
  re-anchor after the human patch covers it.
- `.claude/hooks/set-writes-scope.test.cjs` — the refusal matrix by posture and marker, the new flag, L27 remedy
  pins, ✧ pins (`scanLines` + `commentStart` byte-equal to the core's; `CANON_SUBTREES` == protect's), and the dev
  controls rewritten for the every-posture classes.
- `.claude/commands/pharn-dev-build.md` — `npx --no-install` on the three Step 2b tools; Step 0 refusal = STOP.
- `.claude/commands/pharn-plan.md` — the `## Files` rules: comments are not read, one `## Files`, no `:` intro over
  items, and the refused classes; the plan-time `--check` line (Step 4b).
- `.claude/commands/pharn-dev-plan.md` — the plan-time `--check` line (Step 4) and the one-sentence rule.
- `.claude/commands/pharn-loop.md` — one `allowed-tools` grant for the plan-time `--check` line.
- `.dev/floor/command-hygiene.test.mjs` — Step 2b gate pins accept `--no-install`; ✧ both ignore files list both
  canon dirs.
- `.prettierignore` — both canon dirs.
- `.markdownlint-cli2.jsonc` — both canon dirs.
- `.dev/guides/writes-scope.md` — the refusals section and the replacement routes.
- `CHANGELOG.md` — `[Unreleased]` entries (Fixed, Changed).
- `.dev/features/plan-scope-hardening/DOCS-PROPOSAL.md` — trusted-doc text for the owner (THREAT-MODEL §2 item 10,
  LIMITS §3f, §6 setter bullet, §7 permissive-default bullet).
- `.dev/features/plan-scope-hardening/apply.py` (delete) — the human patch for `set-writes-scope.cjs`; never
  committed, and deleted once the owner ran it (round 3, AFTER pin verified).
- `.dev/features/plan-scope-hardening/BUILD.md` — build note, markdown-it probe results, clone proof.

### Human-applied, outside the build's scope

- `.claude/hooks/set-writes-scope.cjs` — written only by the owner running `apply.py` (CONTROL_SURFACE); committed
  as its own commit, then build Step 0 is re-run (L68).

### Explicitly not touched

- `.github/workflows/release.yml` — its :34-36 comment ("a /pharn-dev-build plan may scope it") goes stale; group S
  edits that file, and this plan cannot name it once the patched setter is live.
- `.claude/commands/pharn-dev-memory-promote.md`, `pharn-memory-promote.md` — G9 owns them; the promote prose
  naming a `--from-plan` canon route is G9's overflow item. `pharn-loop.md` is touched by its one grant line only.
- `pharn/floor/reconcile-ignore.json` — G7 (workflows into `always_reconciled`).
- the four trusted docs — text goes to `DOCS-PROPOSAL.md`.

## Contracts satisfied

- `pharn/pharn-contracts/ac-tests.md` — `## Files` grammar shared with the PLAN reader (updated in place).
- `pharn/pharn-contracts/reconciliation-record.md` — unchanged; the patch lands before the anchor (L68).

## Evals to write (P1)

No capability (`role:`) is added or changed; the floor modules and the hook carry tests:

- core + setter parity → each new fixture yields the same list or the same refusal from both readers.
- setter refusal matrix → each class × posture × marker cell exits 1 with no scope file, or 0 in its control.
- briefing → `## Files:` and comment-hidden heading cases.

## Guarantee audit (P0)

- "a plan cannot scope canon / exec config through the setter" → floor: enum/regex (lexical membership at scope-set
  time); bounded — Bash can write the record or pass a flag (`LIMITS.md §6`), entries are lexical (enforce judges
  the real target).
- "a product run in the dev checkout cannot scope PHARN's surface" → floor membership test over marker PRESENCE,
  itself Bash-written state: advisory against a run that deletes or never opens its marker.
- "a comment-hidden item is never scoped" → floor: the reader's model; NOT a CommonMark parser — fixtures checked
  against markdown-it offline, no live differential (named residual, L56).
- "the colon rule never widens scope" → floor (it only ends the list or refuses).
- "the formatters cannot rewrite canon" → advisory (Bash-run tools honouring ignore files); canon is
  always-reconciled, so a rewrite is detected, not prevented.

## Trust audit (P2)

- PLAN text is untrusted. New refusal messages name line numbers and the offending scope entries (paths, as today),
  never the intro line's text. The core's reasons carry line numbers only.

## Open questions (HALT)

- none — the six decisions were settled at GATE 1 (above).
