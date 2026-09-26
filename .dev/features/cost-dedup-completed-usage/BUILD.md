# BUILD — cost-dedup-completed-usage

- Plan: `.dev/features/cost-dedup-completed-usage/PLAN.md` — GATE 1 approved as written by the maintainer through the
  approval form (identity from the first line); the post-grill amendments G1–G12 are recorded there.
- Spec hash (Step 1): `node .dev/floor/hash-doc.mjs pharn/ARCHITECTURE.md` printed
  `4950796f5342df20a298fe22812e45dec3c15317592bd2358a31e149d2dc1c7f`, equal to the plan's pin. No open questions.
- Step 0: `set-writes-scope.cjs --from-plan` set 25 paths; `reconcile-baseline.mjs --anchor --by pharn-dev-build`
  anchored 2307 paths with that scope.
- Step 2b: the pinned scoped pass formatted the scope's 25 paths. Prettier reported the six not-yet-written stage
  artifacts as absent, which is harmless. markdownlint found 0 issues in 11 files and eslint reported nothing. The
  CHANGELOG diff is one hunk, a pure 48-line insertion. Repo-wide confirmations: `format:check`, `lint:md` (1491 files,
  0 issues) and `lint` all exit 0.
- **Floor (Step 3): `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 36 capabilities checked in "."`, exit 0.**
- Pre-checks, advisory (verify owns the verdict): `check:badge`, `check:changelog`, `docs:check`, `check:markers` and
  `check:contributing` exit 0.

## What landed

- **The rule, one owner (D1, D2).** `pharn/floor/render-cost-record.mjs` exports `sessionRequests(projectDir,
sessionId)`. It returns `{ files, requests: [{ id, record, usage }] }`, one entry per request in first-occurrence
  order. `record` is the request's FIRST line with `message` reduced to `{ model }`. `usage` is the request's line
  with the greatest `output_tokens`, where a non-finite value ranks -1 and the earliest line wins a tie. `aggregate()`
  consumes it. `render-cost-ledger.mjs`'s `buildLedger()` consumes it too, and the ledger's copies of the session-file
  filter, the line filter and the first-line dedup are deleted, with its `SYNTHETIC` constant and its
  `transcriptFiles` import. `check-cost-ledger.mjs` is unchanged: `--verify-transcript` reaches the owner through
  `deriveLedger`.
- **Headers (D3, G1, G2, G10).** The record's header states the three measured shapes (growing lines, a zeroed
  re-append, a fork's copy of an early line), the rule, and its one ADVISORY assumption with its evidence. It says
  "counts can fall" without a count. It also states the file's two axes and the extraction trigger (a third
  consumer). The ledger's header points at the owner, and neither ledger prose line spells a pinned pattern.
- **Contracts and command (D3, D4, G3–G5).** `cost-ledger.md`: which line a row's identity and usage come from, the
  floor/advisory split under it, the rule-6 bullet, a pre-6.22.1 compatibility note (a `/2` ledger whose window holds
  a disagreeing request REDs `--verify-transcript` truthfully; a `/1` is declined; `skills_version` is labelled
  advisory), and the relationship section (one implementation of the reader; parity is agreement only).
  `ship-record.md`: both expired claims corrected, and the pre-6.22.1 note. `/pharn-ship` Step 3b cites the
  renderer's rule instead of restating it.
- **Fixture (D5, G6).** `pharn/floor/fixtures/cost-ledger/usage-snapshots/`: a parent transcript and one forked
  subagent file, five requests (A 8/8/163, B zeroed re-append, C fork copy of an early line, D and E ordinary). No
  `content`, no `cwd`.
- **Tests (D5, G7–G9).**
  - `render-cost-record.test.mjs` (+10; iteration 1 below corrects the earlier +11): fixture preconditions read from raw bytes; completed usage totals and per
    request; identity from the first line; determinism over the new fixture; no message body; tie keeps the earliest;
    non-number ranks below. Two mutant controls: first-line reads A as 8, and last-line reads B as 0 and C as 9.
  - `render-cost-ledger.test.mjs` (+4, parity extended): rows at completed usage with the first line's `ts`; a
    membership boundary between A's first and last line; a ledger emitted over a mutated owner reads 8; parity over
    both fixtures; the one-owner closure with its negative control. The G7 comment is reworded.
  - `check-cost-ledger.test.mjs` (+2): `--verify-transcript` GREEN at completed usage, and RED on a first-line ledger
    whose row was rebuilt through the emitter's own `sanitizeUsage` / `normalizeTokens`.
- **Version and meta (D4, D6, G12).** `SKILLS_VERSION` 6.22.1, the README badge, `CHANGELOG.md` `[6.22.1]`
  `### Fixed` (including the row-`usage` change), and the `CLAUDE.md` import sentence.
- **Measurements (G11).** `.dev/measurements/cost-dedup-usage-2026-09-26.md` (anonymized paths, both scripts
  embedded verbatim, the raw output) and a dated pointer in `token-cost-2026-08-18.md`.

## One negative control run by hand (L60), not committed

The ★ MEMBERSHIP test must fail for a reader whose identity follows the selected line. I measured it on a scratch
copy of the product floor whose owner set `record` from the winning line. Over the test's window it emitted **0
rows, 5 excluded**, against the real owner's **1 row (`req_fx_snapshots`), 4 excluded**, so the committed test's
two assertions go red on that mutant.

## Decisions taken while building

- The owner's closure patterns (`message?.usage`, `requestId ??`) appear only in `render-cost-record.mjs`. The ledger
  reads `r.message.model` from the projected record, which the patterns do not match.
- The fixture lives at `pharn/floor/fixtures/cost-ledger/usage-snapshots/`, where the committed-fixture guard's
  directory walk already covers it for absolute paths.
- In the tests, the new constants are declared before the tests that use them. An early draft used them in a test
  that sits before their declaration, which fails with a TDZ error the moment the runner starts that test.

## Fix iteration 1 (after GATE 2, 2026-09-26)

The first review (`REVIEW.md`) reached GATE 2 with 0 floor-gate findings and 11 advisory ones. The maintainer chose:
fix and re-run, bound R1, extract a core for R2, and promote the lesson. The decisions are recorded in `PLAN.md`,
"Fix iteration 1".

- **Before this build:** L63 was promoted by `/pharn-dev-memory-promote` under its own scope, human-accepted, which
  wrote `.dev/memory-bank/lessons-learned.md` and regenerated `docs/lessons-index.md`. Then the scope was re-set from
  the amended plan (28 paths), and `reconcile-baseline.mjs --anchor --by pharn-dev-build` re-anchored the epoch at
  2316 paths. The spec hash is unchanged.
- **F2 (R2).** `pharn/floor/transcript-core.mjs` (NEW) holds the lookup, the walk and `sessionRequests()`, with the
  transcript-axis header. `render-cost-record.mjs` keeps only the `pharn-cost-record/1` block and imports the core.
  `render-cost-ledger.mjs` imports the core directly. No module re-exports these functions. The README's generated
  floor count moved 81 → 82 (`npm run docs:generate`).
- **F1 (R1).** `check-cost-ledger.mjs --verify-transcript` compares row by row through `checkRowsAgainstTranscript`:
  - the four classes that do not grow must match exactly;
  - on `output` and `output_thinking`, recorded above the transcript is RED;
  - recorded below the transcript is a WARN naming both causes;
  - `GROWING_CLASSES` is exported.

  The R1 probe from the review is now GREEN with the WARN. Rule 6 and the compatibility note in `cost-ledger.md` say
  the same.

- **F3.** R3 (the ledger header's settled YES and `/2`), R4 ("wherever a request's first line carries fewer output
  tokens than its largest"), R5 (the "never assembled" test), R6 (the CHANGELOG names the two pinned spellings), R7
  (`cost-ledger.md` is the one prose definition; `ship-record.md` and `/pharn-ship` cite it), R8 (the test name and
  the fixture header), R9 (section 7 of the measurement record: per-request equality of the fixed classes, 0 of
  46,073, and the corrected version sentence), R10 (below) and R11 (the latent-crash note in the PLAN and in the core
  header; a follow-up task).
- **R10, corrected here:** the first iteration added **10** tests to `render-cost-record.test.mjs`, not 11. That was
  16 new tests in all (10 + 4 + 2).
- **Tests after this iteration, measured (`node --test --test-reporter=tap`, per file).** The tests are counted after the move. They move with their module, so read the
  counts per file, never as an increment's delta:
  - `transcript-core.test.mjs`: 12 (NEW; the reader's tests plus R5);
  - `render-cost-record.test.mjs`: 38;
  - `render-cost-ledger.test.mjs`: 68, with the closure test moved out;
  - `check-cost-ledger.test.mjs`: 44.
- **Negative controls run by hand (L60).** Five mutants, each on a scratch copy of `pharn/floor`; each went red on
  the test it targets:
  - the pre-fix exact compare on output → the in-flight test, the first-line-ledger test and the above test;
  - "above allowed" → the above test;
  - "fixed classes bounded like output" → the fixed-class test;
  - a merged usage → the "never assembled" test;
  - a per-field maximum → the "never assembled" test.

  The first harness run parsed Node's default spec output as TAP and reported every mutant as missed. The direct run
  showed that was the harness's fault, and the re-run used `--test-reporter=tap`.

- **Floor (this iteration):** `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 36 capabilities checked in "."`, exit 0. Step 2b formatted the scope's 28 paths (3 reformatted, markdownlint 0 issues, eslint clean). `format:check`, `lint:md`, `lint`, `docs:check`, `check:badge`, `check:changelog`, `check:markers` and `check:contributing` all exit 0.

## Fix iteration 2 (after the second GATE 2, 2026-09-26)

The second review (`REVIEW.md`, iteration 2) reached GATE 2 with 0 floor-gate findings and 10 minor advisory ones.
The maintainer chose "Fix, then commit + PR". The fix covers S1 (the comment only), S2, S3, S4, S6, S7 and S10. The
decisions are in `PLAN.md`, "Fix iteration 2".

- **Before this build:** the scope was set from the amended plan: 29 paths, canon among them. Then
  `reconcile-baseline.mjs --anchor --by pharn-dev-build` re-anchored the epoch at 2319 paths. The spec hash is
  unchanged, and `check-plan-lessons.mjs` is GREEN.
- **K1 (S1):** the row compare's JSDoc now says any lower value passes, negatives included. No rule was added.
- **K2 (S2):** the above-RED test ranges over the exported `GROWING_CLASSES` and pins its two members.
- **K3 (S3):** the contract's compatibility note and the CHANGELOG now say the WARN counts every such value and names
  the first three. The CHANGELOG now says the third alternative was rejected by reasoning.
- **K4 (S4):** `check-cost-ledger.mjs` now quotes a `request_id` through `JSON.stringify` in every line that prints
  one:
  - the row compare's RED and WARN, new in this increment;
  - the duplicate-id RED and the outside-window RED, both older.

  Two new tests pin it. One uses the in-flight fixture with a newline-bearing id. The other uses a ledger whose
  duplicated, outside-window row carries one. The in-flight setup is now a shared helper, `inFlightLedger()`.

- **K5 (S6):** `cost-ledger.md`'s "one prose definition" sentence now says:
  - the contracts and commands cite the rule;
  - `CLAUDE.md`, the cost modules' headers and the CHANGELOG summarize it;
  - the paragraph governs where they differ.
- **K6 (S7):** the five stale pointers.
- **K7 (S10): the floor refused the first route, correctly.**
  - `protect-trusted-paths.cjs` denied the `Edit` to `.dev/memory-bank/lessons-learned.md` under the build scope
    (exit 2, "Re-scoping a build from a PLAN's `## Files` CANNOT authorize this write").
  - The plan had relied on the "standing division" paragraph in `/pharn-dev-memory-promote`, which predates the 3.1.1
    denylist.
  - No way past the guard was taken without asking.
  - The maintainer then chose, in a second form, the route 3.1.2's L10 repair took, a promote-origin scope:
    1. the setter, with `--from-frontmatter .claude/commands/pharn-dev-memory-promote.md` and
       `--target .dev/memory-bank/lessons-learned.md`;
    2. `--amend-scope` (amendment 1);
    3. the one-sentence `Edit`;
    4. the scope set again from the plan.

  Canon was then removed from the plan's `## Files`, since a build cannot write it.

- **K7 was then reverted for verify, and re-applied after it.** The first verify run of iteration 3 was RED on
  `reconcile`, on canon alone (`VERIFY.md`). The plan had listed canon when the epoch was anchored, so the opening
  snapshot claims the path, and the checker never consults the promote-origin amendment. The maintainer chose
  "Revert for verify, re-apply after":
  1. under a promote-origin scope, L63's sentence went back to the accepted text and the index was regenerated. Both
     files were then byte-equal to the anchor's recorded hashes;
  2. verify ran and returned `PASS`, with `reconcile` CLEAN;
  3. after verify, under a promote-origin scope recorded as amendment 3, the correction was re-applied with the
     `Edit` tool, and the index was regenerated. `docs:check` is GREEN.

  So the re-applied sentence lies outside the verified tree's reconcile, like 3.1.2's L10 repair.

- **The lessons index moved, against the plan.** `docs:check` went RED. The index renders each entry's token
  estimate, and the longer sentence moved L63's estimate (~983 → ~992) and the total (~46122 → ~46131). The fix:
  1. `docs/lessons-index.md` was declared in `## Files`;
  2. the scope was set again (29 paths) and recorded with `--amend-scope` (amendment 2);
  3. `npm run docs:generate` regenerated the index.

  `docs:check` is GREEN.

- **Tests after this iteration, measured per file (`node --test --test-reporter=tap`):**
  - `transcript-core.test.mjs`: 12;
  - `render-cost-record.test.mjs`: 38;
  - `render-cost-ledger.test.mjs`: 68;
  - `check-cost-ledger.test.mjs`: 46. That is 44 plus the two S4 tests; the S2 test replaced the output-only one.
- **Negative controls run by hand (L60).** Each ran on a scratch copy of `pharn/floor` outside the worktree, with its
  anchor asserted to occur exactly once. Each went red on the test it targets:
  - "above is RED" for `output` only (the review's A3) → the S2 test;
  - `GROWING_CLASSES` shrunk to `output` → the S2 test and the first-line-ledger test;
  - the raw id in the row compare → 5 tests, the S4 test among them;
  - the raw id in the duplicate-id RED → the new sink test;
  - the raw id in the outside-window RED → the new sink test.
- **Floor (this iteration):** `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 36 capabilities checked in "."`,
  exit 0.
  - Step 2b formatted the scope's 28 paths: 1 reformatted, markdownlint 0 issues, eslint clean.
  - The files touched after that pass were formatted and linted again.
  - Exit 0: `format:check`, `lint:md`, `lint`, `docs:check` (after the regeneration), `check:badge`,
    `check:changelog`, `check:markers` and `check:contributing`.
