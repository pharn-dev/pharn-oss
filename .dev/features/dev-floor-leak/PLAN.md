# PLAN — dev-floor-leak

- spec_content_hash: 2c84959cbca0b2dc51aaad90f90d40e574732c9c5c83c0bda7e1481ecb0db12e
- applied_lessons: [L43, L50, L75]
- increment: Move dev-only code and fixtures out of the product floor (audit 2026-10-12 ARCH-5, the part #359 did not
  fix; batch 2026-10-19 group L, LIGHT mode): `pharn/floor/check-ship.mjs` and its test move to `.dev/floor/`, and
  `pharn/floor/fixtures/cost-ledger/` moves to `pharn/floor/test-fixtures/cost-ledger/`. Every cite is updated.
- layer(s): product floor (`pharn/floor/` modules and tests), dev floor, product contracts, a dev command, repo meta
- constitution_refs: [P0, P3, P4, P6, P7]

## Trigger (P7)

Audit 2026-10-12 ARCH-5, re-read live at `6b49cafd` (SKILLS_VERSION 6.65.2). `pharn/floor/check-ship.mjs` is the
`/pharn-dev-ship --loop` stop core: its only runtime consumer is `.claude/commands/pharn-dev-ship.md`, which no install
receives, yet the CLI copies every non-test `pharn/floor/*.mjs` into every install. `pharn/floor/fixtures/` (13 files,
64 KB) is read only by tests. #359 fixed the header cites only and did not move anything.

## Discovery

- **pharn-cli** (`~/Projects/pharn-cli/src/lib/constants.ts`, `FLOOR_TEST_FIXTURES_DIRS = ['test-fixtures',
'fixtures']`): the installer already excludes BOTH fixture dirs and every `*.test.mjs`, so the fixtures never reached
  an install. Their move is consolidation (one fixtures dir, matching the tests that model the product floor with
  `!src.includes("test-fixtures")`), not a change to installed bytes. `check-ship.mjs` does ship today; after the move
  an existing install keeps its copy until `pharn update`, which lists files upstream no longer ships as orphans
  (`lib/orphans.ts`). No installed command, hook or checker reads `check-ship.mjs`, so nothing in an install breaks.
- **MIN_CLI** (`.dev/guides/versioning.md`): bumped only when an older CLI would install a BROKEN tree. An older CLI
  installs this tree without `check-ship.mjs`, which nothing installed reads, and with no fixtures (both dir names are
  excluded, and a CLI that predates the `fixtures` exclusion copies nothing from the new location either, since
  `test-fixtures` was excluded first). MIN_CLI does not move.
- **Trusted docs**: none of the four names `check-ship` or `floor/fixtures` (grep). No HUMAN-PATCH.md.
- `package.json` `test` globs include `.dev/**/*.test.mjs`. `check-ship.mjs` imports only `node:fs`; its test resolves
  the checker by `join(here, "check-ship.mjs")` and finds `verify-report.md` by walking up, matching the row by
  basename — the #361 binding survives the move as written.
- `pharn/floor/validate.mjs` CHECK 8 REDs a canon cite of `.dev/floor/<B>` only when `pharn/floor/<B>` exists, so the
  updated contract cites are GREEN. Product contracts already cite `.dev/floor/` files (`check-contributing-gates.mjs`
  in `verify-report.md`).

## Applied lessons

- L50 — the sweep is by REFERENT: every cite of `check-ship.mjs` / `check-ship.test.mjs` (the regex
  `check-ship([^-]|$)`, so `check-ship-briefing` is excluded deliberately) and of `fixtures/cost-ledger` /
  `"fixtures"`, on every surface, not only the sites the audit listed. Each cite I re-author names the new path.
- L75 — each hit gets a disposition in `## Sweep` below (edited, or left with a reason).
- L43 — the ARCH-9 binding test moves with its checker and still compares the contract row with the live set; it
  certifies their agreement, never that either is right, and the row is updated, not dropped.

## Changes

1. `git mv pharn/floor/check-ship.mjs .dev/floor/check-ship.mjs` and the same for `check-ship.test.mjs` (a rename
   through Bash; every path is declared below). Header: path line, why it now lives in `.dev/floor/`, usage line. The
   test's header path, and its ARCH-9 comment now records the move as done.
2. `.claude/commands/pharn-dev-ship.md`: `pharn/floor/check-ship.mjs` → `.dev/floor/check-ship.mjs` (description,
   `reads:`, the Step-run line, the floor-reduction paragraph, the test cite, the Net line). Shorter by one byte each.
3. Contracts: `verify-report.md` (the consumer-table row, which stays and keeps its basename `check-ship.mjs`, plus the
   two consumer lists) and `regression-report.md` (its consumer-table row) name `.dev/floor/check-ship.mjs`, and say
   it is the dev loop's checker, not in an install.
4. Comment cites in the product floor name `.dev/floor/check-ship.mjs`: `check-loop.mjs`, `check-loop.test.mjs`,
   `check-verify.mjs`, `check-verify.test.mjs`, `gate-run-core.mjs`, `merge-findings.test.mjs`,
   `render-cost-record.mjs`, `render-run-report.mjs`. `check-loop.mjs`'s "lives in this floor-ignored dir, exactly like
   check-ship.mjs" drops check-ship (no longer true).
5. `git mv pharn/floor/fixtures/cost-ledger pharn/floor/test-fixtures/cost-ledger`; the four readers
   (`check-cost-ledger.test.mjs`, `render-cost-ledger.test.mjs`, `render-cost-record.test.mjs`,
   `transcript-core.test.mjs`) join `"test-fixtures"`, and comment cites in those tests and
   `render-cost-ledger.mjs:122` say `test-fixtures/cost-ledger/`. `.prettierignore`'s explicit JSONL entry follows the
   move (`pharn/floor/test-fixtures` is also ignored wholesale by prettier, eslint and markdownlint; the explicit
   entry keeps its stated reason).
6. `npm run docs:generate` (the floor checker count in README's generated inventory drops by one). Version: product
   bytes change, so SKILLS_VERSION 6.65.2 → 6.65.3 (patch: a file stops shipping, no shape change), README badge,
   CHANGELOG section. Renumbered 6.66.1 after merging `origin/main` at 6.66.0 (#364).

## Sweep (L75)

Regex `check-ship([^-]|$)` and `fixtures/cost-ledger|"fixtures"`, `git grep` over the tree, at `6b49cafd`:

- `.claude/commands/pharn-dev-ship.md:2,11,237,395,420,426,428,433,436,444,459,493` — edited where a path is named
  (2, 11, 395, 426, 428, 493); basename-only mentions (237, 420, 433, 436, 444, 459) still true, left.
- `pharn/floor/check-ship.mjs:2,46`, `check-ship.test.mjs:1,24,183-249` — moved; path lines edited, `:24` is a sibling
  join (still true), the ARCH-9 block's basename matching is still true and its move note is edited.
- `pharn/floor/check-loop.mjs:5,36,37,42,143` — `:5` edited (no longer the same dir); `:36` first mention qualified;
  the rest still true.
- `pharn/floor/check-loop.test.mjs:5,118` — `:5` edited (path), `:118` still true, left.
- `pharn/floor/check-verify.mjs:36,53,54` — `:53` qualified; the rest still true.
- `pharn/floor/check-verify.test.mjs:147,522` — `:522` qualified; `:147` still true.
- `pharn/floor/gate-run-core.mjs:1183`, `render-run-report.mjs:932`, `render-cost-record.mjs:25`,
  `merge-findings.test.mjs:5` — qualified with `.dev/floor/`.
- `pharn/floor/render-ship-briefing.test.mjs:335` — a historical PLAN heading used as data; left.
- `pharn/pharn-contracts/verify-report.md:107,113,162,282` and `regression-report.md:111` — `:107`, `:162`, `:282`,
  regression `:111` edited; `:113` still true.
- `fixtures/cost-ledger` — every hit in `pharn/floor/*` edited (listed in Changes 5); `.prettierignore:87` edited.
- `.dev/features/**` (audit trails, regression-report.json file lists), `.dev/memory-bank/**` and CHANGELOG released
  sections — historical records, left (nothing merged is edited).

## Bounds

- The move stops `check-ship.mjs` reaching NEW installs; an existing install keeps its copy until `pharn update`
  (reported there as an orphan). Nothing reads it there.
- "No installed file reads `check-ship.mjs`" is a grep over this tree's product surface at this commit, not a floor
  check; a future product command that cites it would ENOENT in an install and nothing here would catch that.

## Files

- `.dev/features/dev-floor-leak/PLAN.md` — this plan. — layer: dev trail
- `.dev/floor/check-ship.mjs` — moved here (git mv) + header. — layer: dev floor
- `.dev/floor/check-ship.test.mjs` — moved here (git mv) + header. — layer: dev floor tests
- `pharn/floor/check-ship.mjs` — removed by the move. — layer: product floor
- `pharn/floor/check-ship.test.mjs` — removed by the move. — layer: product floor tests
- `.claude/commands/pharn-dev-ship.md` — cites. — layer: dev command
- `pharn/pharn-contracts/verify-report.md` — consumer row + lists. — layer: product contract
- `pharn/pharn-contracts/regression-report.md` — consumer row. — layer: product contract
- `pharn/floor/check-loop.mjs` — comment cites. — layer: product floor
- `pharn/floor/check-loop.test.mjs` — comment cite. — layer: product floor tests
- `pharn/floor/check-verify.mjs` — comment cite. — layer: product floor
- `pharn/floor/check-verify.test.mjs` — comment cite. — layer: product floor tests
- `pharn/floor/gate-run-core.mjs` — comment cite. — layer: product floor
- `pharn/floor/merge-findings.test.mjs` — comment cite. — layer: product floor tests
- `pharn/floor/render-cost-record.mjs` — comment cite. — layer: product floor
- `pharn/floor/render-run-report.mjs` — comment cite. — layer: product floor
- `pharn/floor/render-cost-ledger.mjs` — fixture comment cite. — layer: product floor
- `pharn/floor/check-cost-ledger.test.mjs` — fixture reader + cite. — layer: product floor tests
- `pharn/floor/render-cost-ledger.test.mjs` — fixture reader + cites. — layer: product floor tests
- `pharn/floor/render-cost-record.test.mjs` — fixture reader + cite. — layer: product floor tests
- `pharn/floor/transcript-core.test.mjs` — fixture reader + cites. — layer: product floor tests
- `pharn/floor/fixtures/cost-ledger/session-continued.jsonl` — moved away (git mv). — layer: test fixture
- `pharn/floor/fixtures/cost-ledger/single-session.jsonl` — moved away. — layer: test fixture
- `pharn/floor/fixtures/cost-ledger/usage-snapshots/00000000-0000-4000-8000-00000000beef.jsonl` — moved away. — layer: test fixture
- `pharn/floor/fixtures/cost-ledger/usage-snapshots/00000000-0000-4000-8000-00000000beef/subagents/agent-fff3333333333333.jsonl` — moved away. — layer: test fixture
- `pharn/floor/fixtures/cost-ledger/usage-snapshots/00000000-0000-4000-8000-00000000beef/subagents/agent-fff3333333333333.meta.json` — moved away. — layer: test fixture
- `pharn/floor/fixtures/cost-ledger/with-routed-stage/00000000-0000-4000-8000-0000000c0de5.jsonl` — moved away. — layer: test fixture
- `pharn/floor/fixtures/cost-ledger/with-routed-stage/00000000-0000-4000-8000-0000000c0de5/subagents/agent-a0f1e2d3c4b5a6978.jsonl` — moved away. — layer: test fixture
- `pharn/floor/fixtures/cost-ledger/with-routed-stage/00000000-0000-4000-8000-0000000c0de5/subagents/agent-a0f1e2d3c4b5a6978.meta.json` — moved away. — layer: test fixture
- `pharn/floor/fixtures/cost-ledger/with-subagents/00000000-0000-4000-8000-00000000cafe.jsonl` — moved away. — layer: test fixture
- `pharn/floor/fixtures/cost-ledger/with-subagents/00000000-0000-4000-8000-00000000cafe/subagents/agent-aaa1111111111111.jsonl` — moved away. — layer: test fixture
- `pharn/floor/fixtures/cost-ledger/with-subagents/00000000-0000-4000-8000-00000000cafe/subagents/agent-aaa1111111111111.meta.json` — moved away. — layer: test fixture
- `pharn/floor/fixtures/cost-ledger/with-subagents/00000000-0000-4000-8000-00000000cafe/subagents/agent-bbb2222222222222.jsonl` — moved away. — layer: test fixture
- `pharn/floor/fixtures/cost-ledger/with-subagents/00000000-0000-4000-8000-00000000cafe/subagents/agent-bbb2222222222222.meta.json` — moved away. — layer: test fixture
- `pharn/floor/test-fixtures/cost-ledger/session-continued.jsonl` — moved here (git mv). — layer: test fixture
- `pharn/floor/test-fixtures/cost-ledger/single-session.jsonl` — moved here. — layer: test fixture
- `pharn/floor/test-fixtures/cost-ledger/usage-snapshots/00000000-0000-4000-8000-00000000beef.jsonl` — moved here. — layer: test fixture
- `pharn/floor/test-fixtures/cost-ledger/usage-snapshots/00000000-0000-4000-8000-00000000beef/subagents/agent-fff3333333333333.jsonl` — moved here. — layer: test fixture
- `pharn/floor/test-fixtures/cost-ledger/usage-snapshots/00000000-0000-4000-8000-00000000beef/subagents/agent-fff3333333333333.meta.json` — moved here. — layer: test fixture
- `pharn/floor/test-fixtures/cost-ledger/with-routed-stage/00000000-0000-4000-8000-0000000c0de5.jsonl` — moved here. — layer: test fixture
- `pharn/floor/test-fixtures/cost-ledger/with-routed-stage/00000000-0000-4000-8000-0000000c0de5/subagents/agent-a0f1e2d3c4b5a6978.jsonl` — moved here. — layer: test fixture
- `pharn/floor/test-fixtures/cost-ledger/with-routed-stage/00000000-0000-4000-8000-0000000c0de5/subagents/agent-a0f1e2d3c4b5a6978.meta.json` — moved here. — layer: test fixture
- `pharn/floor/test-fixtures/cost-ledger/with-subagents/00000000-0000-4000-8000-00000000cafe.jsonl` — moved here. — layer: test fixture
- `pharn/floor/test-fixtures/cost-ledger/with-subagents/00000000-0000-4000-8000-00000000cafe/subagents/agent-aaa1111111111111.jsonl` — moved here. — layer: test fixture
- `pharn/floor/test-fixtures/cost-ledger/with-subagents/00000000-0000-4000-8000-00000000cafe/subagents/agent-aaa1111111111111.meta.json` — moved here. — layer: test fixture
- `pharn/floor/test-fixtures/cost-ledger/with-subagents/00000000-0000-4000-8000-00000000cafe/subagents/agent-bbb2222222222222.jsonl` — moved here. — layer: test fixture
- `pharn/floor/test-fixtures/cost-ledger/with-subagents/00000000-0000-4000-8000-00000000cafe/subagents/agent-bbb2222222222222.meta.json` — moved here. — layer: test fixture
- `.prettierignore` — the JSONL fixtures entry follows the move. — layer: repo meta
- `README.md` — version badge + regenerated inventory (docs:generate). — layer: repo meta (generated region)
- `SKILLS_VERSION` — 6.66.1 (planned 6.65.3; renumbered after the merge). — layer: repo meta
- `CHANGELOG.md` — the 6.66.1 section. — layer: repo meta
