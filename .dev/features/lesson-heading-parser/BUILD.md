# BUILD — lesson-heading-parser

Built from `PLAN.md` (GATE 1 decided by the batch orchestrator, a model, under the owner's delegation). Step 0: the
setter scoped 23 paths from `## Files`; the reconcile baseline was anchored after it. Spec hash `d5a97430…`
unchanged.

## What landed

- `pharn/floor/lessons-index-core.mjs`: `LESSON_HEADING_RE`, `H2_ENTRY_RE`, `canonLines()`, `lessonHeadings()`;
  `parseLessons` reads visible headings, ends a section at the next visible `##`, and refuses a lesson heading hidden
  by a block that never closes; the L14 comment is corrected.
- `pharn/floor/spec-template-core.mjs`: `blockSpans()` exported (`{ inside, unclosed }`); `spanned()` returns its
  `inside`, unchanged. Both headers state the coupling (GATE 1 decision 1).
- `pharn/floor/check-plan-lessons.mjs`: ids from `lessonHeadings()`; its private regex is gone.
- `pharn/floor/check-provenance.mjs`: existing ids from visible lines of `canonLines()` (BOM stripped), generic first
  token kept; an unclosed block hiding an entry is a `canon` RED.
- Both generators print `RED — <message>` (via a total `errorText`, L62) and exit 1 on an invalid canon.
- Both promote commands set the canon scope at Step 6.1, after the accept; prose corrected; the dev canon `--check`
  block removed. `pharn-dev-ship.md`, `mark-phase.mjs` and four test comments corrected per the sweep (not
  `merge-findings.mjs`, which is G8's).
- `.dev/guides/floor-checks.md`: three sections updated. CHANGELOG: three `### Fixed` entries.
- `DOCS-PROPOSAL.md`: canon L14 correction for the owner.

## Probes (L37 / L55 / L56 / L74)

**Hook claim probe** (the prose now says protect-trusted-paths denies a canon write under a non-promote scope).
Sandbox with both hooks copied into `<tmp>/.claude/hooks`, a scope record naming
`.dev/memory-bank/lessons-learned.md`, a `Write` payload to it:

```text
control trusted doc: protect exit=2
origin=.claude/commands/pharn-dev-ship.md        protect exit=2  enforce exit=0
origin=.claude/commands/pharn-dev-review.md      protect exit=2  enforce exit=0
origin=.dev/features/x/PLAN.md                   protect exit=2  enforce exit=0
origin=.claude/commands/pharn-dev-memory-promote.md protect exit=0 enforce exit=0
```

**markdown-it differential** (`markdown-it` 15.0.3 from `node_modules`, `html: true`; scratch, not committed — a
dependency decision). Compared the line indices markdown-it renders as `##` headings whose text matches
`LESSON_HEADING_RE` with `lessonHeadings()`. Per L74 each fixture also has a hand-written expected id set, because
the lesson-id predicate is shared by both sides:

````text
AGREE  ours=ok md=ok | ```text fence
AGREE  ours=ok md=ok | ~~~ fence
AGREE  ours=ok md=ok | 4-backtick holding 3
AGREE  ours=ok md=ok | multi-line comment
AGREE  ours=ok md=ok | one-line <!-->
AGREE  ours=ok md=ok | <pre>
AGREE  ours=ok md=ok | list-item indented fence + col-0 heading
AGREE  ours=ok md=ok | BOM first
AGREE  ours=ok md=ok | ## L20 no title
AGREE  ours=ok md=ok | ## L20 trailing space
AGREE  ours=ok md=ok | leading zero / zero
AGREE  ours=ok md=ok | unclosed fence
AGREE  ours=ok md=ok | unclosed comment
AGREE  ours=ok md=ok | comment closed mid-line then heading
AGREE  ours=ok md=ok | fence closer indented 4 (content)
AGREE  ours=ok md=ok | backtick info string with backtick (not a fence)
DIFFER ours=BAD md=ok | BOUND: top-level opener indented 2
DIFFER ours=BAD md=ok | BOUND: HTML type 6 <div> (ends at blank line)
real dev canon: markdown-it 81 lesson headings, ours 81, identical=true
````

The two divergences are the stated bounds (fail-open, as before 7.3.0), and both are named in the headers, the
guide and the CHANGELOG entry.

**Non-vacuity (L4).** The 13 `★ one grammar` parity tests were run against a scratch copy of the floor with the
PRE-FIX `check-plan-lessons.mjs` and `check-provenance.mjs`: 9 fail, 4 pass (the four fixtures where old and new
readers agree: the one-line `<!-->`, the list-item fence, the `## L20` case and the leading-zero case on the
provenance side). The ✧ closure and the ✧ scope-after-gate pin each carry a mutant control.
