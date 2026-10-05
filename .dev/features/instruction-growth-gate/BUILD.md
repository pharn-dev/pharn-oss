# BUILD — instruction-growth-gate

Built against `spec_content_hash` d831d30d… (recomputed at Step 1: match). The build scope came from PLAN `## Files` via
the plan-scope setter (24 paths), and the reconcile epoch was anchored after it.

## What landed

- `pharn/floor/instruction-files-core.mjs` (pure): the set, the line-multiset measure, the threshold, closed codes.
- `pharn/floor/instruction-files.mjs` (I/O): the two trees, BASE_RULE via `resolveBaseSource`, and the threshold read at
  base with `--no-replace-objects`.
- `pharn/floor/check-instruction-files.mjs`: the CLI entry, with no static import. A crash exits 2 `crashed`.
- `pharn/floor/gate-run-core.mjs`: `INSTRUCTION_GROWTH_ID` and `instructionGrowthEntry()`. The entry is injected for
  verify before `reconcile`, and the id is reserved and never reused.
- Contracts: `verify-report.md` gets the gate id in its two built-in-gate lists. `gate-run-record.md` gets the reserved
  ids, the order and the "proves" line.
- `/pharn-verify` gets one reference bullet (version 0.6.0; 18,286 B against its 18,432 B ceiling).
- `CLAUDE.md` gets a Commands entry. `SKILLS_VERSION` is 6.36.0, with the README badge and the regenerated
  CURRENT-STATE count (110). `CHANGELOG [6.36.0]` is added.

## Decisions made during the build (recorded, each within the approved plan)

- **Plan amended after GATE 1, test files only.** The grill's P1 finding added `stage-runtime.test.mjs` and
  `frontmatter-core.test.mjs` to `## Files`. The two glob entries were replaced by the literal `BUILD.md` path, because
  the setter emits literal paths only. The amended plan was re-scoped and re-anchored before the first write.
- **`frontmatter-core.test.mjs` left unchanged.** Its CONSUMERS pin requires a literal `stripBom(` call. The new core uses
  `matchFrontmatter`, which strips the BOM itself and is what frontmatter-core.mjs tells new consumers to use. Calling
  `stripBom` twice to satisfy the pin would be the wrong change. The BOM case is covered in
  `instruction-files-core.test.mjs`.
- **Grill fixes folded in:**
  - base objects are read with `--no-replace-objects`, and a test forges a replace ref with a control;
  - multiset-vs-set controls (a copy of a line counts; a reorder is free);
  - a duplicated `paths` key reads as `frontmatter-unparsed`;
  - the claims are narrowed in the module headers ("the runner composes it"; the under-count routes; the cumulative
    bound);
  - this repo's own `CLAUDE.md` addition is kept within the shipped default: 933 B added, measured with
    `--growth --base-rule` against `d40667d`.
- Grill findings NOT acted on, named instead:
  - the base-binding residual for committed growth;
  - INCONCLUSIVE retried by the loop to its cap;
  - a clean tree without `origin/main` at verify;
  - the dirty predicate duplicated from `stage-regress.mjs`, which does not export it (this copy uses `-z`);
  - the core's two reasons to change.

## Floor

`node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 36 capabilities checked`.

## Coverage (`node --test --experimental-test-coverage`, line %)

| file                          | line % |
| ----------------------------- | -----: |
| `instruction-files-core.mjs`  | 100.00 |
| `instruction-files.mjs`       |  95.32 |
| `check-instruction-files.mjs` |  92.23 |
| `gate-run-core.mjs`           |  99.76 |

## Mutation controls (L60)

Each mutant undoes one property in a temp copy of the floor. Its named test must go red there and stay green on the
unmutated copy.

| mutant                                                               | test                                                                  | unmutated | mutant |
| -------------------------------------------------------------------- | --------------------------------------------------------------------- | --------- | ------ |
| M1 net bytes in `growth`                                             | CLI "deleting unrelated content"                                      | pass      | FAIL   |
| M1b net bytes in `addedBytes`                                        | core "removals never offset additions"                                | pass      | FAIL   |
| M2 threshold read from the working tree                              | CLI "the threshold is read at the BASE"                               | pass      | FAIL   |
| M2 threshold read from the working tree                              | stage-verify "also raises the threshold in its own tree" (acceptance) | pass      | FAIL   |
| M3 a line set instead of a multiset                                  | core "MULTISET, not a set"                                            | pass      | FAIL   |
| M4 untracked files dropped (`git ls-files` tracked only)             | CLI "untracked always-loaded files count"                             | pass      | FAIL   |
| M5 git-ignore not honoured (`--others` without `--exclude-standard`) | CLI "untracked always-loaded files count"                             | pass      | FAIL   |

The runner (`.pharn/pharn-dev-build/mutate.mjs`) was scratch and was deleted after the run.
