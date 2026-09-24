# PLAN — pharn-test-red

- spec_content_hash: edc3d07df3ef76f983fe3763671eb66aa37c242f46f0e4c0fbca30ce091a5d2c
- applied_lessons: [L4, L6, L22, L29, L34, L35, L36, L41, L43, L45, L52, L55]
- increment: Make `/pharn-test` RUN the AC tests it wrote before the build and require each to fail for the right reason — decided by a new pure checker over item 01's per-test record and recorded by the lock script as a `red_run` section — plus a closed stop when a level has no runner, and a `spec_kind: test-infra` bootstrap mode for the increment that sets the runner up.
- layer(s): the product floor (`gate-run-core.mjs`, `run-gates.mjs`, new `check-red-run.mjs`, `ac-tests-lock.mjs`, `check-ac-tests.mjs`, `spec-template-core.mjs`), pharn-contracts (`ac-tests.md`, `spec-template.md`, `gate-run-record.md`), the product `.claude/` surface (`pharn-test.md`, `pharn-plan.md`, `pharn-spec.md`), repo meta.
- constitution_refs: [P0, P1, P2, P3, P5, P6, P7]

## Correcting the record: the brief against the live repo (P6)

Measured on branch `pharn-test-red` off `main` = `8ba9308` (`SKILLS_VERSION` 6.17.0; items 01–03 merged as PRs 256,
257 and 258).

1. **The `test` gate's file append is not reached through `--scope-json` for a non-regress stage.** `run-gates.mjs`
   fills a `test` entry's `files` from `--scope-json`'s `outside_tests` only under `--stage regress --side head`
   (`runInit`), and `spawnGate` appends them for id `test` whatever the stage. So the red run needs its own way to
   hand the runner the AC test files. It gets one deterministic source: the mapping itself (decision b).
2. **Item 03's lock pins `red_run: null` under `ac-tests-lock/1`** (its `lockShapeError` says the stage that fills a
   reserved section bumps the schema). So this increment introduces `ac-tests-lock/2` (adds `mode`), keeps reading
   `/1`, and fills `red_run` only under `/2`.
3. **`command-hygiene.test.mjs` closes the set of run-gates callers** (`GATE_RUN_WIRING` plus a ✧ closure test), so
   `pharn-test.md` joins that set and the count moves from 2 to 3.

## Measured this run (the evidence the checker's model rests on)

A real vitest 5.0.1 run (from `../pharn-starter/node_modules`, nothing downloaded), captured as a fixture:

- a test that `await import()`s its missing target **inside the test body** is reported **collected and `failed`**;
- a test FILE with a **top-level** import of the missing target is a file-level `failed` with **no assertion
  results** (a suite error) — its `AC-<n>:` test is **not collected**;
- a passing and a skipped `AC-<n>:` test report `passed` / `skipped`;
- another feature's file holding its own `AC-1:` test is reported beside ours — the per-AC match must be by the
  AC's MAPPED FILE and leaf title, never a suite-wide title.

## Decisions for the options halt (approved under the overnight delegation — see SHIP.md)

a. **No escape hatch for a legitimate pre-build pass** (P7). An AC of a NEW feature that already passes proves
nothing yet: either the test is vacuous or the behaviour exists and the AC restates it. `ac-test-passes-before-build`
is a RED with no override.

b. **Gate and file selection by ID, from the mapping, in the runner** — `run-gates.mjs init --stage ac-test --feature
<n> --out .pharn/pharn-test/gates --discover package.json --ac-tests pharn/features/<n>/AC-TESTS.md`. The runner reads
the mapping's rows and keeps the DISCOVERED ids the levels need, through one table, `LEVEL_GATES` in
`gate-run-core.mjs` (`unit`/`integration` → `test`; `e2e` → `E2E_SET`): a membership filter over discovered ids
(P5). The `test` gate is handed exactly the unit/integration mapped files, through the existing file-append path; the
e2e gates run whole (item 02's decision). `--gates` tokens were rejected: they are COMMANDS, so the model would be
composing the gate set again — the thing item 01's runner exists to remove.

c. **The unattended flag is `--unattended`** (the `/pharn-spec --model-approve` pattern: an orchestrator passes it;
nothing stops a user). A level with no discovered gate, or a gate with no per-test results configured, is
`ac-level-unavailable: AC-<n> (<level>)`. Interactive → ASK the brief's question and stop this feature's run either
way. Under `--unattended` → print the closed line `BLOCKED — no-test-runner: <the unavailable ACs>; suggested:
<a /pharn-ship command that specs a spec_kind: test-infra increment>` and stop. Never a nested run.

d. **The red-run verdict is a NEW pure checker, `check-red-run.mjs`** (P3: it changes when "red for the right reason"
changes; the lock script only records). Per AC, over `testRecord` for every gate its level maps to, considering only
entries whose `file` is the AC's mapped file (compared as item 03's `scopeKey`) and whose LEAF title starts
`AC-<n>:`: ≥1 entry (else `ac-test-not-collected`), none `passed` (`ac-test-passes-before-build`), none `skipped`
(`ac-test-skipped`), every gate's record available (item 01's refusals — `not-configured`, `results-unavailable`, … —
are REDs here, by their own names). The gate's exit is expected non-zero and is NOT the verdict.

e. **The lock records the evidence, not `.pharn/`.** `ac-tests-lock.mjs --record-red-run <name> --out <dir>`
re-derives the verdict itself (never trusts a model's report), requires the lock's `--check` GREEN, and writes
`red_run` = `{ stamp_sha256, files_sha256, gates: [{gate, results_sha256}], acs: [{id, tests: [...]}] }`, where
`files_sha256` binds the evidence to the lock's `files` section. `--check` verifies that binding.

f. **Bootstrap mode.** An optional SPEC frontmatter key `spec_kind` ∈ {`feature` (absent), `test-infra`}, validated
for templated SPECs by `spec-template-core.mjs` (an unknown value is a RED); legacy SPECs are untouched and a template
with or without the key still validates. `check-ac-tests.mjs --spec` gains exit **4** = bootstrap. For it,
`/pharn-plan` writes no mapping and `/pharn-test` writes `ac-tests-lock.mjs --write-bootstrap <name>` (`mode:
bootstrap`, no files, no run). What item 06 will require instead is recorded in the contract as WEAKER than
test-first.

## Files

- `pharn/floor/gate-run-core.mjs` — `STAGES` + `ac-test`; `LEVEL_GATES`; `resolveSet` for `ac-test` (selection by id,
  no `reconcile`, no side) — product floor
- `pharn/floor/gate-run-core.test.mjs` — the ac-test resolution cases — floor test (apparatus)
- `pharn/floor/run-gates.mjs` — `init --ac-tests <AC-TESTS.md>` for `--stage ac-test` — product floor
- `pharn/floor/run-gates.test.mjs` — ac-test init + drain end to end — floor test (apparatus)
- `pharn/floor/ac-tests-core.mjs` — NEW (amended after grill, G7). The mapping grammar moved out of
  `check-ac-tests.mjs` (`LEVELS`, `MAPPING_RE`, `mappingOf`, `badPath`, `scopeKey`), re-exported there — product floor
- `pharn/floor/red-run-core.mjs` — NEW (amended after grill, G7). Preflight + the per-AC verdict + the evidence
  binding, imported by `check-red-run.mjs` and `ac-tests-lock.mjs` — product floor
- `pharn/floor/check-spec.mjs` — (amended after grill, G2) the pin covers a `spec_kind:` line; rule 8 gets the raw
  frontmatter — product floor
- `pharn/floor/test-results-core.mjs` — (amended after grill, G12) header only: a stage now reads the record — product
  floor
- `pharn/pharn-contracts/test-results-record.md` — (amended after grill, G12) the first reader — pharn-contracts
- `pharn/features/README.md` — (amended after grill, G12) the red run and the lock's `/2` — product doc
- `pharn/floor/check-red-run.mjs` — NEW. `--preflight` and the per-AC verdict — product floor
- `pharn/floor/check-red-run.test.mjs` — NEW — floor test (apparatus)
- `pharn/floor/test-fixtures/test-results/vitest-red.json` — NEW. The captured red-run report — floor test fixture
  (apparatus)
- `pharn/floor/ac-tests-lock.mjs` — schema `/2` (`mode`), `--record-red-run`, `--write-bootstrap`; `/1` still read —
  product floor
- `pharn/floor/ac-tests-lock.test.mjs` — the red-run and bootstrap cases — floor test (apparatus)
- `pharn/floor/check-ac-tests.mjs` — `--spec` exit 4 (bootstrap) — product floor
- `pharn/floor/check-ac-tests.test.mjs` — the exit-4 case — floor test (apparatus)
- `pharn/floor/spec-template-core.mjs` — `SPEC_KINDS`, rule `spec-kind`, `specKindOf()` — product floor
- `pharn/floor/check-spec.test.mjs` — the `spec_kind` cases (absent, each member, unknown, legacy, templates) — floor
  test (apparatus)
- `pharn/pharn-contracts/ac-tests.md` — the red run, `/2`, bootstrap — pharn-contracts
- `pharn/pharn-contracts/spec-template.md` — `spec_kind` — pharn-contracts
- `pharn/pharn-contracts/gate-run-record.md` — the `ac-test` stage — pharn-contracts
- `.claude/commands/pharn-test.md` — preflight, `--unattended`, the red run, the verdict, `--record-red-run`, the
  dynamic-import convention, bootstrap — product command
- `.claude/commands/pharn-plan.md` — `--spec` exit 4 — product command
- `.claude/commands/pharn-spec.md` — offer a `spec_kind: test-infra` setup increment; write the key when chosen —
  product command
- `.dev/floor/command-hygiene.test.mjs` — `pharn-test.md` joins `GATE_RUN_WIRING` — floor test (apparatus)
- `README.md` — badge; the AC tests section (red run, runner and per-test results required, the dynamic-import
  convention and the type-checking-runner bound, bootstrap); `CURRENT-STATE` bytes from `npm run docs:generate` (a
  Bash write, declared — L19) — repo meta
- `docs/capabilities/README.md` — only if `docs:generate` rewrites it — generated
- `CLAUDE.md` — the AC-tests paragraph — repo meta
- `.dev/features/pharn-test-red/PROTECTED-FOLLOWUPS.md` — (amended after review) the one refinement to item 03's pending
  `ARCHITECTURE.md` §6 row — dev artifact
- `SKILLS_VERSION` — 6.17.0 → 6.18.0 (MINOR) — repo meta
- `CHANGELOG.md` — `## [6.18.0] - <date>` — repo meta

### Not written by the build

- No protected path needs an edit beyond item 03's pending follow-ups; `pharn/ARCHITECTURE.md` does not name the lock's
  sections or the stage list of the runner.
- `/pharn-ship`, `/pharn-loop` wiring — item 05. The verify AC gate and the bootstrap evidence check — item 06.

## Amended after grill (2026-09-24)

The inline grill (GRILL.md, 4 concerns) and an independent read-only agent (13 findings, 2 blocking) both ran. Every
finding is adopted; the decisions a–f above stand, as amended here.

- **G1 (blocking) — the evidence was bound to the current files, not to the run.** `--record-red-run` now requires,
  before it records anything: the stamp validates as `validateStamp(…, {stage: "ac-test", feature})`; each run's
  `files` equal the mapped files for that gate (the unit/integration files for `test`, the e2e files for each e2e
  gate); and the LIVE `fingerprint(root, {feature})` equals `stamp.fingerprint.final`. The lock is in the
  fingerprint (`worktree-fingerprint.mjs` `INCLUDED`), so a test edit or a `--write` after the run breaks the match.
- **G2 (blocking) — `spec_kind` sat outside the approval pin.** The pin now covers it: when the frontmatter carries a
  line starting `spec_kind:`, `check-spec.mjs` hashes that raw line (CR-folded) followed by the body; a SPEC without
  one hashes exactly as before, so no existing pin moves. Flipping an Approved feature SPEC to `test-infra` (or back)
  is drift, RED at every stage that checks the chain. `check-ac-tests.mjs` full mode also REDs a mapping for a
  test-infra SPEC (new kind `spec-kind`), and `/pharn-spec --model-approve` never writes `test-infra`: it stops.
  Bounded, and stated: a self-consistent rewrite of the SPEC and its pin passes, as it always has.
- **G3 — the bootstrap lock's shape.** `/2` has one closed key set: `schema, feature, mode, spec, mapping, files,
bootstrap, red_run, test_infra`. `test-first`: `mapping` object, `files` non-empty, `bootstrap: null`.
  `bootstrap`: `mapping: null`, `files: []`, `bootstrap: {spec_kind: "test-infra", levels: [...]}` (the SPEC's AC
  levels, sorted, for item 06), `red_run: null`, the `spec` pin read from SPEC.md. `--check` of a bootstrap lock
  re-reads SPEC.md and REDs a changed pin, kind or level set, and an AC-TESTS.md that exists. `test_infra` stays
  `null` under `/2` (item 06 fills it). `/pharn-test` runs `--spec` BEFORE its scope step and scopes a bootstrap run
  to the lock alone.
- **G4 — flag-shaped file names.** `badPath` refuses a leading `-`; the runner re-checks every mapped file with it.
- **G5 — runner gaps.** `--stage ac-test` refuses `--gates`, `--extra`, `--skip-style`, `--scope-json`,
  `--spec-from` and `--side`; a level with no discovered gate refuses `init` (`coverage-violation`); an ac-test entry
  with no files refuses to run.
- **G6 — e2e run whole.** The e2e gates get the mapped e2e files too: an argv gate carrying files appends them after
  `--` (only `test` ever carried files before, so no other stage changes). Every discovered gate of a level must have
  results configured (preflight), because the verdict needs every gate's record. `build` is not run: an e2e runner
  that needs a built app builds or serves it itself (Playwright's `webServer`), stated as a bound.
- **G7 — P3.** No floor module imports a `check-*.mjs` CLI. The mapping grammar moves to `ac-tests-core.mjs`; the
  verdict lives in `red-run-core.mjs`; both CLIs import them.
- **G8 — `--check` GREEN is not "the red run happened".** `--check --require-red-run` REDs a test-first lock with
  `red_run: null` (and any `/1` lock); a bootstrap lock passes it. `/pharn-test`'s last step runs it. The digests
  `stamp_sha256` / `results_sha256` are RECORDED, not re-checkable once the next `init` wipes `<out>`; only
  `files_sha256` is re-checked. The eval says "a `red_run` whose `files_sha256` no longer matches", not "forged".
- **G9 — two readings of `spec_kind`.** `specKindOf` reads the RAW frontmatter lines, as `isTemplated` does.
- **G10 — `--spec` exit precedence:** unreadable 2 → legacy 3 → an invalid `spec_kind` 2 → an absent / duplicated /
  empty Acceptance Criteria section 2 → `test-infra` 4 → templated 0.
- **G11 — the unattended line** is the brief's: `blocked: no-test-runner — <AC-n (level), …>; suggested: <command>`,
  printed by `check-red-run.mjs --preflight` itself (so it is pinned by a test), and echoed verbatim by the command.
- **G12 — stale docs** added to Files: `CLAUDE.md` (`--stage`, `/1`), `test-results-record.md` and
  `test-results-core.mjs` ("no stage reads the record"), `pharn/features/README.md`.
- **G13 — file matching.** An entry matches an AC when its `file` EQUALS the mapped path exactly (no case-folding:
  fail-closed on a case-sensitive volume) and the mapping has no malformed line.
- **Grill concern 4 (inline) — both e2e gates.** The verdict unions the matches across every gate of the level and
  needs every gate's record; covered by G6.

## Evals to write (P1)

No Capability. The suites are the specification, each refusal one mutation of a GREEN world (L34/L52): the checker
over the captured report — GREEN (AC mapped to the dynamic-import test), `ac-test-not-collected` (the static-import
file), `ac-test-passes-before-build`, `ac-test-skipped`, `not-configured`, `results-unavailable`, and another
feature's `AC-1:` in the suite IGNORED; `--preflight` — `ac-level-unavailable` for a missing script and for a
missing format, GREEN when both exist; runner — `init --stage ac-test --ac-tests` selects exactly the needed ids and
hands the `test` gate exactly the mapped files; lock — `--record-red-run` writes `red_run` bound to the files and
`--check` stays GREEN, a forged `red_run` or a files change after it REDs, `/1` locks still check, bootstrap locks
check; `spec_kind` — absent → feature, each member, unknown → RED, legacy untouched, both templates validate.

## Guarantee audit (P0)

- "each AC test failed before the build" → floor: enum membership over item 01's record (a content-hash-bound
  results file), per AC by mapped file and leaf title. NOT "for the right reason" in any sense the record cannot
  show: a test that fails on a typo in its own body is `failed` too. The collected/not-collected split is the one
  reason the record CAN distinguish.
- "the evidence is the script's" → floor: `--record-red-run` re-derives the verdict and computes every digest (L22).
  NOT provenance: a forged results file and a consistent stamp pass (L43).
- "a level with no runner stops the run" → floor: membership (discovered ids, configured formats); the stop itself
  and the question are command discipline (advisory).
- "bootstrap is weaker than test-first" → stated, in the contract and the lock's `mode`.

## Trust audit (P2)

The results files are untrusted project output, handled by item 01's core unchanged. Test ids and titles are
untrusted data: the lock copies matched ids into `red_run.acs[].tests` and the contract marks them untrusted.

## Determinism audit (P5)

Level → gate is one table; selection is a membership filter; each verdict is a closed reason; the command branches on
exit codes. The only human branch is the interactive ask, whose answer never continues to build.

## Applied lessons

- L4 / L55 — the checker's model of "not collected" was measured on a real vitest run (the capture), not authored.
- L6 — levels, files and titles are read from the structured mapping and record, never grepped.
- L22 — every digest in `red_run` is computed by the lock script.
- L29 / L36 — `LEVEL_GATES`, the red-run reasons and `SPEC_KINDS` are closed sets, each tested both ways.
- L34 — an AC with zero matching entries is `ac-test-not-collected`, never a vacuous pass.
- L35 — the evidence goes in the one lock per feature, in its reserved section.
- L41 — no new default; `--ac-tests` is required for `--stage ac-test`.
- L43 — the lock certifies that the evidence matches the recorded files and results, never that it is true.
- L45 — the new pinned command lines are executed by the hygiene suite (item 03's executed-setter test, plus the
  run-gates wiring set).
- L52 — each reason and each `spec_kind` member has its own fixture.

## Open questions (HALT)

None. Decisions a–f are the options halt, approved under the overnight delegation (recorded in SHIP.md).
