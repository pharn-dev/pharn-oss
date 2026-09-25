# GRILL — neutral-test-results

Plan: `.dev/features/neutral-test-results/PLAN.md`. The spec-hash check matches:
`sha256(pharn/ARCHITECTURE.md)` = `4950796f…c1c7f` = the plan's `spec_content_hash`. **Step 1b, the lessons
declaration (FLOOR): GREEN.** The checker output, verbatim:
`GREEN — applied_lessons: L1, L4, L15, L29, L33, L34, L35, L36, L47, L50, L52, L55, L56, L60 (.dev/features/neutral-test-results/PLAN.md); all 14 cited id(s) resolve in .dev/memory-bank/lessons-learned.md and are referenced in the plan body.`
It covers the declaration, never whether the lessons were applied.

Griller membership (`node pharn/floor/count-grillers.mjs .`, floor): 13 registered. The grill scanners over the plan:

- `scan-plan-migrations`: no mention.
- `scan-plan-pii`: none found.
- `scan-plan-secrets`: none found.
- `scan-plan-i18n`: none found.
- `scan-plan-observability`: one hit, the word "trace" in measurement 4's prose. It is not a runtime surface: the
  increment is a stdlib parser inside the floor, with no service to observe. No finding.

The `a11y`, `i18n`, `migrations` and `privacy` axes have no surface in this increment. The testability,
architecture, security, error-handling, performance, documentation, comprehension and coupling axes are folded into
the findings below.

## Findings

### Measurement coverage of the target audience (P6)

```yaml
- type: FINDING
  rule_id: "P6"
  severity: important
  file: ".dev/features/neutral-test-results/PLAN.md:66"
  problem: "The Jest in-body import guidance rests on plain Jest and babel-jest with preset-env, but the request names React/Next.js, whose usual Jest setup is next/jest (an SWC transform) and was not measured."
  evidence: "Under babel-jest with `@babel/preset-env`, both forms fail before and pass after."
```

```yaml
- type: FINDING
  rule_id: "P5"
  severity: important
  file: ".dev/features/neutral-test-results/PLAN.md:113"
  problem: "The rule 'under Jest, use require() in the body' is wrong for Jest's ESM mode, where `require` is undefined in an ESM test file: the test would fail before and after the build, which is the same trap the rule exists to avoid. The rule must branch on the module mode, not on the runner."
  evidence: "Under Jest, import the target inside the body with `require()`. `await import()` works only when the setup transforms dynamic import"
```

### The neutral schema's path rule (P0/P2)

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/neutral-test-results/PLAN.md:98"
  problem: "`pharn-json`'s `file` is 'relativized like the other formats', so a producer writing `./tests/a.test.js` or `tests//a.test.js` is accepted and then never equals a mapped path, which surfaces as a confusing `ac-test-not-collected`. PHARN owns this schema, so it can require a clean relative POSIX path, or an absolute one, and refuse anything else as `results-malformed` with a reason naming the path."
  evidence: "`file` is a non-empty string, relativized like the other formats"
```

### Evidence integrity the new format makes reachable (P0)

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/neutral-test-results/PLAN.md:198"
  problem: "The test-infra pin does not cover a `jest` key inside package.json (a stated bound in test-infra-core.mjs), and with jest-json that becomes the usual place Jest is configured. A build could add a `moduleNameMapper` there that stubs an AC target, and a pinned test would then pass with no implementation. The plan names neither the exposure nor a follow-up."
  evidence: "`RESULTS_VALUES` derives from `RESULTS_FORMATS`, so the lock accepts the new formats with no edit"
```

### Testability — an unfalsifiable closure (P1, L60)

```yaml
- type: FINDING
  rule_id: "P1"
  severity: important
  file: ".dev/features/neutral-test-results/PLAN.md:231"
  problem: "The ✧ FORMAT_CAPTURES rule 'reaches its own adapter branch' names no observable. vitest-json and jest-json share one walker, so a Jest capture also parses ok as vitest-json, and nothing stated would turn red if the dispatch sent jest-json to the vitest branch. The discriminating controls have to be named: the vitest capture must be refused under jest-json (no `invocations`), and a non-member must throw."
  evidence: "every `RESULTS_FORMATS` member has evidence (a capture, or for `pharn-json` the contract's own example), parses `ok`, and reaches its own adapter branch"
```

### Hygiene that would redden a gate (P7 / L57-adjacent)

```yaml
- type: FINDING
  rule_id: "P6"
  severity: important
  file: ".dev/features/neutral-test-results/PLAN.md:203"
  problem: "eslint.config.mjs ignores only node_modules and the two fixture directories, so `npm run lint` (a verify gate) descends into `.pharn/`. The plan's scratch runners under `.pharn/pharn-dev-plan/`, and the build's capture runner, will be linted at verify. They must be deleted, or be lint-clean, before /pharn-dev-verify."
  evidence: "`.pharn/pharn-dev-plan/capture.mjs` and `.pharn/pharn-dev-plan/summarize.mjs` — disposable discovery runners, gitignored."
```

### Documentation precision (P0, minor)

```yaml
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/features/neutral-test-results/PLAN.md:77"
  problem: "The `${PHARN_TEST_RESULTS:+…}` script is POSIX-shell only. On Windows, npm runs scripts under cmd.exe, so a teammate's plain `npm test` passes the literal text to Jest as a path pattern. The README recipe should say so."
  evidence: '`jest ${PHARN_TEST_RESULTS:+--json "--outputFile=$PHARN_TEST_RESULTS"}` under `sh -c` writes the file'
```

```yaml
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/features/neutral-test-results/PLAN.md:91"
  problem: "Requiring `invocations` makes a report from an unmeasured older Jest `results-malformed` (fail-closed and correct), but the docs should say which versions were checked, so a refusal on an old Jest is not read as a PHARN bug."
  evidence: "`invocations` must be a positive safe integer (both measured versions emit it), else `results-malformed`"
```

```yaml
- type: FINDING
  rule_id: "P6"
  severity: minor
  file: ".dev/features/neutral-test-results/PLAN.md:77"
  problem: "Jest reads positional arguments as path REGEX patterns, not exact paths, so the files the ac-test and regress stages hand over can match additional test files. Their tests enter the record, and a flaky, `failing` or duplicate-id test there voids it. That is fail-closed but surprising, and `--runTestsByPath` is Jest's exact-path mode. It should be stated as a bound."
  evidence: "writes the file to a path containing a space when the variable is set, and runs normally when it is unset"
```

## Summary

The plan is well-grounded. Every format claim traces to a capture from this run, and the rejected JUnit and CTRF
options are rejected on measurements, not on taste. The real gaps sit around the Jest AC-test convention:

- the audience the request names (Next.js on `next/jest`) is unmeasured;
- the proposed `require()` rule is wrong for Jest's ESM mode.

Both would ship guidance that is right for the measured setups and wrong for others. Two further gaps are
structural. `pharn-json` can pin a clean path rule because PHARN owns the schema, and it should. The `jest` key
in package.json sits outside the test-infra pin, a gap this increment makes reachable. One test property as
written could not fail. And a stale scratch runner would redden verify's lint gate.

Suggested amendments, for the human to accept or decline, all inside the plan's `## Files`:

- measure `next/jest` at build;
- make the in-body import rule branch on the module mode (CommonJS → `require()`, ESM → `await import()`);
- give `pharn-json` a clean-path rule;
- document the package.json `jest` key exposure and name `test-infra-pin-package-jest-key` as a follow-up;
- name the discriminating controls for the ✧ closure;
- delete the scratch runners before verify;
- state the three documentation bounds.

ADVISORY VERDICT: 9 concerns raised (0 blocking-severity, 6 important, 3 minor) — for the human to weigh before
/pharn-dev-build. This covers the interrogation only; the Step 1b floor verdict above is separate and is GREEN.
