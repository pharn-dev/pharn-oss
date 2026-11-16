# BUILD — loop-command-sections (CORE-109, step 1; 7.18.1)

Built on `b0f2f9cf` + the GATE 1 record, from `.dev/features/loop-command-sections/PLAN.md`. Spec hash recomputed at
build Step 1: `d19c3ae5…7a8bcf`, equal to the pin. Step 0 set a 6-path scope from the plan and anchored the reconcile
baseline (3,725 paths) after it.

## What landed

- `.claude/commands/pharn-loop.md`: the Step 2 stuck-point table rewritten in Prettier's compact form, with
  `<!-- prettier-ignore -->` on the line directly above its header. Nothing else in the file changed. The written file is
  byte-identical to the one a script produced from the 7.18.0 file by trimming each cell and rejoining with `" | "`
  (`cmp` exit 0).
- `.dev/floor/command-hygiene.test.mjs`: `COMMAND_BYTE_CEILINGS["pharn-loop.md"]` 93,184 → 91,136, and the ✧ 7.18.1 test
  (`compactTableOffenders`) with five controls: the ignore line removed, a padded separator, a padded S7 row, a dropped
  S8 row (line count) and a renamed heading (anchor not found).
- `SKILLS_VERSION` 7.18.1, the README badge, and a `## [7.18.1]` CHANGELOG section.

## Measurements (at the real path)

| file                                   | 7.18.0 (B) | 7.18.1 (B) |
| -------------------------------------- | ---------- | ---------- |
| stuck-point table (26 lines)           | 14,738     | 7,158      |
| `.claude/commands/pharn-loop.md`       | 90,340     | 82,785     |
| `.claude/commands/pharn-loop-quick.md` | 11,568     | 11,568     |
| `.claude/commands/pharn-loop-close.md` | 41,481     | 41,481     |
| family total                           | 143,389    | 135,834    |

The 7.18.1 table figure includes the 25-byte ignore line. The ceiling rule gives 82,785 × 1.1 = 91,063.5, rounded up to
91,136. `STAGE_LOAD_CEILINGS["pharn-loop"]` (195,072) is unchanged, as decided at GATE 1 (Q3).

## Style tools at the real path (L26, L57)

- `npx --no-install prettier --ignore-unknown --write -- <the five scoped files>` printed `pharn-loop.md … (unchanged)`.
  `cmp` against a copy made before the run: identical. So Prettier, run on this file with this repo's config, leaves
  the compact table alone.
- `npx --no-install markdownlint-cli2 --no-globs --fix -- pharn-loop.md CHANGELOG.md README.md`: `Linting: 3 files`,
  `0 issues`.
- `npx --no-install eslint -- .dev/floor/command-hygiene.test.mjs`: exit 0.
- Deviation, advisory orchestration: the pinned Step 2b block (`$SCOPE`, `node -e "$PICK" | xargs -0`) is refused by
  this isolated worktree's shell guard. The same three tools ran on the same scoped paths, named explicitly.
  `BUILD.md` was formatted the same way after it was written.

## AC 6 — the rows are unchanged (differential check against `git show HEAD:.claude/commands/pharn-loop.md`)

A scratch script (`node check.mjs <7.18.0 file> <7.18.1 file>`, kept outside the repo) printed:

```text
rows before 26, after 26; header+data rows with identical trimmed cells: 25/25; differing: []
separator before: 3 all-dash cells = true; after: | --- | --- | --- |
every line outside the table identical (the new ignore line aside): true; line above new table: <!-- prettier-ignore -->
```

The header and all 24 rows have the same three trimmed cells, in the same order. Only the padding and the separator's
dash count changed. Every other line of the file is identical.

## AC 4 — every heading resolves through `command-section.mjs`

The same script ran `node pharn/floor/command-section.mjs .claude/commands/pharn-loop.md '<heading text>'` for every
`##`/`###` heading outside fences:

```text
command-section.mjs over 11 ##/### headings: 11 exit 0, 0 non-zero []
```

`'Step 2'` prints all 24 `| S…` rows and ends at `<!-- end of section: ## Step 2 — The stuck-point table … -->`. The
one-line HTML comment does not swallow the section.

## Floor

`node pharn/floor/validate.mjs .`: `FLOOR: GREEN — 37 capabilities checked in "."` (exit 0). No capability is in this
increment's paths.
