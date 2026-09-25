# PLAN — neutral-test-results

- spec_content_hash: 4950796f5342df20a298fe22812e45dec3c15317592bd2358a31e149d2dc1c7f
- applied_lessons: [L1, L4, L15, L29, L33, L34, L35, L36, L47, L50, L52, L55, L56, L60]
- increment: Add two per-test results formats: `jest-json` (Jest's built-in `--json` report, captured live from Jest 30.5.2 and 29.7.0) and `pharn-json`, a framework-neutral schema PHARN owns (`pharn-test-results/1`) that any runner can emit. Also add the Jest-specific rule the AC-test convention needs, and correct the shipped claim that "one flaky test or `test.fail()` voids the record", which measured false for Vitest and Jest 29.
- layer(s): product floor (`pharn/floor/test-results-formats.mjs`; header comments in `test-results-core.mjs` and `ac-gate-core.mjs`), pharn-contracts (`test-results-record.md`, `ac-tests.md`), the product command `/pharn-test`, repo meta (README, CLAUDE.md, CHANGELOG, SKILLS_VERSION).
- constitution_refs: [P0, P2, P3, P4, P5, P6, P7]

## The request, and its honest trigger (P7)

The maintainer asked (2026-09-25): add Jest or a stable neutral results format, because without it a large share of
React/Next.js projects drops out on the first run. They lean toward a framework-agnostic format.

That is the trigger, and it is the maintainer's direction, not a dogfood failure. The gap it names is real and can be
shown on any Jest project. `RESULTS_FORMATS` is `["playwright-json", "vitest-json"]`, so a Jest project cannot
configure `testResults`. `/pharn-test`'s preflight then stops every `unit`/`integration` AC with
`ac-level-unavailable`, and `/pharn-loop` stops as S12 `blocked: no-test-runner`. Two further failures were **observed
in this run's measurements** (below), not assumed:

- the AC-test convention's `await import()` stays red under plain Jest even after a correct build;
- a shipped sentence overclaims what voids a record.

## Correcting the record (P6)

Measured this run in worktree `neutral-test-results`, branched from `main` = `ee81d47` (`SKILLS_VERSION` 6.21.2,
`MIN_CLI` 0.5.0). This is a MINOR bump (two new shipped formats): **6.21.2 → 6.22.0**. At build time, re-read
`origin/main`, and if it moved, take the next minor.

The shipped surface currently says three things this increment makes false:

- `test-results-formats.mjs:16-19`: "`jest-json` was dropped at grill: its only evidence would have been a fixture …
  either joins when a live capture can back it". This run produced the live capture.
- `test-results-record.md:49-52`: "CTRF and Jest's own `--json` are not members … Jest had no live capture".
- Seven sites say a flaky test or an expected failure voids the record, with no format qualifier:
  - `test-results-core.mjs:32`
  - `ac-gate-core.mjs:44`
  - `ac-tests.md:389`
  - `README.md:518` and `README.md:570`
  - `CLAUDE.md:328` and `CLAUDE.md:440`

  Measured below, this is true only when the report marks the case.

## Measured this run (the evidence the decisions rest on)

All captures ran in the session scratchpad. `jest@30.5.2`, `jest@29.7.0`, `jest-junit@17.0.0`, `vitest@5.0.1` and
`@babel/preset-env@7` were installed from npm. The runner was a disposable `.pharn/pharn-dev-plan/capture.mjs`,
which is not committed. The registry was read this run: `jest` 30.5.2, `jest-junit` 17.0.0, `vitest` 5.0.2,
`@playwright/test` 1.63.0, `ctrf` 0.3.0 (modified 2026-08-15), `jest-ctrf-json-reporter` 0.0.11.

1. **Jest `--json --outputFile=<f>` has the shape the vitest adapter already reads.** It has `testResults[].name`
   (absolute), `.status`, and `assertionResults[]` with `ancestorTitles`, `title` and `status`. The declared
   `Status` union (`@jest/types`) is `passed | failed | skipped | pending | todo | disabled | focused`.
   - `test.skip` → `pending` and `test.todo` → `todo`.
   - A file that throws at load → `status: failed` with zero assertion results. This is the same suite-error rule
     as vitest.
   - Both versions emit `invocations` on every assertion.
2. **Jest 30.5.2 marks an expected failure; Jest 29.7.0 does not.** In 30.5.2, `test.failing` that fails →
   `status: passed, failing: true`. In 29.7.0 the same test → `status: passed` with **no `failing` key**.
3. **A Jest pass on retry is marked in both versions.** `jest.retryTimes(2)` with a test that passes on the second
   attempt → `status: passed, invocations: 2`. A test that fails every attempt → `failed, invocations: 3`.
4. **Vitest 5.0.1 marks neither.** `test.fails` that fails → `passed`, no marker. `{ retry: 2 }` passing on the
   second attempt → `passed`, whose only trace is a non-empty `failureMessages`. The shipped "voids the record"
   sentence is therefore false for vitest today.
5. **The AC-test convention under Jest.** A body `await import("../src/target.js")` under **plain** Jest (CommonJS,
   no transform of `import()`) fails with "A dynamic import callback was invoked without --experimental-vm-modules"
   **before and after** the target exists. It stays red after a correct build. A body `require(...)` fails with
   "Cannot find module" before and passes after. Under babel-jest with `@babel/preset-env`, both forms fail before
   and pass after. A top-level `require` of a missing module makes the file uncollected (zero assertions), as the
   convention expects. Measured on Jest 30.5.2. Findings 1–3 hold for Jest 29.7.0 as well.
6. **JUnit XML is not one format** (captures of `jest-junit` 17.0.0 and vitest 5.0.1's `junit` reporter):
   - `jest-junit` drops a file that fails to load unless `reportTestSuiteErrors` is set;
   - it renders `test.todo` as a plain passing `<testcase>`, so todo becomes pass;
   - by default it writes `name="{classname} {title}"` with the describe path space-joined and no `file`
     attribute, and the testsuite is named `undefined`;
   - vitest writes the describe path into `name`, joined with `" > "`, and the file into `classname`.

   So "leaf title", "file" and "todo" are defined by each producer. A single adapter would need per-producer
   rules, and the floor would need an XML tokenizer, which is new untrusted-input parsing.

7. **The npm-script recipe works.** `jest ${PHARN_TEST_RESULTS:+--json "--outputFile=$PHARN_TEST_RESULTS"}` under
   `sh -c` writes the file to a path containing a space when the variable is set, and runs normally when it is unset.

## Decisions (the options go to the human at GATE 1)

a. **Formats → add `jest-json` and `pharn-json`.** `RESULTS_FORMATS` becomes `["jest-json", "pharn-json",
   "playwright-json", "vitest-json"]` (sorted, as today).

- `jest-json` is the zero-install route for Jest projects, the React/Next.js case.
- `pharn-json` is the framework-agnostic route. PHARN owns it, so it is stable by construction (a versioned
  schema string). Any runner can reach it with a small reporter the project writes.
- JUnit XML was rejected on measurement 6.
- CTRF was re-checked and is still pre-1.0 (0.3.0; the reporters are 0.0.x third-party packages), so the
  standing rejection holds.

b. **`jest-json` adapter (Jest's shape, one walker, L35).** Vitest and Jest share one walk and ONE status map. The
two raw vocabularies map identically: `passed`→passed, `failed`→failed, `skipped|pending|todo`→skipped, and
`disabled`, `focused` and anything else → `unknown-status`. Jest adds per-assertion checks, closed and
fail-closed:

- `invocations` must be a positive safe integer (both measured versions emit it), else `results-malformed`;
- `failing`, when present, must be a boolean, else `results-malformed`; `true` → `unknown-status` (an expected
  failure, like Playwright's `test.fail()`);
- `passed` with `invocations > 1` → `unknown-status` (passed only on a retry, like Playwright's `flaky`).

No new `RECORD_REASONS` member, so red-run and the AC gate, which iterate that set, need no change. **Bound,
stated and pinned by a test over the Jest 29 capture:** Jest 29 emits no `failing`, so there a `test.failing`
reads as its raw status.

c. **`pharn-json` — schema `pharn-test-results/1`, closed in both directions (L36):**

```json
{
  "schema": "pharn-test-results/1",
  "suite_errors": 0,
  "tests": [{ "file": "tests/cart.test.js", "path": ["checkout", "AC-1: sums line items"], "status": "passed" }]
}
```

- The top-level keys are exactly {`schema`, `suite_errors`, `tests`}.
- `schema` must equal the string exactly. A `/2` is a new format member, never a reinterpretation.
- `suite_errors` is a non-negative safe integer and is REQUIRED, so a producer cannot omit load failures by
  silence.
- Each test's keys are exactly {`file`, `path`, `status`}:
  - `file` is a non-empty string, relativized like the other formats;
  - `path` is a non-empty array of non-empty strings, whose last element is the leaf title;
  - `status` is a member of `RECORD_STATUSES`, which is imported and not restated (L35), else `unknown-status`.
- Every other violation → `results-malformed`.
- A producer that ran nothing writes `tests: []`, and that is an `ok` record (L34).
- "passed" is the producer's word (L43), and the contract says so.

d. **The Jest note in the AC-test convention (measurement 5).** Under Jest, import the target inside the body with
`require()`. `await import()` works only when the setup transforms dynamic import (babel-jest with
`@babel/preset-env` measured) or runs Jest's ESM mode. The bound is stated: the red run reads status only, so it
cannot tell a test that fails for the wrong reason, and such a test passes the red run and then fails verify.
The note goes into `/pharn-test`'s writing rules, `ac-tests.md` "The convention it rests on", README, and
CLAUDE.md.

e. **Correct the overclaim at every site (L33/L50).** The sweep uses the shortest invariant substrings (`flaky`,
`test.fail`, `expected failure`, `jest`, `ctrf`, `live capture`, `both built`, `both reporters`) over `pharn/`
(fixtures and `pharn/features/` excluded), README.md, CLAUDE.md, the `pharn-*` commands and the two root trusted
docs. It found the seven sites in "Correcting the record"; the trusted docs have none.

- The replacement is an **open form** (L47): "a flaky test or expected failure the report marks … voids the
  record", followed by the measured unmarked cases, named as known ones and not as a closed count.
- Referent axis (L50): the claim's referent is `test-results-formats.mjs`'s status section. Every cite of it is in
  the enumeration above.

f. **Deferred, not built (P7), named for the human:**

- **`vitest-retry-pass-detect`.** Refuse a vitest `passed` whose `failureMessages` is non-empty (measurement 4).
  It changes the verdict for existing vitest installs that use retries, so it needs its own increment and grill.
- **`pharn-json-reference-producers`.** Measured producer recipes (node:test, mocha). No runner outside the three
  supported ones has been observed failing yet.

## Applied lessons

- L1 — the meta-docs whose facts change are named in `## Files`:
  - `README.md` (formats, recipe, the two corrected sentences, badge);
  - `CLAUDE.md` (the per-test paragraph's format set, the red-run convention, the two corrected sentences);
  - `CHANGELOG.md`.
- L4 — every Jest fixture is a capture from the real reporter, with only its capture root rewritten to `/work/proj`,
  and the vitest `test.fails` fixture is a capture too. The `pharn-json` documents in the suite are authored, and the
  suite header says so: PHARN is that format's owner, so its spec is the reference they are checked against.
- L15 — the closed-key checks use `Object.keys` over `JSON.parse` output, so a `"__proto__"` key is an own property
  and is refused, and a test drives it. Status lookups stay a `Map`.
- L29 — the new sets are materialized once and iterated: `RESULTS_FORMATS`, the Jest-shape status map, the `pharn-json`
  key sets. A ✧ enumeration `FORMAT_CAPTURES` maps every `RESULTS_FORMATS` member to its evidence, and the rules loop
  over it.
- L33 — the "joins when a live capture can back it" and "Jest had no live capture" sentences expire in this
  increment, and every spelling found by the substring sweep in decision e is rewritten.
- L34 — a `pharn-json` document with `tests: []` is an `ok` record with zero tests, and a test says so. Every refusal
  test starts from a passing control.
- L35 — one Jest-shape walker and one status map serve vitest and Jest. The `pharn-json` status set is
  `RECORD_STATUSES` itself, imported.
- L36 — `pharn-json`'s key sets are CLOSED both ways (an extra key and a missing key each refuse), and a ✧ closure test
  requires every `RESULTS_FORMATS` member to reach an adapter branch in `parseResults`.
- L47 — the corrected "voids the record" sentences use an open form, never a new count of formats.
- L50 — the sweep ran by claim AND by referent. Its axes and its boundary are declared in decision e.
- L52 — each Jest refusal has its own test, per member:
  - `failing: true`;
  - retry-pass;
  - each unmapped raw status;
  - each malformed `invocations` / `failing` value.

  Each `pharn-json` violation has its own test too. None of them stands in for another.

- L55 — the Jest adapter's model of the format is checked against the Jest 30.5.2 and 29.7.0 captures, not against
  fixtures written from that model.
- L56 — every bound this plan states comes from a measurement in this run, and each is pinned by a test over the
  capture that shows it: Jest 29's missing `failing`, vitest's unmarked `test.fails` and retry pass, and plain Jest's
  `await import`. None was reasoned from the model.
- L60 — every asserted property gets a negative control that turns it red:
  - the retry refusal is controlled by the same entry with `invocations: 1`;
  - the `failing` refusal by `failing: false`;
  - each closed-key refusal by the valid document;
  - the ✧ contract-example test asserts that its anchor (the fenced block under the `pharn-json` heading) is found
    before parsing it.

## Files

- `pharn/floor/test-results-formats.mjs` — adds `jest-json` and `pharn-json` to `RESULTS_FORMATS`, exports
  `PHARN_RESULTS_SCHEMA`, and adds the shared Jest-shape walker with Jest's extra checks, the `pharn-json` adapter and
  the `parseResults` dispatch. The header is rewritten: the formats, their captures, status mapping and bounds, why
  JUnit and CTRF were not chosen, and trust — product floor
- `pharn/floor/test-results-core.mjs` — header comment only: the "one flaky test, one `test.fail()`" sentence →
  the open form — product floor
- `pharn/floor/ac-gate-core.mjs` — header comment only: the same sentence → the open form — product floor
- `pharn/floor/gate-run-core.mjs` — added at GATE 2 (review finding, the human chose "fix"). Comment only: the
  ac-test set's "cannot void the record" claim is bounded by runners that read positional arguments as patterns —
  product floor
- `pharn/floor/test-results-core.test.mjs` — the suite in "Tests to write" below — floor test (apparatus)
- `pharn/floor/check-red-run.test.mjs` — the red run over a REAL Jest capture: the `require()` convention works,
  a top-level require is not collected, another feature's `AC-1:` is ignored, and the `await import` bound — floor
  test (apparatus)
- `pharn/floor/test-fixtures/test-results/jest.json` — NEW, captured with Jest 30.5.2. It mirrors `vitest.json`'s
  tests (nested describe, skip, todo, one failing), plus a file that throws at load — floor test fixture (apparatus)
- `pharn/floor/test-fixtures/test-results/jest-edge.json` — NEW, captured with Jest 30.5.2 and exit 0: a
  `test.failing` that fails, a pass on retry, and a plain pass — floor test fixture (apparatus)
- `pharn/floor/test-fixtures/test-results/jest29-edge.json` — NEW, captured with Jest 29.7.0 over the same edge file:
  no `failing` key — floor test fixture (apparatus)
- `pharn/floor/test-fixtures/test-results/jest-red.json` — NEW, captured with Jest 30.5.2 before the "build":
  `tests/ac/demo.unit.test.js`, `demo.static.test.js` and `other.unit.test.js`, laid out like `vitest-red.json`, plus
  an `AC-4:` that uses `await import` — floor test fixture (apparatus)
- `pharn/floor/test-fixtures/test-results/jest-after.json` — NEW, captured with Jest 30.5.2 over the same files after
  the target exists. `AC-1` passes and `AC-4` still fails: the plain-Jest trap — floor test fixture (apparatus)
- `pharn/floor/test-fixtures/test-results/vitest-fails.json` — NEW, captured with vitest 5.0.1: `test.fails` and a
  pass on retry, both reported `passed` — floor test fixture (apparatus)
- `pharn/pharn-contracts/test-results-record.md` — the formats table, the new "The neutral format (`pharn-json`)"
  section with the schema, the status table rows, the id/file/title bullets, the marked vs unmarked expected-failure
  and retry bound, and a rewritten CTRF/JUnit paragraph — pharn-contracts
- `pharn/pharn-contracts/ac-tests.md` — "The convention it rests on": the Jest `require()` rule, measured, and its
  bound; `:389` → the open form — pharn-contracts
- `.claude/commands/pharn-test.md` — the "Import the declared target INSIDE the test body" rule gains the Jest
  sentence — product command
- `README.md` — "Per-test results": the formats, a Jest recipe (the measured npm-script form) and a pointer to the
  `pharn-json` schema; `:518` and `:570` → the open form; the test-body bullet gains the Jest sentence; badge 6.21.2 →
  6.22.0. Plus any `CURRENT-STATE` bytes `npm run docs:generate` rewrites, a declared Bash write (L19). None are
  expected, because the catalog renders capabilities and neither contract has a `role:` — repo meta
- `CLAUDE.md` — the per-test results paragraph (format set, the red-run convention's Jest note) and `:328` / `:440` →
  the open form — repo meta
- `SKILLS_VERSION` — 6.21.2 → 6.22.0. `MIN_CLI` stays 0.5.0, because no installed path moves — repo meta
- `CHANGELOG.md` — `## [6.22.0] - 2026-09-25` directly above `[6.21.2]`, with this increment's entry under
  `### Added`. `[Unreleased]` holds no entries today; re-read it at build time — repo meta

### Not written by the build

- `.pharn/pharn-dev-plan/capture.mjs` and `.pharn/pharn-dev-plan/summarize.mjs` — disposable discovery runners,
  gitignored. The build runs its own capture runner under `.pharn/pharn-dev-build/` and writes the six fixtures above
  from it: a Bash write, declared by listing the fixture paths above (L19).
- `pharn/floor/test-infra-core.mjs` — `RESULTS_VALUES` derives from `RESULTS_FORMATS`, so the lock accepts the new
  formats with no edit, and an existing `/1`–`/3` lock is unaffected.
- The four trusted docs — the sweep found no format claim in them.

## Contracts satisfied

- `test-results-record.md` — the record's shape, `RECORD_REASONS` and `RECORD_STATUSES` are unchanged. The contract
  gains two format members and a schema section, and its semantics are cited, not restated elsewhere (P4).
- `ac-tests.md` — the red run's matching rule (file equality, leaf `AC-<n>:`) is unchanged. `jest-json` and
  `pharn-json` each supply `file` and a leaf title that satisfy it.
- `gate-run-record.md` — untouched. `PHARN_TEST_RESULTS` and `results_sha256` work as they do today.

## Tests to write (P1 — floor suites, no capability is added)

`test-results-core.test.mjs`:

- The set pin: `RESULTS_FORMATS` is the four members. The "outside `RESULTS_FORMATS`" and `config-invalid` cases
  that used `jest-json` as the non-member now use `junit-xml` and `ctrf-json`, and `JEST-JSON` stays a case-variant
  refusal.
- ✧ `FORMAT_CAPTURES` enumeration (L29/L36): every `RESULTS_FORMATS` member has evidence (a capture, or for
  `pharn-json` the contract's own example), parses `ok`, and reaches its own adapter branch. A member with no
  entry fails.
- The Jest 30.5.2 capture gives the exact record:
  - ids, leaf titles and files relative to the root;
  - `pending` / `todo` → skipped, and one failed;
  - `suite_errors: 1` from the file that throws.
- The Jest edge captures, each case isolated by removing the other:
  - Jest 30 `test.failing` → `unknown-status`, and a retry pass → `unknown-status`, each with its control;
  - the Jest 29 capture's `test.failing` reads `passed` (bound pinned), while its retry pass still refuses.
- The Jest status map per member: each mapped raw status, and `disabled`, `focused`, `constructor`, `toString`
  refuse. `invocations` absent, `0`, `1.5`, `"1"` and `-1` → `results-malformed`. `failing: "true"` →
  `results-malformed`.
- `jest-after.json` (the trap): `AC-1` passed, `AC-4` failed with the target present.
- `vitest-fails.json`: `test.fails` and the retry pass both read `passed` (bound pinned; vitest unchanged).
- `pharn-json`:
  - a valid document gives the exact record;
  - `tests: []` gives an ok record with zero tests;
  - a status outside `RECORD_STATUSES` → `unknown-status`;
  - each of these → `results-malformed`, one test each: a wrong or absent `schema` (`pharn-test-results/2`, missing),
    `suite_errors` absent, negative, `1.5` or `"0"`, an extra top-level key, a missing top-level key, an extra
    per-test key (incl. `"__proto__"`, L15), a missing per-test key, `file` empty or non-string, `path` empty,
    non-array or holding an empty or non-string element;
  - an absolute `file` under the root is relativized.
- ✧ The contract's example (the fenced JSON under the `pharn-json` heading, anchor asserted found) parses `ok`, so
  the documented schema and the adapter cannot drift apart unnoticed.
- The existing "every status an adapter emits is a `RECORD_STATUSES` member" test ranges over the new captures.

`check-red-run.test.mjs`, over `jest-red.json` with `{"testResults": {"test": "jest-json"}}`:

- `AC-1` (`require()` in the body) is collected and failed → GREEN;
- the top-level-require file is `ac-test-not-collected`;
- the other feature's passing `AC-1:` mapped to its own file is `ac-test-passes-before-build`, and ignored otherwise;
- the `await import` `AC-4` is GREEN too, which pins the bound that the red run cannot see a wrong-reason failure.

## Guarantee audit (P0)

- "A `jest-json` / `pharn-json` record is derived from the exact bytes the runner hashed, through a closed status map
  and closed reasons" → **floor: content-hash + enum-regex**, unchanged in mechanism. The adapters are tested code.
- "A Jest `test.failing` or pass on retry voids the record" → **floor: enum-regex** (boolean membership, integer
  compare) **on reports that carry the field**. It is not detected on Jest 29 (no field), stated and pinned.
- "A `pharn-json` document conforms to `pharn-test-results/1`" → **floor: enum-regex** (exact schema string, closed key
  sets both ways, enum status, integer).
- "The Jest adapter matches real Jest output" → **advisory evidence**: checked against Jest 30.5.2 and 29.7.0 captures,
  and no other version is claimed.
- "A `pharn-json` or `jest-json` status is true" → **advisory**: it is the producer's word, agreement and never
  provenance (L43).
- "Under Jest, use `require()` in the test body" → **advisory** guidance, measured. The red run cannot detect a test
  that fails for the wrong reason (it reads status only), and that bound is stated.
- "A flaky test or expected failure the report marks voids the record" → **floor** for the marked cases per format.
  The unmarked cases (vitest `test.fails` and pass on retry; Jest 29 `test.failing`) are **not detected**: they are
  stated, pinned by captures, and never claimed.

## Trust audit (P2)

The results file is written by project code, so it is untrusted DATA, as today.

- The new adapters read only these fields, each type-checked:
  - Jest: `testResults[].name`, `.status`, and `assertionResults[].{ancestorTitles, title, status, invocations,
failing}`;
  - `pharn-json`: `schema`, `suite_errors`, `tests[].{file, path, status}`.
- Failure messages, stacks and every other field are ignored. `failureMessages` is not read even for its length,
  which is deferred with `vitest-retry-pass-detect`.
- Ids, titles and files stay untrusted DATA in the record. A raw value in a reason goes through `shown()`, bounded at
  `SHOWN_CHARS`.
- Nothing is eval'd, spawned or compiled into a RegExp.
- The capture fixtures are sanitized to `/work/proj`, and the build greps them for the capture root, the username and
  the host before committing.

## Determinism audit (P5)

- Format dispatch is exact enum membership.
- Status mapping is `Map` membership.
- Key closure is set equality over `Object.keys`.
- The integer and boolean checks are type tests.
- Every fallback is a closed refusal, never a guess.

## Resolved at GATE 1 (2026-09-25)

1. **Which format(s) should this increment ship?** The human chose **A — `jest-json` + `pharn-json`**, and approved
   the plan as written. The rejected options were B (`jest-json` only), C (`pharn-json` only) and D (`junit-xml`,
   not recommended on measurement 6).

## Grill amendments (adopted at build, all inside `## Files`)

`GRILL.md` raised 9 advisory concerns. These are adopted; none changes the approved intent:

- **Measure `next/jest` (G-P6).** The build installs `next`, `react` and `react-dom` in the scratchpad and repeats
  measurement 5 under `next/jest` (SWC) for `require()` and `await import()`, before and after. The result is written
  into the guidance with its version. No fixture is added: the record's semantics do not depend on the transform.
- **The in-body import rule branches on the MODULE MODE (G-P5):**
  - under Jest's default CommonJS mode, `require()`;
  - under Jest's ESM mode, `await import()`;
  - either, when a transform rewrites `import()` (the measured setups are named).

  Decision d's single `require()` sentence is replaced by this rule wherever it lands.

- **`pharn-json` clean paths (G-P0).** `file` must be absolute, or a clean relative POSIX path: no leading `/` in a
  relative path, no `.`, `..` or empty segment, no backslash. Anything else is `results-malformed`, and the reason
  names the rule. Tests cover each rejected shape, with the clean path as the control.
- **The `jest` key in package.json (G-P0).**
  - README's Jest section says the key is not pinned by the test-infra pin, and recommends `jest.config.*`.
  - The contract's bound cites `test-infra-core.mjs`'s existing list.
  - Named follow-up: `test-infra-pin-package-jest-key`. It is not built here, because it changes the pin's
    axis and existing locks.
- **The ✧ closure's discriminating controls (G-P1, L60):**
  - `parseResults` accepts every member and throws for a non-member;
  - each member's evidence parses ok under its own format;
  - the vitest capture is REFUSED under `jest-json` (no `invocations`);
  - a Jest capture with `invocations` removed is refused.
- **Scratch hygiene (G-P6).** `.pharn/pharn-dev-plan/*.mjs` and the build's `.pharn/pharn-dev-build/` runner are
  deleted before `/pharn-dev-verify`, because eslint lints `.pharn/`.
- **The documentation bounds (the 3 minor findings), stated in README and the contract:**
  - the script recipe is POSIX-shell only;
  - the checked Jest versions are 29.7.0 and 30.5.2, and a report without `invocations` is refused;
  - Jest reads positional arguments as path patterns, and `--runTestsByPath` is its exact-path mode.

## GATE 2 fix round (2026-09-25, the human chose "fix, then commit + PR")

`REVIEW.md` raised 2 important and 8 minor advisory findings. Fixed inside `## Files` (one file added above):

- `shown()` becomes total: it can no longer throw on a parsed value such as `{"toString":1}`. A test is added per
  crash site (the `pharn-json` schema, and `readResultsConfig`'s format).
- The CHANGELOG motivation is corrected: `vitest-json` already read Jest's shape, without Jest's markers. The
  contract and README now say that a Jest project must use `jest-json` for the Jest refusals to apply. Named
  follow-up: `vitest-json-refuses-jest-shape`.
- The minors:
  - the open form for "the three reporter formats";
  - the unmeasured "older Jest" cause dropped;
  - the M39 and M13 surviving mutations killed;
  - the contract gains the path-pattern and POSIX-shell bounds;
  - the `gate-run-core.mjs` comment is bounded;
  - the `jest-junit` qualifier is restored.
- The unrecorded measurements are recorded in `REVIEW.md`, "Evidence recorded here".
