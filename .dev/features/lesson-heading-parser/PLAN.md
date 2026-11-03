# PLAN — lesson-heading-parser

- spec_content_hash: d5a974303fd0b9568945c60423ae5a89c57d7b65f5baa03657e317fbe64f33a5
- applied_lessons: [L6, L7, L14, L25, L29, L35, L36, L50, L55, L56, L62, L74, L75, L81]
- increment: one lessons-heading grammar for the three recognizers — `check-plan-lessons.mjs`, `lessons-index-core.mjs`
  (index generator + checker) and `check-provenance.mjs` read canon through one exported `LESSON_HEADING_RE` and one
  renderer-faithful line reader (the column-0 fence / HTML-comment / raw-block model `spec-template-core.mjs` already
  owns), with the BOM stripped and the generator's throw turned into a `RED —` line; both promote commands set the
  canon scope only after the Step-5 accept; the promote prose stops naming a closed `--from-plan` canon route and a
  shipped follow-up; the false L14 JavaScript fact is corrected in the floor comments that restate it, and the canon
  L14 correction is proposed for the owner (never written).
- layer(s): product floor (`pharn/floor/` — four checkers, one core, two comment-only files), product `.claude/`
  surface (one command), apparatus (two dev commands, dev floor wrapper + tests, hook test comment), CHANGELOG
- constitution_refs: [P0, P2, P3, P4, P5, P6, P7]

## Trigger (P7) — the observed failures

From the 2026-11-03 principal review (`pharn-oss-principal-review-2026-11-03.md` §3 MEDIUM "A `## L<n>` line inside
a fenced code block or an HTML comment is a lesson to all four lessons tools…", its overflow lines on promote
ordering, promote prose and L14; axis2 report "Memory poisoning"). Re-checked in code this run (P6):

1. **Fence / comment blind.** `check-plan-lessons.mjs:170-177` (`declaredLessonIds`), `lessons-index-core.mjs:252-259`
   (`parseLessons` pass 1) and `check-provenance.mjs:249-260` (`existingIds`) are plain line scans with no block
   state. A `## L21 — x` inside a ` ```text ` block or a multi-line `<!-- … -->` is a lesson to all three.
2. **Three grammars.** `check-plan-lessons.mjs:83` `/^## L(\d+) /`, `lessons-index-core.mjs:147`
   `/^## L(\d+) (.*)$/`, `check-provenance.mjs:257` `/^##\s+(\S+)/`. `## L20` (no space) is no id to the first two
   and an id to the third; `## L020 x` is `L020` to the plan checker and `L20` to the index (found this run, not in
   the report).
3. **BOM.** `check-plan-lessons.mjs:248` strips it; `lessons-index-core.mjs:387` and `check-provenance.mjs:251` do not,
   so a BOM before a first `## L1` drops L1 from the index and lets a duplicate `L1` past provenance.
4. **Generator throws.** `gen-lessons-index.mjs:73-93` (product) and `.dev/floor/gen-lessons-index.mjs:30-37` (dev)
   have no catch: an invalid canon prints a stack trace (exit 1).
5. **Promote scope before the gate.** `pharn-memory-promote.md:84-97` and `pharn-dev-memory-promote.md:119-132` set the
   promote-origin canon scope at Step 0; the accept is Step 5 (`:243-259`, `:307-321`). Steps 1–5 write only
   `pharn/.run/**`, which is writable under any scope (enforce's `ALWAYS` set), so the setter can move to Step 6.
6. **Promote prose names a closed route.** `pharn-memory-promote.md:390-394`, `pharn-dev-memory-promote.md:104-116`,
   `:370-375`, `:535-540` say a plan naming canon "would grant an ungated canon write (follow-up
   `canon-write-denylist`)" and prescribe `--from-plan` for annotations; `protect-trusted-paths.cjs:79-88, :808`
   closed that in 3.1.1, and G1 (same release, 7.3.0) makes the setter refuse it too.
7. **L14's false fact.** Measured this run on Node 24.13.1: `/^P[0-7]$/.test("P2\n")` → `false`,
   `/^[a-z0-9-]+$/.test("enum-gate\n")` → `false`, `/^[a-z0-9-]+$/m.test("enum-gate\n")` → `true`,
   `/^P[0-7]$/.test("P2\n".trim())` → `true`. Canon L14 and `lessons-index-core.mjs:177-181` say the first two are
   `true`.

## Applied lessons

- L6 — the lesson id is a STRUCTURAL fact; it is now read only from a heading a renderer shows, never from a heading-
  shaped line inside a block that renders as code or a comment.
- L7 — the promote scope is narrowed in time as well as in path: set only after the accept, still one `--target`.
- L14 — the composition rule is kept everywhere it is used; only its stated REASON is corrected, from the measured
  fact (item 7), and canon's own sentence goes to the owner as a proposal.
- L25 — every comment that restates L14's reason is re-derived from the measurement, not carried across (sweep below).
- L29 — the deliverable is the enumeration: one constant and one reader, and a ✧ closure test that the three consumers
  import them and no other floor file declares a lesson-heading regex.
- L35 — no second copy of the block model: `spec-template-core.mjs`'s `spanned()` (probed against markdown-it in
  6.18–6.72, L55/L56) is exported and reused, not re-implemented.
- L36 — the closure is over every non-test `.mjs` in both floors, not a per-file presence list.
- L50 — the promote-prose fix sweeps by REFERENT (the `--from-plan` canon route and the "hook PERMITS" claim), not
  only by the slug `canon-write-denylist`; hits and dispositions below.
- L55 — the new reader's verdicts are probed against markdown-it (in `node_modules`, a transitive devDependency) at
  build, over the fixtures and the real canon; the probe is scratch, not a committed test (a dependency decision).
- L56 — the stated bounds (indented top-level openers, HTML types 6–7) are probed too, not only the rules.
- L62 — the generator's refusal path prints `RED — <message>` through `String(e?.message ?? e)` in a total wrapper.
- L74 — the probe's reference decides heading visibility (markdown-it); the lesson-id predicate it would borrow gets
  its own oracle: hand-written expected id sets per fixture.
- L75 — each sweep phrase is listed with every hit and a disposition.
- L81 — no test copies these modules into a scratch tree (grep this run); the one new import edge
  (`lessons-index-core.mjs` → `spec-template-core.mjs`) adds no module to `check-spec`/`check-loop` copy lists, whose
  copied modules gain no import.

## Design

**One grammar, one reader (`pharn/floor/lessons-index-core.mjs`, SECTION 1).**

- `export const LESSON_HEADING_RE = /^## L([1-9][0-9]*)(?: (.*))?$/` — `## L20`, `## L20` and `## L20 — t` are all
  L20 to every reader; `## L20x`, `## L020`, `## L0` are no lesson heading to any of them.
- `export function canonLines(text)` → `{ lines, visible, unclosed }`: BOM stripped (`frontmatter-core.mjs`
  `stripBom`), split on `\r?\n`, `visible[i]` false when line `i` sits in a column-0 fenced block, HTML comment or
  `<pre>/<script>/<style>/<textarea>` block (`spec-template-core.mjs` `blockSpans()`, exported from the existing
  `spanned()` with its body unchanged), and `unclosed` = the 1-based line of the first `##` line hidden by a block
  that never closes (0 when none).
- `export function lessonHeadings(text)` → the visible `LESSON_HEADING_RE` lines, in file order:
  `[{ index, num, id, rest }]`.
- `parseLessons` reads headings and section ends from `canonLines` (a section ends at the next VISIBLE `##` line) and
  THROWS when `unclosed` is set: a block left open hides every later lesson from a reader, and a silent drop is the
  BOM defect again. Dev canon has no column-0 fence or comment opener today (grep), so the committed index does not move.

**Consumers.** `check-plan-lessons.mjs` `declaredLessonIds` = `lessonHeadings(text)` ids (a hidden lesson is not
citable; an unclosed block is not its RED — the plan's question is whether the cited id is a visible heading).
`check-provenance.mjs` `existingIds` keeps its generic `^##\s+(\S+)` first token (the target may be
`pattern-library.md`, whose id scheme is not `L<n>`), but over VISIBLE lines of `canonLines` only, so its id set stays
a deliberate superset of the lesson set (fail-closed for a lesson candidate), and REDs (`canon`) when `unclosed` is
set — the entry it is about to admit would be appended inside the open block.

**Generators.** Product and dev `main()` catch and print `RED — <message>` to stdout, exit 1, no stack trace (the dev
wrapper's allowlist is `generate`, `main` — unchanged).

**Promote ordering.** In both promote commands Step 0 keeps only "resolve the target"; the setter line and the
`--amend-scope` line move, verbatim, to the head of Step 6 ("On an explicit accept, set the scope …"), before the
TOCTOU re-read. Every "Step 0 pinned the scope" / "re-run Step 0's setter" reference is re-pointed to Step 6. The dev
description's order sentence follows. `pharn-dev-ship.md` 2b.4's "It sets its own writes-scope, runs check-provenance,
and halts" is re-ordered.

**Promote prose.** The three "would grant an ungated canon write … follow-up `canon-write-denylist`" passages become:
closed — `protect-trusted-paths.cjs` denies a canon write under any scope whose origin is not a promote command
(3.1.1), and from 7.3.0 the setter refuses a plan naming canon; canon still changes through Bash (L19), which no hook
sees. The dev "standing division" paragraph (`:104-116`) says an annotation of an existing entry is a human hand-edit
outside the agent loop (the L1–L17 retag predates the denylist), never a `--from-plan` build.

**Format lines.** The dev promote's canon `--check` block (`:415-432`, bare `npx`) is REMOVED: G1 lists both canon dirs
in `.prettierignore` / `.markdownlint-cli2.jsonc`, so in this repo it checks nothing; `pharn-dev-memory-promote.md`
leaves `NPX_PENDING` and `MARKDOWNLINT_SITES`. The PRODUCT promote's `vendor/bin` `--check` lines are KEPT: they run
in a user's project, under the user's ignore files, which G1 does not change (decision for GATE 1).

## Files

- `pharn/floor/spec-template-core.mjs` — `export function blockSpans(lines)` returning `{ inside, unclosed }`; `spanned`
  delegates; header names the second consumer.
- `pharn/floor/lessons-index-core.mjs` — `LESSON_HEADING_RE`, `canonLines`, `lessonHeadings`; `parseLessons` through
  them; unclosed-block refusal; header and the L14 comment corrected.
- `pharn/floor/check-plan-lessons.mjs` — `declaredLessonIds` via `lessonHeadings`; header grammar line.
- `pharn/floor/check-provenance.mjs` — `existingIds` over visible lines, BOM stripped, unclosed-block RED.
- `pharn/floor/gen-lessons-index.mjs` — `main()` prints `RED — <message>`, exit 1.
- `pharn/floor/merge-findings.mjs` — L14 reason comment (`:200-204`), comment only.
- `pharn/floor/mark-phase.mjs` — L14 reason comment (`:149-151`), comment only.
- `pharn/floor/lessons-index-core.test.mjs` — shared fixtures: fenced / `~~~` / commented / `<pre>` / unclosed /
  BOM-first / `## L20` / `## L20` / `## L020`; ✧ closure (one grammar, three importers) + its discrimination control.
- `pharn/floor/check-plan-lessons.test.mjs` — the same fixtures: a hidden id RED, a visible one GREEN, BOM, `## L20`.
- `pharn/floor/check-provenance.test.mjs` — the same fixtures: a hidden id unique, a visible one duplicate, BOM-first
  duplicate RED, unclosed-block RED.
- `pharn/floor/gen-lessons-index.test.mjs` — invalid canon → `RED —` line, exit 1, no stack trace.
- `pharn/floor/check-spec.test.mjs` — `blockSpans` reports `unclosed` and `spanned` is unchanged (no
  `spec-template-core.test.mjs` exists; the core's other tests live here).
- `.dev/floor/gen-lessons-index.mjs` — `main()` prints `RED — <message>`, exit 1.
- `.dev/floor/gen-lessons-index.test.mjs` — the dev CLI's `RED —` line on an invalid canon.
- `.dev/floor/check-provenance.test.mjs` — L14 reason comments corrected (`:15-17`, `:363-364`) with the measured
  assertion; `canon-write-denylist` comment (`:613-619`) re-derived.
- `.dev/floor/command-hygiene.test.mjs` — ✧ both promote commands set the scope after the Step-5 gate (+ L4 control);
  `pharn-dev-memory-promote.md` out of `NPX_PENDING` and `MARKDOWNLINT_SITES`; the L7 "hook then PERMITS" comment.
- `.claude/hooks/enforce-writes-scope.test.cjs` — the same stale "PERMITS" comment (`:323-327`), comment only.
- `.claude/commands/pharn-memory-promote.md` — Step 0 → Step 6 scope move; `:390-394` prose; references re-pointed.
- `.claude/commands/pharn-dev-memory-promote.md` — the same move; `:104-116`, `:370-375`, `:535-540` prose; canon
  format block removed; description order.
- `.claude/commands/pharn-dev-ship.md` — `writes:` comment's "hook then PERMITS" clause (`:20-25`); 2b.4 order line.
- `CHANGELOG.md` — `[Unreleased]` `### Fixed` / `### Changed` entries.
- `.dev/features/lesson-heading-parser/DOCS-PROPOSAL.md` — canon L14 correction (in-place sentence and a correction
  entry candidate), for the owner.

## Sweeps (L50 / L75) — phrase → every hit → disposition

- `canon-write-denylist` outside `.dev/features/**` and merged CHANGELOG entries: `pharn-memory-promote.md:393` edited;
  `pharn-dev-memory-promote.md:374`, `:538` edited; `.dev/floor/check-provenance.test.mjs:619` edited.
- Referent "a scope naming canon is PERMITTED by the pre-write hook" (`ungated`, `PERMITS`):
  `pharn-dev-ship.md:22` edited; `.claude/hooks/enforce-writes-scope.test.cjs:326` edited;
  `.dev/floor/command-hygiene.test.mjs:867-869` edited; `.dev/floor/check-provenance.test.mjs:613` edited;
  `pharn-dev-memory-promote.md:373`, `pharn-memory-promote.md:392` edited (above). `pharn-spec.md:347`,
  `.dev/guides/floor-checks.md:169`, `pharn-contracts/seam-config.md:90` — still true (other subjects). Canon L7's
  "PERMITTED" — still true (a past event). Trusted docs: none.
- Referent "`--from-plan` annotation route": `pharn-dev-memory-promote.md:107-108` edited; no other hit.
- L14's false reason (`trailing newline` / `before a … newline` / `is TRUE`): `lessons-index-core.mjs:177-181` edited;
  `merge-findings.mjs:203` edited; `mark-phase.mjs:150-151` edited; `.dev/floor/check-provenance.test.mjs:16-17`,
  `:363-364` edited; `check-loop-record.mjs:145` — G2's (already corrected on `fix/loop-marker-integrity`, not
  touched); `check-provenance.mjs:216-222`, `.dev/floor/check-skills-version-recorded.mjs:209`,
  `.dev/floor/check-version-badge.mjs:84-86`, `pharn/floor/check-provenance.test.mjs:500` — already state the true
  fact; canon L14 — DOCS-PROPOSAL; CHANGELOG — merged, never edited.

## Contracts satisfied

- `pharn/ARCHITECTURE.md §6` plan row (`applied_lessons`: `none` | `[L<n>…]`) — unchanged; what resolves an id is now a
  rendered heading. No contract text names the heading grammar.
- `pharn/ARCHITECTURE.md §5` promotion contract — the gated write now opens only after the gate.

## Evals to write (P1)

No capability (`role:`) is added or changed; every change is floor code or command prose, covered by `node --test`:

- fixtures × three readers → expected id sets (hand-written): fenced, `~~~`, 4-backtick nesting, multi-line comment,
  one-line `<!-->`, `<pre>`, list-item indented fence + column-0 heading (visible), unclosed fence / comment (refused
  by index and provenance, plan sees only visible ids), BOM-first, `## L20`, `## L20`, `## L020`.
- ✧ closure: no non-test `.mjs` under `pharn/floor/` or `.dev/floor/` other than `lessons-index-core.mjs` holds a
  `## L(` heading regex literal; `check-plan-lessons.mjs` and `check-provenance.mjs` import from it; a grown regex in
  another file is flagged (L4).
- generator: invalid canon → stdout `RED — lessons-index: …`, exit 1, stderr has no `at` stack line (both CLIs).
- ✧ ordering: in both promote commands the first `set-writes-scope.cjs --from-frontmatter` line and the
  `--amend-scope` line come after the `AskUserQuestion` accept/deny line; a body with the setter moved back above it
  is flagged (L4).
- L14: `/^[a-z0-9-]+$/.test("enum-gate\n") === false` asserted beside the ✦ witness whose comment said `true`.

## Guarantee audit (P0)

- "a heading-shaped line inside a column-0 fence / comment / raw block is not a lesson to any of the three readers" →
  floor: enum-regex (one regex over a line set computed by one deterministic block model). **Bounded:** the model is
  `spanned()`'s, with its stated limits — an opener indented 1–3 columns at the top level, HTML block types 6–7, setext
  headings. A lesson hidden only by those still counts (fail-open, the pre-7.3.0 behaviour). Not a CommonMark parser;
  probed at build, no committed differential (residual `spec-ac-grammar-differential`, L56).
- "the three readers agree on which ids exist" → floor by construction for the plan checker and the index (one
  function); provenance's set is a deliberate SUPERSET (any visible `##` first token), stated.
- "an unclosed block that hides a lesson heading is refused" → floor: enum-regex (index: ENUM_ERROR; provenance: RED).
  The plan checker does not refuse it (advisory: the dev freshness gate and `docs:check` surface the index RED).
- "the canon scope is set only after the accept" → ADVISORY (command order; the setter is a Bash call, L19). What the
  floor adds is a ✧ text-order pin, never proof a run followed it. The window shrinks from the whole run to after the
  accept; the gate itself stays procedural (the floor cannot see a human said yes).
- "the generator never prints a stack trace" → floor-adjacent: a tested catch; exit code unchanged (1).
- Comment and prose corrections → advisory (nothing reads shipped prose; the ✧ pins are vocabulary pins).

## Trust audit (P2)

Canon and the PLAN are untrusted DATA. The new reader ranges over line STRUCTURE (block delimiters, a heading regex)
and never interprets a line's meaning; an instruction-looking comment or fence in canon can only HIDE a heading from
the index, which makes a citation of it RED (fail-closed) and never makes one GREEN. No refusal message quotes canon
text: messages name line numbers and the block kind only.

## Determinism audit (P5)

Every new branch is regex membership or a line-number comparison. `parseLessons` throws (fail-closed) on duplicate,
unsafe title, or unclosed-hiding block; provenance REDs on the same unclosed state; every terminal fallback is a RED
that names the line, never a guess.

## Decisions taken without a human (for GATE 1)

1. Reuse `spec-template-core.mjs`'s column-0 block model (export `blockSpans`), not G1's new `plan-files-core.mjs`
   `scanLines` (not merged; a `## Files` list-item reader at any indent, a different question) and not a new copy.
2. `## L20` (no title) becomes a lesson heading everywhere (index then refuses its empty title, as it does `## L20`);
   `## L020` / `## L0` become no heading anywhere.
3. An unclosed block hiding a lesson heading is refused by the index and provenance (new, fail-closed).
4. Provenance keeps its generic first-token id set (pattern-library) — a superset — rather than `LESSON_HEADING_RE`.
5. Product promote's `vendor/bin` `--check` lines kept (they run under a user's ignore files); dev canon block removed.
6. L50 sweep hits outside the finding's lines are fixed here (two product floor comment-only files, four comment sites
   in tests and one in `pharn-dev-ship.md`).
7. Canon L14: DOCS-PROPOSAL carries (a) the in-place sentence replacement and (b) a correction-entry candidate,
   validated with `.dev/floor/check-provenance.mjs` at GATE 2 (its `source` needs this run's REVIEW.md).

## Open questions (HALT)

- None blocking. The seven decisions above are recommendations for the orchestrator at GATE 1.
