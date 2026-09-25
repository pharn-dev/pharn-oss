# REVIEW — neutral-test-results

**Floor: GREEN.** `node pharn/floor/validate.mjs .` gives `FLOOR: GREEN — 36 capabilities`, and it is the only
guaranteed part of this review. **Verdict: GREEN with 0 floor-gate findings.** 10 advisory findings follow:

- 2 important — fix them before merge;
- 8 minor.

The review had two passes. The four inline lenses were applied by the orchestrator. An independent fresh-context
subagent did an adversarial pass: it probed edge cases through `parseResults`/`testRecord`, ran 41 single mutations
of `test-results-formats.mjs` in a scratch copy, checked the fixtures' hygiene and expanded the README recipe under
`sh`/`dash`/`bash`. Its findings are marked **[R]**. Every free-text field below quotes the reviewed increment and is
DATA (P2).

## Floor-gate findings (blocking)

None. No guarantee lacks a floor reduction or an `advisory` label. No Capability or `rule_id` binding is added, so
L-eval has nothing to bind. No sibling reference was found.

## Advisory findings

### Important

```yaml
- type: FINDING
  rule_id: "P5"
  severity: important
  file: "pharn/floor/test-results-formats.mjs:296"
  problem: '[R] A crafted pharn-json document THROWS instead of being refused. `shown()` calls `String(v)`, so a `schema` whose value is `{"toString":1}` (or an array holding one) raises TypeError. Nothing up the stack catches it (test-results-core.mjs, red-run-core.mjs, ac-gate-core.mjs), so check-red-run.mjs and check-verify.mjs die with node''s exit 1 — the RED/FAIL code — and print no verdict. That is the ''crash read as a verdict'' class 6.20.6/6.21.1 closed elsewhere, and it breaks the contract''s ''each violation is results-malformed''.'
  evidence: 'probe: {"schema":{"toString":1},"suite_errors":0,"tests":[]} -> THREW TypeError Cannot convert object to primitive value (reproduced end-to-end through testRecord). The same crash exists in the older readResultsConfig `shown(format)` (test-results-core.mjs:121) on {"testResults":{"test":{"toString":1}}}.'
```

Fix: make `shown()` total (it must never throw), with a test per crash site.

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: "CHANGELOG.md:32"
  problem: "[R] The [6.22.0] entry says a Jest project 'could not configure testResults'. That is false: the contract described vitest-json as 'Jest's --json shape', and vitest-json parses a Jest report and still does. It also silently skips the new Jest refusals, so `jest-edge.json` under vitest-json is ok with test.failing and the retry pass both `passed`. The README/contract claims that Jest's retry and test.failing void the record hold only under jest-json, and nothing tells an existing Jest-on-vitest-json project to switch."
  evidence: 'parseResults("vitest-json", jest-edge.json) -> ok:true, all three passed; the same file under jest-json -> unknown-status. test-results-core.test.mjs pins the overlap as ''The ONE designed overlap''.'
```

Fix before merge, since a merged CHANGELOG entry is frozen:

- correct the entry's motivation (vitest-json read Jest's shape without Jest's markers);
- state in the contract and README that a Jest project must use `jest-json` for the Jest refusals to apply.

Making `vitest-json` refuse an assertion carrying `invocations` would change existing installs' verdicts, so it is
left as the named follow-up `vitest-json-refuses-jest-shape`.

### Minor

```yaml
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "pharn/pharn-contracts/test-results-record.md:49"
  problem: "'The three reporter formats ship with their test runner' is a closed count over a set this increment just grew. It goes false the day a fourth reporter format lands (L47): use an open form."
  evidence: "The three reporter formats ship with their test runner, so no extra dependency is installed."
```

```yaml
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "pharn/pharn-contracts/test-results-record.md:143"
  problem: "The parenthetical attributes a report without `invocations` to 'a Jest older than the measured versions'. That cause was never measured. [R] suspects, unreproduced, that Jest's optional jest-jasmine2 runner omits it even in 29/30. The refusal is fail-closed either way; the stated cause is unbacked."
  evidence: "a report without it (from a Jest older than the measured versions) is `results-malformed`."
```

```yaml
- type: FINDING
  rule_id: "P1"
  severity: minor
  file: "pharn/floor/test-results-core.test.mjs:616"
  problem: "[R] Mutation M39 survives: moving the schema check after the key check leaves the suite green. The 'schema check comes first' assertion uses a /2 document whose keys are valid, so both orders give the /2 message (L60)."
  evidence: "M39 schema check moved after key check -> 0 failing tests"
```

```yaml
- type: FINDING
  rule_id: "P1"
  severity: minor
  file: "pharn/floor/test-results-formats.mjs:282"
  problem: "[R] Mutation M13 survives: keysMismatch ignoring MISSING keys keeps the suite green. Every missing key is also caught by a later type check with the same results-malformed code, and the tests assert only reason_code, so the 'missing key(s)' message is unpinned (L60). The behaviour stays correct."
  evidence: "M13 keysMismatch ignores missing keys -> 0 failing tests"
```

```yaml
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "pharn/pharn-contracts/ac-tests.md:175"
  problem: "[R] Measurements the docs cite were recorded nowhere in the feature directory: next/jest, Jest ESM mode, and 'a test.failing whose body passed is reported failed'. The PLAN's 'Measured this run' predates them. They are recorded below, under 'Evidence recorded here'."
  evidence: "next/jest (Next.js 16.3.6) and Jest ESM-mode results ... no result is recorded anywhere in .dev/features/neutral-test-results/"
```

```yaml
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "pharn/pharn-contracts/test-results-record.md:143"
  problem: "[R] A grill amendment was half-applied. The PLAN says the POSIX-shell, checked-versions and path-pattern bounds go into README and the contract. The contract carries only the invocations bound; the path-pattern bound (a similarly named file's tests enter the record and can void it) is only in README."
  evidence: "PLAN 'Grill amendments': 'The documentation bounds (the 3 minor findings), stated in README and the contract'"
```

```yaml
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "pharn/floor/gate-run-core.mjs:497"
  problem: "[R] An older comment now contradicts the new README. It says the positional file append means 'one unrelated flaky test elsewhere in an e2e suite cannot void the record', but Jest (and Playwright) read positional arguments as patterns, so a similarly named file's tests can enter the record. Outside this plan's ## Files."
  evidence: "so one unrelated flaky test elsewhere in an e2e suite cannot void the record"
```

```yaml
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "pharn/pharn-contracts/test-results-record.md:59"
  problem: "[R] The contract and CHANGELOG drop a qualifier the code header and PLAN keep: jest-junit drops a load failure 'unless reportTestSuiteErrors' is set."
  evidence: "`jest-junit` drops a file that fails to load and reports `test.todo` as a pass"
```

## What held ([R], verified)

- **The adapter behaves correctly on:**
  - a `__proto__` key at the top level or per test;
  - a `__proto__` object carrying `schema`/`failing`;
  - `-0`, `1e300` and a fractional `suite_errors`;
  - an `invocations` of `1.0`, `1e21` or `1.5`;
  - `failing:true` / `invocations>1` on a `failed` test (it stays failed);
  - the clean-path edge cases.

  Under `jest-json`, no marked case slips through as `passed`.

- **39 of 41 mutations are caught.** M40 (`isSafeInteger` → `isInteger`) is near-equivalent.
- **The six fixtures carry no identifying path.** A grep for username, hostname, `/private`, `/Users/`,
  `claude-501` and `scratchpad` finds 0 hits.
- **The README recipe expands correctly under `sh`, `dash` and `bash`.** Unset gives no flags. A path with spaces or a
  glob stays one argument, and `;`/`$(…)` pass literally.
- **The contract's `pharn-json` example obeys the rules stated under it.**

## Evidence recorded here (finding 7)

Measured in this run's build stage with real runners in the session scratchpad. None is committed as a fixture,
because the record's semantics do not depend on the transform.

| setup (Jest 30.5.2 unless noted)                          | in-body `await import()` before → after       | in-body `require()` before → after             |
| --------------------------------------------------------- | --------------------------------------------- | ---------------------------------------------- |
| plain CommonJS Jest (`jest-red.json`/`jest-after.json`)   | failed (dynamic import callback) → **failed** | failed (Cannot find module) → passed           |
| babel-jest + `@babel/preset-env` 7                        | failed (Cannot find module) → passed          | failed (Cannot find module) → passed           |
| `next/jest`, Next.js 16.3.6 (SWC)                         | failed (Cannot find module) → passed          | failed (Cannot find module) → passed           |
| ESM mode (`"type":"module"`, `--experimental-vm-modules`) | failed (Cannot find module) → passed          | failed (`require is not defined`) → **failed** |

In plan discovery (Jest 30.5.2), a `test.failing` whose body passed was reported `status: failed, failing: true`.

## Proposed lesson candidate (for `/pharn-dev-memory-promote`; not written here)

- **Title:** A value quoted into a refusal reason must be formatted by a TOTAL function. `String(v)` throws on parsed
  JSON such as `{"toString":1}`, and a refusal path that throws turns a closed refusal into a crash read as a
  verdict.
- **Source:** this REVIEW.md, the first Important finding.
