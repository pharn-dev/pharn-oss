# BUILD — ship-step2-part

- plan: `.dev/features/ship-step2-part/PLAN.md` (GATE 1 delegated to the batch orchestrator; recorded there)
- spec hash: re-computed at build Step 1, matches the plan's pin (`2c84959c…db12e`)
- writes-scope: set from the plan (25 paths), then the reconcile baseline anchored (`--by pharn-dev-build`), in that
  order
- floor: `node pharn/floor/validate.mjs .` → GREEN (37 capabilities), exit 0

## What landed

- `/pharn-ship` split: `## Running a stage`, Step 2 from the structural backstop on, and Step 2b moved into the new part
  `.claude/commands/pharn-ship-stages.md`, with one `###` section per Step 2 item (Step 2.1 to Step 2.8). The main file
  went from 42,422 to 16,037 bytes; the part is 29,967 bytes. The move itself was MECHANICAL and done by a generator run
  through Bash — `split.mjs` in this session's scratchpad, which cut the file at fixed anchors, de-indented item 1's
  continuation by three spaces and inserted the `###` headings — over two paths the plan's `## Files` declares, so both
  guards would have allowed the writes (CLAUDE.md: a legitimate Bash write to a declared path). Every prose edit after
  it (the pointer, the frontmatter, the intro, the cross-references) went through the Edit tool.
- `pharn/floor/command-section.mjs` and its test (12 tests).
- The compaction paragraph and pinned line in both orchestrators; `/pharn-loop`'s derived grant; claims lines in both
  close parts; the stages part named in ship's parts claims bullet.
- `command-family.mjs` learns `stages`; its test pins the new part (R1, R4/R5, R5b, R7, helper), each with controls.
- `command-hygiene.test.mjs`: `COMMAND_BYTE_CEILINGS` gains the stages row, the nine dev rows, and `pharn-ship.md`'s row
  went down (45,056 → 17,920); R1/R2 range over every `pharn-*.md`; the compaction pins; `<heading>` joins
  `SHELL_VALUES`.
- `pre-run-snapshot.test.mjs` reads ship's GATE-2 item through the family text (the one test the prototype run found).
- Guides (`product-commands.md`, `floor-orchestration.md`), `SKILLS_VERSION` 6.68.0, CHANGELOG [6.68.0], README badge
  and the regenerated current-state count (141 → 142 floor `.mjs` files).

## Decisions made at build

- The family splice puts the stages part at the end of the parent's Step 2 section. So in the family text
  `## Running a stage` now follows Step 2 item 1 instead of preceding `## Quick mode`; the prototype run and the full
  suite show no test compared those offsets (grill finding on coupling).
- The extractor refuses three constructs rather than guessing (unclosed fence, unclosed comment, ambiguous indented
  fence), the failure direction being a whole-file Read.
- The realpath comparison of the file's parent is defence in depth, stated as such in the header and its test: the
  spelling rule already fixes the parent.

## Step 2b format

The pinned block uses `xargs` and `$SCOPE`, which this worktree-isolated session refuses; it ran as an argv-array node
runner under `.pharn/ship-step2-part/` over the same scope list (22 existing paths): prettier exit 0, markdownlint 0
issues, eslint 2 errors (an unused binding, an irregular-whitespace BOM literal), both fixed by hand, then eslint
exit 0.
