# PLAN — test-results

- spec_content_hash: edc3d07df3ef76f983fe3763671eb66aa37c242f46f0e4c0fbca30ce091a5d2c
- applied_lessons: [L1, L4, L15, L29, L34, L35, L36, L41, L43, L52, L55, L58]
- increment: For the `test` gate, derive a deterministic per-test record `{test-id → passed | failed | skipped}` with tested code from a machine-readable results file the project's own test run writes into the runner's `<out>` (one file per gate, path handed over in ONE env var), stored once as the raw file plus a `results_sha256` in the gate's `runs[]` entry, and exported as a pure core later items call. Additive only: no verify/regress verdict changes.
- layer(s): the product floor (`pharn/floor/test-results-core.mjs` new, `run-gates.mjs`, `gate-run-core.mjs`), pharn-contracts (`gate-run-record.md`, new `test-results-record.md`), repo meta (README, CLAUDE.md, CHANGELOG, SKILLS_VERSION).
- constitution_refs: [P0, P2, P3, P4, P5, P6, P7]

## Correcting the record: the brief against the live repo (P6)

Measured this run on branch `test-results` off `main` = `6ee6fc8` (`SKILLS_VERSION` 6.14.1; the brief was
written at `4949d40` / 6.14.0, so the MINOR bump is 6.14.1 → **6.15.0**).

1. **"Every run-gates caller: … /pharn-dev-\* twins" — the dev twins are not run-gates callers.**
   `grep -n run-gates .claude/commands/pharn-dev-*.md` returns nothing. `/pharn-dev-verify` still assembles
   `.pharn/pharn-dev-verify/results.json` by hand (`pharn-dev-verify.md:95-98`) and `/pharn-dev-regress` its
   base/head maps (`pharn-dev-regress.md:149-151`). The live callers are `/pharn-verify` (`pharn-verify.md:236`,
   `:248`), `/pharn-regress` head and base (`pharn-regress.md:259`, `:263`, `:273`, `:277`), and `/pharn-loop`
   through those two (`pharn-loop.md:317`). Nothing here changes a dev twin.
2. **The stamp drops `cwd` at finalize** (`run-gates.mjs` `runNext`: `delete stamp.cwd`). So a pure core
   "given a stamp + `<out>` + a gate id" cannot know which directory the reporter's absolute test-file paths
   are relative to. The exported function therefore takes a fourth input, `root` (required, no default — L41),
   which is also where it reads `pharn.config.json`.
3. **Playwright's `spec.file` is relative to `config.rootDir` (the `testDir`), not the project root**, and a
   multi-project config emits one spec per project with the SAME title (measured, Playwright 1.63.0, below). So
   `<file>::<full title>` over the raw fields would give every multi-project test a duplicate id. Resolved in
   decision d, not left to a later item.
4. **CTRF is still pre-1.0.** `ctrf-io/ctrf`'s README, read this run: "We are maintaining a pre-1.0 version to
   allow for community-driven refinements before locking the v1.0.0 standard." npm this run: `ctrf` 0.3.0
   (2026-08-15), `jest-ctrf-json-reporter` 0.0.11, `playwright-ctrf-json-reporter` 0.0.29,
   `vitest-ctrf-json-reporter` 0.0.3 (last modified 2025-09-15). There is no `ctrf-json-reporter` or
   `@ctrf-io/*-ctrf-json-reporter` package.
5. **The brief's "`results.json`" is a name the runner's own suite forbids** (`run-gates.test.mjs:631`,
   "finalize NEVER writes a results.json — the stamp is the only store of the map (L35)"). The per-gate file
   is named `<seq>-<id>.test-results.json`, so it cannot be confused with a second store of the gate map.

## Measured this run (the evidence the decisions rest on)

Captured with the locally installed `vitest` 5.0.1 and `@playwright/test` 1.63.0 (in `../pharn-starter/node_modules`,
symlinked into a scratch project; nothing downloaded). One fixture file with a top-level test, a test nested two
`describe`s deep, a failing test, a skip and a todo:

- **vitest `json` reporter**: `testResults[].name` is the ABSOLUTE file path; `assertionResults[]` carries
  `ancestorTitles[]`, `title`, `fullName` (space-joined, so ambiguous) and `status` ∈ vitest's declared
  `"passed" | "failed" | "skipped" | "pending" | "todo" | "disabled"` (`vitest/dist/chunks/plugin.d.*.d.ts:2969`).
  `it.skip` → `skipped`, `it.todo` → `todo`. The shape is Jest's `--json` shape by design.
- **Playwright `json` reporter**, two projects: top-level `suites[]` are per-file (title = file name), nested
  suites are `describe`s, `specs[].tests[]` carry `projectName`, `status` ∈ `expected | unexpected | skipped |
flaky` and `expectedStatus`. A `test.fail()` test that fails is `status: expected, expectedStatus: failed`.
  `config.rootDir` is the absolute `testDir`.
- **Both reporters honor an env-gated config** — with `PHARN_TEST_RESULTS` set the file appears at that path;
  unset, vitest prints no JSON and Playwright uses `list` only (both measured).

## Decisions for the options halt (approved under the overnight delegation — see SHIP.md)

a. **Results format → the closed set of built-in JSON reporters: `vitest-json`, `jest-json`,
`playwright-json`.** No project dependency; JSON is `JSON.parse` in the stdlib-only floor. CTRF rejected for
now: its schema is explicitly pre-1.0 and every reporter is a 0.0.x third-party package a project would have to
install (correction 4). `vitest-json` and `jest-json` share one adapter (vitest's reporter emits Jest's shape) but
stay separate enum members so a project names what it runs. The `playwright-json` member covers item 02's e2e
gate. Trade-off stated: three adapters maintained by PHARN against formats their owners may change; CTRF would
have made that one adapter. Revisit when CTRF declares 1.0.

b. **Opt-in → `pharn.config.json` key `testResults`, a map `{ <gate-id>: <format> }`**, e.g.
`{"testResults": {"test": "vitest-json"}}`. The value names only the format. Keyed by gate id so item 02 adds
`test:e2e: playwright-json` beside `test` without a shape change. Valid keys are a closed set, `RESULTS_GATES`
(`["test"]` in this increment; item 02 extends it). **Validated where it is consumed, not by a new CLI:** the
core's `readResultsConfig` REDs any malformed block as `config-invalid`. Extending `check-model-config.mjs` was
rejected (P3: it changes when `models.stages` changes), and a new checker CLI was rejected (P7: no command
invokes `check-model-config.mjs` either, so a sibling CLI would have no caller). Absent file / absent key / gate
not named → `not-configured`, never a RED in this increment.

c. **Store → the raw file in `<out>` is the single store (L35)**; the gate's `runs[]` entry carries
`results_sha256` (sha256 of a regular file, else `null`), mirroring `stdout_sha256`; the core derives the record
on demand and REFUSES a file whose bytes no longer hash to that value (`results-hash-mismatch`). No parsed copy
in the stamp (L43). `SCHEMA` stays `gate-run-record/1`: the field is optional and additive; `validateStamp`
checks it only when present (`null` or 64-hex), so every existing stamp still validates — proven by a test over
a stamp without the field and one with it.

d. **Test identity → `id = <file>::<full title>`**, `full title` = the title path joined with `" › "`. Every
entry also carries `file` and the leaf `title` separately (later items match `AC-<n>:` against the leaf within a
file).

- vitest/jest: `file` = the reporter's path made relative to `root`; path = `[...ancestorTitles, title]`.
- playwright: `file` = `resolve(config.rootDir, spec.file)` made relative to `root` (correction 3); path =
  `[projectName (when non-empty), ...describe titles, spec.title]` — the project in the path is what keeps a
  multi-project run's ids unique. Where the format gives no absolute root, the file stays as given (stated).
- A title containing `" › "` or `"::"` could make two tests collide; a collision is `duplicate-test-id` (closed
  reason, fail-closed), never last-wins.

e. **Status mapping (closed, fail-closed):**

- vitest/jest: `passed`→passed, `failed`→failed, `skipped`|`pending`|`todo`→skipped; anything else
  (`disabled`, `focused`, …) → `unknown-status`.
- playwright: `expected` with `expectedStatus: passed` → passed; `unexpected` → failed; `skipped` → skipped;
  anything else → `unknown-status`, which deliberately includes `flaky` (passed only on a retry) and an
  expected-failure (`test.fail()`), because neither is a plain pass and neither is a plain fail.

f. **The env var → `PHARN_TEST_RESULTS`**, passed to EVERY gate the runner spawns, valued with that gate's own
absolute path `<out>/<seq>-<id>.test-results.json` (the name rule reuses `logBasename`, one copy — L35). Same
name, different value per gate, so a later gate cannot overwrite an earlier one's file. The inherited
environment is otherwise unchanged (`{...process.env, PHARN_TEST_RESULTS}`).

g. **Regress: head side only, by consumers.** The runner hands the var to both sides alike (it does not know
which side's record anyone will read). The base commit may predate the reporter setup, so the contract states
that a base-side record is never read and a base-side `results-unavailable` can never affect regress. In this
increment NOTHING reads any record, so no verdict can move.

## Files

- `pharn/floor/test-results-core.mjs` — NEW. `RESULTS_GATES`, `RECORD_REASONS`, the caps, `readResultsConfig`,
  and the exported `testRecord({ stamp, outDir, gateId, root })` (stamp binding, identity, duplicates, the
  exit-code cross-check). No `child_process`, no network; its only I/O is reading `<root>/pharn.config.json` and
  the one results file — product floor
- `pharn/floor/test-results-formats.mjs` — NEW (amended after grill, P3). `RESULTS_FORMATS`, `RECORD_STATUSES`,
  the two adapters and `parseResults`. It changes when a REPORTER's format changes; the core changes when the
  record's semantics change. Imports nothing from the core — product floor
- `pharn/floor/test-results-core.test.mjs` — NEW. The suite below, over both modules — floor test (apparatus)
- `pharn/floor/test-fixtures/test-results/playwright-edge.json` — NEW (amended after grill). A captured
  Playwright 1.63.0 run with `retries: 1` holding a plain pass, a `test.fail()` expected failure and a genuinely
  flaky test (exit 0) — the real-reporter evidence for the `unknown-status` rows — floor test fixture (apparatus)
- `pharn/floor/test-fixtures/test-results/vitest.json` — NEW. A captured vitest 5.0.1 report, paths rewritten to
  the placeholder root `/work/proj` — floor test fixture (apparatus)
- `pharn/floor/test-fixtures/test-results/playwright.json` — NEW. A captured Playwright 1.63.0 two-project
  report, paths rewritten the same way — floor test fixture (apparatus)
- `pharn/floor/gate-run-core.mjs` — `RESULTS_ENV` and `resultsFileName(seq, id)` (one copy of the name rule), and
  the optional `results_sha256` shape check in `validateStamp` — product floor
- `pharn/floor/gate-run-core.test.mjs` — `validateStamp` with and without the field, and a malformed value —
  floor test (apparatus)
- `pharn/floor/run-gates.mjs` — pass `PHARN_TEST_RESULTS` to every spawned gate; record `results_sha256`
  (regular file only, else `null`) on every `runs[]` entry; header note — product floor
- `pharn/floor/run-gates.test.mjs` — env var reaches the gate, sits inside `<out>`, differs per gate, inherited
  env preserved; `results_sha256` recorded / `null`; a symlinked results file is not followed; end-to-end
  runner → `testRecord` — floor test (apparatus)
- `pharn/pharn-contracts/gate-run-record.md` — the `results_sha256` field and the env var — pharn-contracts
- `pharn/pharn-contracts/test-results-record.md` — NEW contract: config key, env var, file location, formats,
  identity, status map, the closed reasons, record shape, trust and bounds — pharn-contracts
- `README.md` — badge 6.14.1 → 6.15.0; a "Per-test results" subsection under "The pipeline" (the config key and
  a reporter config that reads the env var, with a vitest and a Playwright example); plus any `CURRENT-STATE`
  bytes `npm run docs:generate` rewrites (a Bash write, declared here — L19) — repo meta
- `docs/capabilities/README.md` — only if `npm run docs:generate` rewrites it (declared for the same reason) —
  generated
- `CLAUDE.md` — the run-gates paragraph in "Commands" names the env var, the per-gate file and the core — repo
  meta
- `SKILLS_VERSION` — 6.14.1 → 6.15.0 (MINOR: a new floor module and contract; re-read `main` at build time and
  take the next minor if it moved). `MIN_CLI` stays 0.5.0: no installed path moves — repo meta
- `CHANGELOG.md` — `## [6.15.0] - <date>` directly above `[6.14.1]`, `[Unreleased]` (empty today) moved in,
  this increment's entry under `### Added` — repo meta
- `.dev/features/test-results/PROTECTED-FOLLOWUPS.md` — NEW (amended after grill). The protected edit this
  increment needs and may not write: `pharn/ARCHITECTURE.md` §4's contract list — dev artifact

### Not written by the build

- `pharn/ARCHITECTURE.md` §4 (`:131-135`) enumerates every `pharn-contracts` schema; `test-results-record` joins
  it. Protected (fix #2), so the suggested edit goes to `PROTECTED-FOLLOWUPS.md` for a human. (Correcting the
  record: the plan first said no protected edit was needed; it had searched for a different claim.) `LIMITS.md`
  and `THREAT-MODEL.md` make no claim that the floor sees only whole-gate exit codes; they stay accurate.

## Contracts satisfied

- `gate-run-record` — extended additively (`results_sha256`); SCHEMA unchanged; cited, not restated (P4).
- `test-results-record` — new; the per-test record is a DERIVED VIEW, never stored.

## Evals to write (P1)

No Capability (no `role:`) is added, so no `evals/` directory. The floor suite is the specification:

- each format's captured fixture → the EXACT record (ids, files, leaf titles, statuses), including the test
  nested two `describe`s deep, and for Playwright both projects;
- each closed reason → one fixture that trips ONLY it, made by ONE mutation of a passing fixture, with the
  unmutated fixture as its non-vacuity control (L34/L52): `stamp-invalid`, `gate-absent`, `not-configured` (three
  paths: no file, no key, gate not named), `config-invalid`, `results-unavailable` (null hash, timed out, missing
  file, symlink), `results-hash-mismatch`, `results-malformed` (bad JSON, wrong shape per format), `over-cap`
  (bytes, count, id length), `unknown-status` (per format, incl. playwright `flaky`), `duplicate-test-id`,
  `results-exit-contradiction`;
- exit ≠ 0 with every test passed → a record, NOT a contradiction;
- closure tests (L36): every `RECORD_REASONS` member has an emitter reached by a test, and every status the
  adapters emit is a `RECORD_STATUSES` member;
- L15: `readResultsConfig` over `toString` / `constructor` / `__proto__` gate ids → `not-configured`, never a
  prototype member.

## Guarantee audit (P0)

- "the per-test record is derived by tested code, never typed by a model" → floor: enum-regex (the adapters +
  closed status map, primitive #3) over a file bound to the stamp by content-hash (primitive #2).
- "the record describes THIS run's file" → floor: content-hash (`results_sha256` recorded by the runner after
  the gate, re-checked at derivation); plus `init`'s wipe of `<out>` (structural). NOT provenance: a
  self-consistent forged file passes (L43).
- "passed means the test passed" → advisory. It means the project's reporter said so. The build agent can
  edit `package.json` scripts and the reporter config, so a forged file is possible; `results-exit-contradiction`
  narrows it (a failed test under exit 0), it does not close it. Named follow-up: pin the test-infra files
  (item 06).
- "the record is additive — no verdict changes" → floor: no verdict core reads it (`check-verify.mjs`,
  `check-regress.mjs`, `check-loop-fresh.mjs` unchanged); proven by the existing suites passing unchanged.
- "a stamp without the field still validates" → floor: `validateStamp` test.

## Trust audit (P2)

- The results file is written by project code → UNTRUSTED DATA. The core reads it only as JSON, under a byte cap,
  from a regular file (a symlink is refused, so `/dev/zero`-style reads cannot hang the reader). The record ranges
  over a closed status enum and an opaque id string (never interpreted, never an instruction, never compiled into
  a RegExp), under count and length caps. Failure messages, durations and every other field are ignored.
- `pharn.config.json` is repo-local, human-authored config, read as JSON, used only as enum members (L15
  own-property lookup).

## Determinism audit (P5)

Every branch is a membership test (format ∈ `RESULTS_FORMATS`, key ∈ `RESULTS_GATES`, status ∈ the map) or an
integer compare (caps, exit code). No fallback guesses: anything outside a set is a closed reason.

## Applied lessons

- L1 — the meta-docs this changes are named in `## Files`: `gate-run-record.md` (the new field), `CLAUDE.md`
  (run-gates paragraph), `README.md` (how to enable), `CHANGELOG.md`.
- L4 — the vitest and Playwright fixtures are CAPTURED from the real reporters, not authored to pass; the jest
  fixture is the one constructed file, and its test says so.
- L15 — `testResults[gateId]` is read with `Object.hasOwn`; a test drives the prototype names.
- L29 — the closed sets (`RESULTS_FORMATS`, `RESULTS_GATES`, `RECORD_STATUSES`, `RECORD_REASONS`) are materialized
  once and iterated by the tests.
- L34 — a zero-test results file is an `ok` record with `tests: []` and the contract says so, so a later consumer
  must assert non-emptiness itself; every refusal test has a non-vacuity control.
- L35 — the raw file is the only store; the stamp carries a hash, never a parsed copy; the file-name rule has one
  copy (`resultsFileName` in `gate-run-core.mjs`, reused by runner and core).
- L36 — reasons and statuses are closed and tested both ways.
- L41 — `testRecord` takes no defaults (`root` is required), so there is no default for the suite to skip.
- L43 — the contract states that the sha binding certifies the file is the one the runner hashed, never that its
  contents are true.
- L52 — each rule over a set is tested per member (every format, every reason, every status).
- L55 — the adapters' model of each format is checked against captures from the real reporters, not only against
  fixtures written from that model.

## Open questions (HALT)

None open. Decisions a–g above are the options halt; approved under the overnight delegation (recorded in
SHIP.md).

## Amended after grill

- **P3 split.** The reporter adapters moved out of `test-results-core.mjs` into `test-results-formats.mjs`: a
  vitest or Playwright release changes the adapters, a change to what a record means changes the core. The
  formats module exports `FORMAT_REFUSALS`; a closure test pins it ⊂ `RECORD_REASONS`.
- **A second Playwright capture.** The first two-project capture held a `test.fail()` test, which decision e
  maps to `unknown-status`, so it could not also serve as the exact-record fixture. The main fixture was
  re-captured without it, and `playwright-edge.json` (a real run with an expected failure and a real flaky
  test, exit 0) carries those cases.
- **Bounded, race-free reads.** The runner hashes the results file in fixed-size chunks through a descriptor
  opened `O_NOFOLLOW | O_NONBLOCK` and checked with `fstat` as a regular file, so a symlink, FIFO or device is
  never followed or blocked on and there is no check-then-use window (CWE-367). The core opens the file the same
  way and refuses it above the byte cap before reading.
- **HONEST TRIGGER (P7).** No dogfood run failed on this. The trigger is the maintainer's queued direction
  (the AC-delivery queue, item 01) plus a gap demonstrable on any project: a suite exits 0 with
  `it.skip("AC-1: …")`, and the floor sees only that exit. Recorded as such, not dressed as an observed failure.
- **Grill round 2 (the independent adversarial pass), adopted:**
  - **`jest-json` dropped.** Its only evidence would have been a fixture built from this plan's own model of the
    format — L55's failure shape. `RESULTS_FORMATS` is `["playwright-json", "vitest-json"]`; Jest joins when a
    live capture can back it. The vitest adapter still reads Jest's shape, which vitest emits by design.
  - **The runner unlinks the gate's results path before spawning it.** Stale-lock recovery re-runs an entry
    without `init`'s wipe, and a re-run that writes no file would otherwise hash the crashed attempt's file.
  - **`suite_errors` (an integer) joins the record**: vitest `testResults[]` entries whose `status` is `failed`
    with no failed assertion (a file that failed to import), and Playwright's top-level `errors[]` length. A run
    that lost whole files no longer reads all-green. Exit 0 with `suite_errors > 0` is also a
    `results-exit-contradiction`.
  - **Wording corrected.** The verdict paths are unchanged for every stamp the runner writes; a stamp carrying a
    MALFORMED `results_sha256` is now refused as `stamp-malformed` by all three `validateStamp` callers — a new
    route, reachable only by a forged or corrupted stamp. `pharn.config.json` is not guarded, so the opt-in and
    the format are agent-reachable (advisory). `init`'s wipe and the pre-spawn unlink are runner behaviour pinned
    by tests, not a floor primitive.
  - **L58 — the results file is a live referent.** A detached descendant of the gate can still write it after
    the runner hashed it. Nothing in it is compared against a growing source: the record is derived from the
    exact bytes the runner hashed, and a later write surfaces as `results-hash-mismatch` (fail-closed), never as
    a changed record. The contract names the split.
  - **Fail-closed is per record, stated in the contract.** One flaky test, one `test.fail()`, a duplicate title or
    a `repeatEach` voids the whole record, and a `testResults` key outside `RESULTS_GATES` (e.g. `test:e2e`
    before item 02) makes every gate's config `config-invalid`.
