# PLAN — ship-step2-part

- spec_content_hash: 2c84959cbca0b2dc51aaad90f90d40e574732c9c5c83c0bda7e1481ecb0db12e
- applied_lessons: [L22, L29, L36, L55, L60, L67, L73]
- increment: Move `/pharn-ship`'s post-GATE-1 chain (`## Running a stage`, Step 2 after the SPEC approval, Step 2b) into a third part, `pharn-ship-stages.md`, read once after GATE 1, with one `###` section per stage; add a tested section extractor, `pharn/floor/command-section.mjs`, and a compaction rule in `/pharn-ship` and `/pharn-loop` that re-reads the section of the step in progress with it; budget the `pharn-dev-*` commands' bytes in `COMMAND_BYTE_CEILINGS`.
- layer(s): product `.claude/commands/` (pharn-ship family, pharn-loop), product floor (`pharn/floor/command-section.mjs`), dev apparatus (`.dev/floor/` tests and `command-family.mjs`, `.dev/guides/`)
- constitution_refs: [P0, P4, P5, P6, P7]
- findings: ARCH-7 (single command steps too long to follow), CTX-4/CTX-5 PARTIAL (no rule re-reads the MAIN command after a compaction). Triage at d5453a17, re-read live at 1da5bb14 (main 6.66.0).

## Discovery (live, this run)

- `.claude/commands/pharn-ship.md` is 42,422 B / 646 lines. `## Step 2 —` runs from line 255 to 560 (306 lines, ≈19.6 KB); `## Running a stage` is lines 131–237 (≈9.5 KB); `## Step 2b` lines 561–620. The finding's numbers hold.
- Everything from Step 2 item 1's "Structural backstop (on resume, before `/pharn-plan`)" onward runs only after GATE 1. `/pharn-spec` is inline by `ROUTE_POLICY` (`inline:interactive`) and has no start line, so `## Running a stage` is also needed only after GATE 1.
- Reads accumulate: a part read at a point stays in context for the rest of the conversation. So no part split lowers the PEAK a full run holds. What a part changes is what is held BEFORE its load point, and what a run that never reaches that point ever loads.
- Compaction re-reads today: `pharn-ship.md` pointers (`## Quick mode`, `## Closing the run`) and `pharn-loop.md` pointers (`## Quick mode`, `## At the stop`) each re-read their PART after a compaction. Nothing re-reads the main command, which the compaction summarises like any other turn.
- The only section extractor is `pharn/floor/griller-extract.mjs` (griller-specific, omission-based).
- `COMMAND_BYTE_CEILINGS` (`.dev/floor/command-hygiene.test.mjs` ~:4847) closes over product files only; `pharn-dev-*` sit outside it (follow-up `dev-command-slim`, named in that header, in `stage-load-budget.test.mjs`'s header and in `.dev/guides/product-commands.md`).
- Measured (bytes, LF): pharn-dev-build 13,771; -eval 9,907; -grill 22,836; -memory-promote 45,963; -plan 18,512; -regress 20,234; -review 8,931; -ship 42,526; -verify 24,713.
- A scratch prototype of the split (scratchpad copy, not the repo) left `command-hygiene`, `stage-load-budget`, `frontmatter-readers` and `capability-catalog-core` green except BUDGET R1 (no row for the part) and R3 (no description line). The product tests that read `pharn-ship.md` text are being run on the same prototype; their result fixes the test list in `## Files` before build (see Open questions).

## Decisions

- **D1 — one `stages` part, not one part per stage.** A part per stage adds a ~1.2 KB pointer each and still accumulates, so it costs bytes and saves nothing at the peak. One part, loaded once, holds `## Running a stage`, `## Step 2, after GATE 1` with eight `###` sections (`Step 2.1` the backstop/base/run marker/snapshot/entry gates, `Step 2.2` plan … `Step 2.7` verify, `Step 2.8` GATE 2) and `## Step 2b`. The `###` sections are the per-stage split ARCH-7 asks for: each stage's text is addressable by heading, and the item numbers the text already uses ("step 7", "Step 2 item 1") become the headings' numbers. The list items and their pinned text stay as they are.
- **D2 — load point: after GATE 1.** Read once, after `/pharn-spec` has pinned an Approved SPEC (the turn that resumes past GATE 1), before the structural backstop; never earlier (not while `/pharn-spec` runs, and not at a GATE 1 that keeps the SPEC as a Draft). What it reduces, measured on the prototype: the main file the GATE-1 stretch holds drops from 42,422 B to ≈14 KB (+ the pointer), alongside `/pharn-spec`'s own inline 26 KB; a run that ends at GATE 1 never loads ≈29 KB. Not reduced: the peak after GATE 1 (+≈1.5 KB of pointer), and the stage load budget's family total (same bytes, plus the pointer).
- **D3 — not-loaded rule.** STOP before the backstop; `<name>` exists, so it is a STOP "before step 7 once `<name>` exists" and `## Closing the run` says what follows, as for a backstop RED. Never run the stages from memory.
- **D4 — `pharn/floor/command-section.mjs <file> <heading>`.** Prints one ATX section (levels 2–6) of a PHARN command file: the heading whose text equals `<heading>`, or starts with `<heading>` followed by a space, through the line before the next heading of the same or a higher level, both outside fences (backtick and tilde, CommonMark open/close rules as `griller-extract.mjs` models them); then one end line `<!-- end of section: <heading line> -->`. Exit 0 printed; exit 2 refusal with the reason on stderr and nothing on stdout: usage (exactly two operands), a file that is not a regular, non-symlink `pharn-*.md` whose parent's realpath is `<cwd>/.claude/commands` (L73: identity by realpath, not spelling), unreadable, no match, or more than one match. BOM and CRLF tolerated. FLOOR: the printed bytes are that section by these rules (regex/equality, primitive #3), tested. ADVISORY: that a run runs it after a compaction, and that the rules match a renderer beyond the committed command files (L55 — no markdown-it differential is added; stated as a bound).
- **D5 — the compaction rule, in both orchestrators.** One paragraph after each trusted prefix: after a compaction, before the next step, re-read the section of this file the step in progress belongs to with the pinned line, then every part the run has read, in full, as its pointer says; on a non-zero exit, read this file in full with the Read tool. `/pharn-ship`'s line names `.claude/commands/pharn-ship.md`, `/pharn-loop`'s names `.claude/commands/pharn-loop.md` (the file operand is fixed in the pinned line, so the grant cannot name another file). `/pharn-loop`'s `allowed-tools` gains exactly `Bash(node pharn/floor/command-section.mjs .claude/commands/pharn-loop.md *)` (the derived grant; the existing closure test derives it). Both claims blocks (close parts) gain one advisory bullet line.
- **D6 — dev commands in `COMMAND_BYTE_CEILINGS`.** R1 (closure) and R2 (bytes) range over every `pharn-*.md` on disk, `pharn-dev-*` included; R3 (description), R4 (claim vocabulary) and R5 (claims heading) stay product-only — dev descriptions carry FLOOR/ADVISORY by design, and slimming them stays the follow-up `dev-command-slim`. Nine rows at measured + 10% rounded up to 512: build 15360, eval 11264, grill 25600, memory-promote 50688, plan 20480, regress 22528, review 10240, ship 47104, verify 27648. `pharn-ship.md`'s row goes DOWN to its measured + 10% (as 6.32.0 did), and `pharn-ship-stages.md` gets its own row.
- **D7 — follow-ups, named, not done here.** `pharn-loop.md` Step 1 (≈129 lines) and `pharn-loop-close.md` Step 6 (≈193 lines): the extractor and the compaction rule already cover the loop; giving those steps `###` per-sub-step sections is the follow-up `loop-step-sections`. `pharn-dev-memory-promote.md` Step 6 (≈154 lines) is apparatus: under `dev-command-slim`.

## Applied lessons

- L22 — the extractor is invoked by one pinned line per orchestrator, with a fixed file operand; the prose never describes a technique to re-read a section.
- L29 — the closure rules range over sets: R1/R2 over every `pharn-*.md` on disk, the part rules over the parts discovered from frontmatter, the live extractor test over every heading of the files the rules name.
- L36 — the new part kind joins the closed `PART_KINDS` / `EXPECTED_PARTS` / `PLACEMENT` sets, and the grant stays the derived exact set (closure both ways), so a variant spelling of the pinned line fails.
- L55 — the extractor re-derives a renderer's heading structure; its fence model is `griller-extract.mjs`'s (CommonMark rules), and the bound that it is not differentially tested against a renderer is stated in its header and claims line.
- L60 — every new assertion gets its own negative control: each new pointer pin rewritten, the extractor's boundary/fence/ambiguity/path refusals each mutated, the compaction rule's pinned line removed in each command.
- L67 — the extractor's fixture list enumerates the input kinds of the grammar it models (tilde and backtick fences, a longer closer, an indented fence, a heading-like line inside a fence, a deeper heading inside a section, a same-level end, EOF end, BOM, CRLF), not only the committed files.
- L73 — the file refusal compares the parent directory's realpath with `<cwd>/.claude/commands`'s realpath and refuses a symlinked leaf, never a lexical prefix test.

## Files

- `.claude/commands/pharn-ship.md` — Running a stage, Step 2 from the backstop, and Step 2b move out; the stages
  pointer, the compaction rule and its pinned line come in; two cross-references reworded; reads gains the extractor
- `.claude/commands/pharn-ship-stages.md` — new part (part: stages): the moved text, one ### section per stage
- `.claude/commands/pharn-ship-close.md` — the claims parts bullet names the stages part; one claims line for the
  extractor and its bound
- `.claude/commands/pharn-loop.md` — the compaction rule and its pinned line; the derived allowed-tools grant; reads
  gains the extractor
- `.claude/commands/pharn-loop-close.md` — one claims line for the extractor, the main-command re-read and the grant
  bound
- `pharn/floor/command-section.mjs` — new floor CLI (D4)
- `pharn/floor/command-section.test.mjs` — its tests: fixtures per input kind, refusals, entry guard, live headings
- `pharn/floor/pre-run-snapshot.test.mjs` — its REPORTED (R1) test reads ship's GATE-2 item from the main file
  directly; switched to commandFamilyText (found by the prototype run, Q2)
- `.dev/floor/command-family.mjs` — PART_KINDS gains stages; it splices at the end of the parent's Step 2 section
- `.dev/floor/command-family.test.mjs` — R1/R5/R5b/R7/helper rules extended to the stages part, with controls
- `.dev/floor/command-hygiene.test.mjs` — COMMAND_BYTE_CEILINGS rows (D6), R1/R2 closure over dev commands, pins on
  the compaction rule in both orchestrators
- `.dev/floor/stage-load-budget.test.mjs` — header sentence on the dev commands; ceilings only if the measured totals
  pass them (measured + 10%, up to 512)
- `.dev/guides/product-commands.md` — the part paragraph, the budget paragraph, the compaction re-read
- `.dev/guides/floor-orchestration.md` — a command-section.mjs section
- `SKILLS_VERSION` — minor bump (new floor CLI)
- `CHANGELOG.md` — the new version section, naming the two follow-ups
- `README.md` — the generated Current state region and the version badge, if docs:generate / check:badge move them
- `docs/capabilities/README.md` — only if npm run docs:generate regenerates it
- `.dev/features/ship-step2-part/BUILD.md` — build note
- `.dev/features/ship-step2-part/REGRESSION.md` — stage artifact
- `.dev/features/ship-step2-part/regression-report.json` — stage artifact
- `.dev/features/ship-step2-part/VERIFY.md` — stage artifact
- `.dev/features/ship-step2-part/verify-report.json` — stage artifact
- `.dev/features/ship-step2-part/REVIEW.md` — stage artifact
- `.dev/features/ship-step2-part/SHIP.md` — stage artifact

## Contracts satisfied

- None changed. The part rules are `.dev/guides/product-commands.md` "A command's text a run needs at only ONE point may live in a PART file" (cited); the budget rule is the same guide's "A product command keeps what a run executes".

## Evals to write (P1)

- No capability (no `role:` file) is added or changed, so no eval fixture is owed. The new floor CLI gets its test file (`command-section.test.mjs`).

## Guarantee audit (P0)

- "the extractor prints exactly the named section" → floor: enum-regex (heading/fence rules, equality), tested by fixtures per input kind; bound: matches a renderer only as far as those fixtures and the committed files reach (L55).
- "the extractor refuses a file outside `.claude/commands/`, a symlink, an ambiguous or missing heading" → floor: enum-regex + realpath identity, tested.
- "after a compaction the run re-reads the step in progress" → advisory (a Read/Bash the model runs; no hook sees it). Tests pin the TEXT only.
- "the stages part is read after GATE 1, and never earlier" → advisory; command-family tests pin the pointer's sentences and that no other command text names the part.
- "the dev commands are within their byte ceilings" → floor: byte count against a table (test), never meaning.
- "the grant pre-approves exactly the pinned extractor line" → floor over the text (derived exact grant, closure both ways); that Claude Code honours it is harness behaviour (advisory, as stated in the loop's claims).

## Trust audit (P2)

- The extractor reads only PHARN's own command files (refused otherwise) and prints them; its output is trusted text exactly as the file is. No untrusted artifact is read. A user-edited command file is printed as edited, as a Read would show it.

## Concurrency (batch)

- Group J adds a grant line to `pharn-loop.md`, PR #366 changed loop grants and `pharn-build.md`; group G edits `pharn-test` / `pharn-build` / `pharn-plan` sentences. At PR time: merge `origin/main`, re-resolve the `allowed-tools` list and the `COMMAND_BYTE_CEILINGS` / `STAGE_LOAD_CEILINGS` rows, renumber the version by diff.

## Resolved at GATE 1

GATE 1 was delegated to the batch orchestrator; these are model decisions made under the maintainer's delegation, not
human approvals.

- Q1 — `## Running a stage` moves into the part: yes.
- Q2 — tests that read moved text from the main file are listed in `## Files` before build Step 0 and switched to the
  family text, no assertion weakened. The prototype run (a scratchpad copy) found one: the REPORTED (R1) test in
  `pre-run-snapshot.test.mjs` (plus BUDGET R1/R3 and the command-family rules, already listed). A second failure there,
  CTX-14 in `render-run-report.test.mjs`, runs `check-instruction-files.mjs` against the copy, which is not a git
  checkout; it reads no command text.
- Q3 — follow-ups `loop-step-sections` and `dev-command-slim` are named in the CHANGELOG: yes.
- Q4 — minor bump. Main is 6.67.0 after #366, so 6.68.0 unless main moves again (renumber at PR time).
- Added at GATE 1: the CHANGELOG and the loop claims state the grant's bound — the extractor reads only a regular
  `pharn-*.md` under `.claude/commands`.
