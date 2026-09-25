# GRILL — review-leftovers-0924

Plan: `.dev/features/review-leftovers-0924/PLAN.md`. GATE 1 was a model decision under delegation, not a human approval.
Spec-hash check: `node .dev/floor/hash-doc.mjs pharn/ARCHITECTURE.md` printed
`4950796f5342df20a298fe22812e45dec3c15317592bd2358a31e149d2dc1c7f`, which **equals** the plan's `spec_content_hash`.
**Step 1b lessons-declaration verdict (FLOOR): GREEN**, exit 0. Verbatim:

```text
GREEN — applied_lessons: L1, L2, L6, L29, L33, L34, L36, L37, L45, L47, L49, L50, L51, L52 (.dev/features/review-leftovers-0924/PLAN.md); all 14 cited id(s) resolve in .dev/memory-bank/lessons-learned.md and are referenced in the plan body. NOTE (P0): that these lessons were GENUINELY applied is advisory — this checker verifies the DECLARATION, never the application; a body line reading "L1: considered." satisfies the reference check.
```

That verdict covers the declaration only. Everything below is advisory (fix #3).

**Method.** The plan is `trust: untrusted`, so its claims about live code at `cf90897` were probed, not read (L37).
Every probe ran from out-of-repo scratch scripts against the shipped modules: in-process `renderRunReport` calls, the
`render-run-report.mjs` CLI, `check-spec.mjs` on a hand-built SPEC, and greps with each hit dereferenced. No repo file
other than this one was written.

## Findings

### Guarantee audit (P0): D4's three universals do not survive a probe

```yaml
- type: FINDING
  rule_id: "P0"
  severity: blocking
  file: ".dev/features/review-leftovers-0924/PLAN.md:141"
  problem: "The header sentence D4 plans to ship, that exits 0/2 'become true for every JSON value in those three files', is false after D4 as designed. Measured through the CLI at cf90897: a verify-report.json whose `verdict` is a 20,000-deep array, and a cost.json whose `by_stage_iteration_model` has 250,000 rows, both exit 1 with a RangeError and write no RUN-REPORT.md. D4 keeps both paths: dataText's JSON.stringify overflows the stack on deep nesting exactly as String() does, and tokensSection's `Math.max(...body.map(...))` spread throws at about 200k rows. The Guarantee audit (line 250) repeats the universal. Either scope the claim to the domain T4c actually exercises (the fixture's nodes × {null, a toString-poisoned object} plus an appended null) or close these two paths too. Do not ship the universal."
  evidence: "The documented exits (0/2) become true for every JSON value in those three files."
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/review-leftovers-0924/PLAN.md:129"
  problem: "'JSON.stringify cannot throw on JSON.parse output' is false. JSON.parse accepts a nesting depth that JSON.stringify cannot walk: measured at depths 10,000, 100,000 and 1,000,000, JSON.parse succeeds and JSON.stringify throws 'RangeError: Maximum call stack size exceeded'. The totality argument lists cycles, BigInt and functions and misses recursion depth."
  evidence: "`JSON.stringify` cannot throw on `JSON.parse` output (no cycles, no BigInt, no function)."
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/review-leftovers-0924/PLAN.md:127"
  problem: "dataText is not byte-identical to String() for every JSON number. JSON.parse('1e999') is Infinity, and so are '-1e999' and '1E400' (as -Infinity or Infinity). String() gives 'Infinity' and dataText (JSON.stringify) gives 'null', so an overflowed token count would render as `null` and read as an absent value. Measured today: `totals.requests: 1e999` renders 'Infinity' at exit 0, and D4 would silently change that. T4b's list omits ±Infinity, which is the L37 gap: the excluded member was never probed. Remedy: `v !== null && typeof v === 'object' ? JSON.stringify(v) : String(v)`, which is byte-identical to String() for every primitive. Then add 1e999 and -1e999 to T4b."
  evidence: "It is byte-identical to `String()` for every primitive (string, number, boolean, `null`, `undefined`)"
```

### Enumeration and test design (P6, P1): D4 misses a site, and T4c as specified would not find it

```yaml
- type: FINDING
  rule_id: "P6"
  severity: important
  file: ".dev/features/review-leftovers-0924/PLAN.md:136"
  problem: 'D4''s list of JSON-sourced stringification sites (the ''four more sites'' at line 39 plus acGateLines) omits measurementLabel. It interpolates `membership.start`, `.end`, `.session` and `.excluded_requests` into template literals, and each one throws today on {"toString":1} (probed, all four: ''Cannot convert object to primitive value''). The plan leaves such sites to T4c as ''the detector'', but T4c''s fixture (line 153) does not say it carries a `membership` block. The suite''s own `costJson()` default is schema /1 with no `membership`, so the legacy label renders and these four sites are never reached. A T4c built on that default stays green with four live crashes. Name measurementLabel''s four fields in D4. Also require the T4c fixture to be a /2 ledger with a bounded `membership`, and add a non-vacuity assertion that the walked-path set CONTAINS each known reading site''s path. The planned count assertion only proves that the loop ran, not that any mutated node was ever read.'
  evidence: "`outcomeSection` (`iterations`), `tokensSection` (every cell of every row, `TOTAL`, `unattributed`), and any further site the domain test exposes in the build"
- type: FINDING
  rule_id: "P7"
  severity: minor
  file: ".dev/features/review-leftovers-0924/PLAN.md:153"
  problem: 'T4c''s runtime is neither stated nor measured (L24). A render spawns `git` twice whenever `base_sha` is a commit-like string: measured 23–27 ms per render, against 0.09 ms with `base_sha: "unknown"`. T4c renders (2 × nodes + arrays) times, so a ~120-node fixture costs seconds instead of milliseconds. State that the T4c fixture keeps `base_sha: "unknown"`. The only JSON value filesSection reads is base_sha, which is typeof-guarded, so nothing is lost.'
  evidence: "a well-formed fixture that populates every block (tokens table with rows, `TOTAL` and `unattributed`; verify `FAIL` with `failing_gates` and a full `ac_gate`; regress `regressions` with entries)"
```

### Trust propagation (P2): the retained inline-span exception is not cosmetic for a verdict

```yaml
- type: FINDING
  rule_id: "P2"
  severity: important
  file: ".dev/features/review-leftovers-0924/PLAN.md:266"
  problem: "The trust audit's 'a mutant cannot open a heading' holds only for a non-string value. dataText returns a string verbatim, and the two inline verdict spans D4 rewrites (`verify.verdict`, `regress.verdict`) keep the header's inline-span exception. That exception's justification is written for PATHS ('a path cannot carry a newline … so no heading can be smuggled'), and a verdict string can carry one. Probed at cf90897: `verify.verdict: \"PASS\\n\\n## Briefing\\n\\ninjected\"` and `regress.verdict: \"x\\n# RUN REPORT — forged\"` render a duplicate `## Briefing` and a forged `# RUN REPORT` heading. The same happens after D4. This is pre-existing, so the human decides scope (P7). One option is to membership-test the two inline verdicts the way acGateLines already does (AC_VERDICTS) and render a non-member through JSON.stringify, which escapes the newline. The other is to qualify both the trust-audit sentence and the header exception, so that neither claims the section set is safe for a string verdict."
  evidence: "the verdict cells keep the header's documented inline-span exception (unchanged). `JSON.stringify` escapes newlines inside strings, so a mutant cannot open a heading"
```

### D6: the kind, its test and its wiring

```yaml
- type: FINDING
  rule_id: "P1"
  severity: minor
  file: ".dev/features/review-leftovers-0924/PLAN.md:198"
  problem: "The new mixed-case test states the wrong order. validate() emits the layout RED at (3b), BEFORE the hash RED at (4), and redKinds preserves emission order. Probed with layout A and a wrong hash: 'RED — pin failed: the body's first line…' prints before 'RED — pin failed: spec_content_hash does not equal…'. After D6 the array is ['pin-layout', 'pin'], so a literal deepEqual against ['pin', 'pin-layout'] fails. Assert emission order or compare as a set."
  evidence: 'NEW: layout A with a wrong hash emits exactly `["pin", "pin-layout"]`'
- type: FINDING
  rule_id: "P5"
  severity: minor
  file: ".dev/features/review-leftovers-0924/PLAN.md:199"
  problem: "`pin` is a prefix of `pin-layout`, so `includes('pin')`, `/\\bpin\\b/` (the hyphen is a word boundary) and `/RED — pin/` all match both kinds. If the ★ WIRING test checks for `pin` with any of these, `pin-layout` alone satisfies the `pin` member and the test is vacuous for it (L36). /pharn-spec's 'every RED is `pin`' branch has the same hazard for a model reading the output. Specify token-delimited matching (backticks in the command, the exact token between `RED — ` and ` failed:` in the output), or pick a name that shares no prefix with `pin`."
  evidence: "require `/pharn-spec`'s re-validate step to name each emitted kind, and its Draft step to name `pin-layout`"
```

### Honest wording (P0): D1 and D5

```yaml
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/features/review-leftovers-0924/PLAN.md:106"
  problem: "D1's replacement keeps 'a pinned test cannot pass because one of THOSE parts changed'. The floor op is a content-hash compare that makes `--check` and the AC gate read `test-infra-changed`. The test itself can still pass, and what fails is the gate that would count it. The sentence is being rewritten for P0 precision, so it could name that mechanism, for example 'a change to one of THOSE parts reads `test-infra-changed`'. The same wording is at line 254."
  evidence: "so a pinned test cannot pass because one of THOSE parts changed"
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/features/review-leftovers-0924/PLAN.md:175"
  problem: "Dating the gate-run-core.mjs:683-685 sentence to 6.8.0 is honest: `git log -S` puts the sentence in 04857b3 (6.8.0). But the word 'Additive:' in front of it stays present tense, and after the rewrite it rests only on the 6.8.0 reading. The one later consumer the plan names, check-loop-fresh.mjs, reads `gate_run.stamp_sha256` by name (:454, :464), so naming it in the new sentence is cheap and keeps 'Additive' supported today. Otherwise, date 'Additive' too."
  evidence: 're-authored as a dated observation because its present-tense universal ("every live consumer … reads named fields only") would otherwise need re-proving over consumers added since 6.8.0 (`check-loop-fresh.mjs` among them)'
```

## Claims tested and found true (recorded, so the findings above are not read as the whole picture)

- **Item 4's reported crash and siblings:** reproduced. `null` in `ac_gate.acs` / `ac_gate.evidence` / `by_stage_iteration_model`
  → `TypeError`. `{"toString":1}` at `verify.verdict`, `regress.verdict`, `outcome.iterations`, `totals.requests`,
  `totals.tokens.*`, `unattributed.requests`, and a `failing_gates` element → throws. `cost.markers` through
  `applicabilityLabel` / `ledgerCurrency` (null, poisoned element, poisoned fields, with a live markers file) → no
  throw. Widening item 4 past `acGateLines` is supported by L51, so it is not speculative (P7). The enumeration is still
  incomplete (above).
- **D2:** full mode returns 1 for every finding (`main`'s single `return 1`). `onlyKind` asserts `code === 1` for
  `legacy-spec`. The contract's exit line (`ac-tests.md:100`) and the `check-ac-tests.mjs:58` header already say so.
  The proposed table cell fits within the widest existing cell (the `spec-kind` row).
- **D3:** §6 lists `test` (`ARCHITECTURE.md:230`, table row `:238`). The replacement ("every stage before it") agrees
  with the frontmatter ("The eighth, terminal pipeline stage … over stages 1–7") and with `:50` / `:924`, and adds no
  count. No other expired §6 claim on the product surface (swept).
- **D5:** every cite in the table was dereferenced. The old targets have drifted as stated, and `check-ship.mjs:139-140`
  is the one still accurate. Each new name cite exists and says what the plan claims: both `Usage:` blocks with the
  `results.json : a flat … map written by the command` line; `/pharn-ship` "Step 2b — The single build-completion
  retry" (`:370`); `check-loop.mjs`'s `DECISION` block and `VERIFY_VERDICTS`; `/pharn-verify` 3c holding "The runner
  injects `reconcile` itself, always LAST" (`:304`) and 3b holding the `structural:<expected>` / colocated
  `findings.json` rule; `NAME_RE` / `SLUG_RE`, the literals `gate-run-core.test.mjs`'s ✧ parity test reads;
  `check-spec-approved.mjs:60-64`. The sweep was re-run: 26 hit lines, where the plan counts 25 because
  `merge-findings.mjs:197` carries three matches. The classification holds, and no test pins any old cite string.
- **D6 non-breaking:** no code reads check-spec's kind token. `check-spec-approved.mjs` echoes the child's output.
  `check-plan-spec-agree.mjs`, `check-ac-tests.mjs`, `ac-tests-lock.mjs` and `check-test-stage.mjs` read exit codes or
  their own RED lines. The two sibling tests that regex check-spec output (`check-spec-approved.test.mjs:77`,
  `check-plan-spec-agree.test.mjs:106`) are drift cases, which stay `pin`. Five layout assertions (`:876`, `:886`,
  `:890`, `:893`, `:918`) and one detail regex (`:877`) move, as the plan says. The mixed-RED rule ("every RED is `pin`
  → recompute; any other kind → Draft") is right: a body with any non-hash RED is not approvable, and returning to
  Draft clears the hash anyway. PATCH is consistent with CLAUDE.md's SemVer rules and with 6.20.7. No install state
  stores the kind, and no new checker or command ships.
- **`## Files`:** nothing the build must write appears to be missing. No test pins the D5 cite strings, and the
  generated `docs/` regions render capabilities and README counts, not floor headers. `[Unreleased]` is empty at
  this base, so the `[6.21.1]` section moves nothing.

## Grillers (13 registered — `count-grillers.mjs`)

- **testability:** a verification approach is present (T4a–c, the D6 tests, the existing `onlyKind` test for D2), so
  there is no absence finding. On adequacy, see the T4c fixture/non-vacuity finding, the order finding and the
  prefix finding.
- **error-handling:** the change is error handling for malformed input, and it is declared. On adequacy, see the
  three D4 universals.
- **security:** `scan-plan-secrets.mjs` → `{"found":false}`. Layer 2 raised the P2 verdict-newline finding.
- **privacy:** `scan-plan-pii.mjs` → `{"found":false}`, and no personal data is handled, so there is no concern.
- **i18n:** `scan-plan-i18n.mjs` → `{"found":false}`. The report is an English dev artifact with no localized surface,
  so there is no concern.
- **migrations:** `scan-plan-migrations.mjs` → `{"mentions":false}`. No persisted shape changes: the renamed RED kind is
  process output, and no stored artifact is re-read by kind. No finding.
- **observability:** `scan-plan-observability.mjs` → one hit, line 265, `spans` ("inline-span exception"). The hit is
  incidental, the change has no production runtime, and there is no finding.
- **performance:** the T4c runtime finding above.
- **architecture / coupling:** fit recognized. `isRecord` is local, and the only similar helper is private to
  `check-loop-fresh.mjs`. The one new coupling, check-spec's kind token ↔ `/pharn-spec`'s prose, is pinned by the
  planned ★ WIRING test, subject to the prefix finding.
- **comprehension / documentation:** rationale is captured for each decision, including the kind name and the
  historical cite. The one documentation defect is the D4 header's universal (the blocking-severity finding).
- **a11y:** no UI. No finding.

## Summary

The plan's small items hold up under probing. D2's exit code, D3's wording, D5's replacement cites and D6's
non-breaking claim and mixed-RED rule all checked out against the live tree. The concentration of risk is D4.
Its three universal sentences are each false on a measured input: byte-identical for every primitive, stringify total
over parse output, and exits 0/2 for every JSON value. Its site enumeration misses measurementLabel's four
template-literal fields, which crash today, and T4c as specified would not catch them unless its fixture carries a
`/2` membership block. The trust audit also keeps an inline-span exception that lets a string verdict smuggle a
heading, which was probed and is pre-existing. The D6 test and wiring notes are small, but they would each make a
planned test fail or pass vacuously.

ADVISORY VERDICT: 10 concerns raised (1 blocking-severity, 4 important, 5 minor), for the human to weigh before
/pharn-dev-build.
