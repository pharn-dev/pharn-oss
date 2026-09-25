# REVIEW — review-leftovers-0924 (6.21.0 → 6.21.1)

- increment: the six leftovers from the 2026-09-24 review, as one PATCH (`SKILLS_VERSION` 6.21.1). Under review:
  the UNCOMMITTED working-tree diff against HEAD `cf90897` (15 files, `git diff HEAD --stat`: +521 / −78) and this
  feature's records (`PLAN.md` with its "Post-grill amendments", `GRILL.md`, `BUILD.md`, `REGRESSION.md`,
  `VERIFY.md`).
- reviewer: an independent `/pharn-dev-review` run that did not write the code. The increment is `trust: untrusted`:
  every claim below was probed by executing it where it could be (L37), from scratch copies outside the repo. No
  instruction-looking content addressed to the reviewer was found in the diff or the feature records (L-trust).
- finding object (fix #1): `type`, `rule_id`, `severity` and `file` are the enum-gated fields. `problem` and
  `evidence` are free text, carried as DATA.

## Step 0 / Step 1 — scope, then floor (the only guaranteed part of this review)

- **Step 0:** `node .claude/hooks/set-writes-scope.cjs --from-frontmatter .claude/commands/pharn-dev-review.md --target .dev/features/review-leftovers-0924/REVIEW.md`
  → exit 0, `scope = [".dev/features/review-leftovers-0924/REVIEW.md"]`.
- **Step 1 (floor):** `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 36 capabilities checked in "."`, **exit 0**.

Further gates run by this review, for the record (none of them is this command's verdict):

| command                                                                                  | exit | result                                                                            |
| ---------------------------------------------------------------------------------------- | ---- | --------------------------------------------------------------------------------- |
| `npm test`                                                                               | 0    | 3289 / 3289 pass                                                                  |
| `node --test` over the six touched/adjacent suites                                       | 0    | 426 / 426 (render-run-report, check-spec, check-ac-tests, check-spec-approved, …) |
| `npm run check:changelog`                                                                | 0    | GREEN — newest section `[6.21.1]` matches `SKILLS_VERSION`                        |
| `npm run check:changelog-entry`                                                          | 0    | GREEN — 2 new entries, no merged entry or released heading changed                |
| `node .dev/floor/check-version-badge.mjs .`                                              | 0    | GREEN — badge `6.21.1`                                                            |
| `npm run docs:check`                                                                     | 0    | CATALOG + LESSONS-INDEX GREEN                                                     |
| `npx prettier --check --ignore-unknown <the 15 changed files>`                           | 0    | clean                                                                             |
| `npx eslint <the 8 changed .mjs files>` / `npx markdownlint-cli2 --no-globs <the 6 .md>` | 0/0  | clean / 0 issues                                                                  |

**Floor-gate findings: none.** No P0 guarantee is claimed without a floor reduction or an advisory label, no
capability or `rule_id` moved (validate agrees: L-eval has nothing to bind), and no sibling reference was added.
Everything below is **advisory**.

## Advisory findings (7, all minor)

### L-floor (P0) — three quantified sentences are wider than what they rest on

```yaml
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "pharn/pharn-contracts/ac-tests.md:226"
  problem: "The rewritten pin sentence (D1 as amended by G9) says a change to a pinned part reads `test-infra-changed` at `--check`, but `ac-tests-lock.mjs --check` never prints that token. PROBED: `grep test-infra-changed pharn/floor/ac-tests-lock.mjs` finds nothing; pinReds() (ac-tests-lock.mjs:462) emits `test infrastructure changed — <detail>`, which ac-tests-lock.test.mjs:543-553 pins, and check-test-stage.mjs reports that RED as `lock-red`. `test-infra-changed` is only the AC gate's EVIDENCE reason (ac-gate-core.mjs EVIDENCE_REASONS). The same section's migration paragraph already says it correctly: '(`lock-red`, `test-infra-changed`)'. This sentence was rewritten for P0 precision and now names a token that one of its two sites does not emit. Suggested wording: '…reads `test infrastructure changed` at `--check` (`lock-red` at the test-stage gate) and `test-infra-changed` at the AC gate…'."
  evidence: "so a change to one of THOSE parts reads `test-infra-changed` at `--check` and at the AC gate, and the test's pass no longer counts"
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "CHANGELOG.md:36"
  problem: 'Three claims in the [6.21.1] entry go beyond what the diff shows. (a) ''Every value the renderer reads … now goes through one helper, dataText'' is false as written: the typeof-string-guarded values render without it (outcome decision, blocked, base, command, skills_version, coverage; coverage_note; ac_gate.reason and .note; member verdicts). That is harmless, because they are strings. (b) ''A suite test walks every field of the three inputs'' drops the bound the renderer''s header states (''a field no fixture carries is not mutated''). The test walks the nodes of ONE fixture, which has no `markers`, no `outcome.blocked`, no open or unknown membership, no `coverage: unavailable`, no `/pharn-ship` applicability branch and no live markers file. (c) The ''five more sites'' list omits the `failing_gates` element, which also threw at 6.21.0. PROBED with a 7-variant walk that covers those branches: every node was replaced by null, by {"toString":1} and by a newline-bearing string, 1965 renders in all. The new renderer gives 0 throws and 0 fence-aware heading smuggles. HEAD''s renderer gives 42 distinct throw paths, `verify-report.json:failing_gates.N` among them, plus 3 smuggles. The code is right, and the entry overstates the test. The CHANGELOG is append-only once merged, so fix it before merge.'
  evidence: 'Every value the renderer reads from `cost.json`, `verify-report.json` or `regression-report.json` now goes through one helper, `dataText`. … A suite test walks every field of the three inputs and replaces each with `null` and with `{"toString": 1}`; each mutant must render.'
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "pharn/floor/render-run-report.mjs:70"
  problem: "The new header paragraph repeats the literal universal from finding 2(a), 'every JSON value this file renders goes through dataText()'. Type-guarded strings do not. Also, the narrowed EXCEPTION ('ONE kind of untrusted value is rendered as an INLINE CODE SPAN … a FILE PATH') is true only for UNGATED values. Gated untrusted values are also rendered inline, and the header's parenthetical names only the verdict: `base_sha` after COMMIT_RE (three inline spans in filesSection, documented only at COMMIT_RE's own comment), commandLabel, and the AC gate's verdict. PROBED: fence-aware heading extraction over every node × a newline string, 7 fixture variants, found 0 smuggles, so the property holds under the 'ungated' reading. The sentence should say that reading. The ★ F1 test (render-run-report.test.mjs:1095) now pins the unqualified 'ONE kind' text."
  evidence: "So every\n// JSON value this file renders goes through dataText(), and every array of entries is guarded element by\n// element"
```

### L-eval (P1) — two ★ tests can pass on the defect they are named for

```yaml
- type: FINDING
  rule_id: "P1"
  severity: minor
  file: "pharn/floor/render-run-report.test.mjs:791"
  problem: 'The DOMAIN CLOSURE test''s title claims ''no mutant becomes structure'', but its mutant alphabet is {null, {"toString":1}, appended null}, and none of those can carry a newline, so its heading assertions cannot fail for any mutant at any site. PROBED in a scratch copy: I re-opened the G5 hole (verdictLines renders ANY string verdict inline), and DOMAIN CLOSURE still passed. Only the separate hand-picked two-value G5 test failed. The crash half does discriminate: PROBED against HEAD''s renderer with a dataText shim, DOMAIN CLOSURE fails and so does the reported-case test. Also, the suite''s headings() is line-based and counts a `## ` line inside a fence, so adding a newline mutant needs a fence-aware check. My probe shows the new renderer passes that stronger walk, so the strengthening is free. The alternative is to drop ''no mutant becomes structure'' from the title.'
  evidence: "every render completes, and no mutant becomes structure"
- type: FINDING
  rule_id: "P1"
  severity: minor
  file: "pharn/floor/check-spec.test.mjs:926"
  problem: "The ★ WIRING test never asserts that its slice anchors were found. If `## Step 4 — Render` is renamed, indexOf returns -1 and the Draft slice runs to the file's last character. That picks up `kind-in-body` from the re-validate step, and the only non-vacuity check is `length > 0`. PROBED (scratch copy, real test): heading renamed and `kind-in-body` removed from the Draft step → PASS (M1); the same removal with the heading intact → FAIL (M1b, control). The test also checks that a token is PRESENT, not which branch names it. PROBED: moving `kind-in-body` into the 'every RED is `pin` → recompute' branch passes (M2), which is the exact routing D6 exists to prevent. The title says 'name exactly the kinds', and the body checks inclusion. Assert both anchors are !== -1, and require `kind-in-body` in the 'any RED has another kind' sentence and absent from the `pin`-only one."
  evidence: 'const draftStep = cmd.slice(cmd.indexOf("Each RED names its kind"), cmd.indexOf("## Step 4 — Render"));'
```

### L-trust (P2) / process (P6) — the unplanned `base_sha` guard

```yaml
- type: FINDING
  rule_id: "P6"
  severity: minor
  file: "pharn/floor/render-run-report.mjs:538"
  problem: "The COMMIT_RE guard is a build-time addition outside the approved plan's text. BUILD.md records it and flags it, and GATE 2 should ratify it explicitly. The fix itself is correct and complete. PROBED: with base_sha `--output=<file>`, HEAD's renderer made git WRITE that file and the new renderer does not; no other git call in the module takes a JSON value, and no other product-floor git call takes one either (grep). It is compatible with both documented callers: /pharn-loop and /pharn-ship pass `git rev-parse HEAD … || echo unknown` (pharn-loop.md:493, pharn-ship.md:690). But it narrows the accepted domain relative to the ledger contract (`cost-ledger.md`: `<sha | unknown>`; check-cost-ledger checks presence only). PROBED: a short SHA, `HEAD`, or uppercase hex rendered a real diff at 6.21.0, and each now renders 'n/a — not a full commit id' over a ledger check-cost-ledger calls GREEN. The CHANGELOG bullet does not say that a previously working input now degrades."
  evidence: "if (!COMMIT_RE.test(base)) {\n    return na(\"`base_sha` is not a full commit id (40 or 64 lowercase hex), so it is never handed to git and no diff is computed\");"
```

### L-axis (P3) / P4 — one restated enum

```yaml
- type: FINDING
  rule_id: "P4"
  severity: minor
  file: "pharn/floor/render-run-report.mjs:658"
  problem: "VERIFY_VERDICTS and REGRESS_VERDICTS restate check-loop.mjs:91-92, the same sets as check-ship.mjs:55. That makes a third copy, with no parity test (none exists for the older AC_VERDICTS either). Drift fails SAFE: a new valid verdict would render `unknown` with the value fenced as DATA, visibly. So this is low priority, but it is exactly the copy-set a ✧ parity test is for in this codebase."
  evidence: 'const VERIFY_VERDICTS = new Set(["FAIL", "INCOMPLETE", "INCONCLUSIVE", "PASS"]);'
```

## Claims probed and found TRUE (so the findings are not read as the whole picture)

- **`dataText` never throws and is byte-identical to `String()` for primitives.** It holds by construction: every
  non-object goes through `String()`, and only a non-null object reaches the guarded `JSON.stringify`. T4b covers
  13 primitives, ±Infinity among them. Across the 1965-render walk the new renderer never threw. The 20,000-deep
  value renders the fixed marker.
- **Every JSON-sourced site in the WHOLE file**, including the ones the task named, is safe. `ledgerCurrency`
  reads `cost.markers` only through `normalizeMarkers` (numeric `seq`, typed fields). `applicabilityLabel` and
  `verdictApplicability` use closed reason strings plus integers. `outcomePreamble` and `commandLabel` use
  typeof/regex gates. `filesSection` renders git paths (the accepted exception) and a `base_sha` gated by
  COMMIT_RE. The walk above exercised `/pharn-ship` applicability, a live markers file, a stale ledger, open and
  unknown membership, `coverage: unavailable` and a `/1` ledger.
- **Well-formed reports render as before.** Only three things changed: non-member verdicts, a non-full-SHA
  `base_sha` (finding 6), and a bare `±Infinity` element of `regressions[]` (now `Infinity` rather than `null`).
- **D6.** Probed with a hand-built legacy SPEC: `check-spec.mjs` emits
  `section`, `kind-in-body`, `pin` in that order for a layout-A body with a wrong hash, exit 1. `pin` is emitted
  only at check-spec.mjs:356/358. `kind-in-body` shares no substring with `pin`. No other consumer reads check-spec's
  kind token. A repo-wide grep (commands, contracts, CLAUDE.md, README, docs/, the trusted docs) finds only
  `/pharn-spec` and historical CHANGELOG entries. `check-ac-tests.mjs`'s own `pin` and `spec-kind` are unchanged.
  The re-validate rule (every RED `pin` → recompute; any other kind → Draft) routes a mixed RED correctly. The
  Draft step's "`pin` cannot fire on a Draft" is true, because (4) runs only when `Approved`.
- **D5.** All fifteen HEAD cites were counted (2+3+2+1+7). A sample was dereferenced at HEAD and has drifted, for
  example `check-verify.mjs:60-65` is now TRUST text and `render-run-report.mjs:97` is a blank line;
  `check-ship.mjs:139-140` is still accurate. Every new name cite resolves:
  - both `Usage:` blocks' `results.json : a flat … map written by the command`
  - `/pharn-ship` "Step 2b — The single build-completion retry"
  - `check-loop.mjs` DECISION + `VERIFY_VERDICTS`
  - `/pharn-verify` 3b and 3c, and the 3c text "The runner injects `reconcile` itself, always LAST"
  - `NAME_RE` / `SLUG_RE`
  - `check-loop-fresh.mjs:455` reading `gate_run.stamp_sha256`

  The dated claims check out: `gateRunBlock` came in `04857b3` (6.8.0), `check-loop-fresh.mjs` in `1a8b027`
  (6.10.0), and §6 gained `test` in `b31e540` (6.20.2).

- **D2 / D3.** Full mode's `legacy-spec` exits 1: `onlyKind` asserts `code === 1`, and the contract's own exit line
  agrees. The `/pharn-ship` §6 sentence agrees with its frontmatter ("over stages 1–7"). No other expired §6 claim
  was found on the product surface.
- **Runtime.** DOMAIN CLOSURE ran in 0.3–0.5 s. The size test ran in 1.3–1.5 s uncontended (BUILD.md says
  ~0.9 s) and 5.7–6.9 s next to a concurrent `npm test`. The renderer suite ran in 4.2 s.
- **SemVer: PATCH is right.** Every change corrects bytes that already shipped. The new RED kind is not a new
  checker or capability, no install stores the token, and an old `/pharn-spec` paired with the new checker still
  routes `kind-in-body` to "any other kind", which means Draft. This is consistent with 6.20.7, which added the
  layout RED as a PATCH. `MIN_CLI` stays 0.5.0 correctly: no installed path moves.

## Verdict

**GREEN — 0 floor-gate findings.** 7 advisory findings, all minor. The code changes hold up under probing. What
needs fixing is wording (findings 1–3), two ★ tests that can pass on the defect they are named for (findings 4–5),
one unplanned but sound guard that needs explicit ratification and disclosure (finding 6), and one unpinned enum
copy (finding 7).

## Proposed lesson candidate (NOT written to canon — `/pharn-dev-memory-promote` decides, behind its human gate)

- **id:** L60 (next free id in `.dev/memory-bank/lessons-learned.md`, whose last heading is L59)
- **title:** A non-vacuity proof is per ASSERTED PROPERTY, not per loop. A mutant alphabet that cannot violate a
  property, or an anchor that was never found, makes that assertion unfalsifiable while the count still passes.
- **type:** process · **concepts:** [non-vacuity, test-blindspot, false-green, mutation-testing]
- **body (draft):** This increment cited L34, L36 and L52 and got both of their lessons right: the DOMAIN CLOSURE
  walked the full set and counted its renders. Two ★ tests still passed with the defect they are named for
  re-introduced. (1) The closure asserts 'no mutant becomes structure', but its mutants (`null`,
  `{"toString":1}`) cannot carry a newline. Re-opening the verdict-inline hole left it green. (2) The WIRING test
  slices by `indexOf(anchor)`. An anchor that is not found returns -1, the slice widens to the end of the file, and
  the presence check passes on text from another step. L34 asks "is the set non-empty"; the missing question is
  "could any input in this test have made THIS assertion fail?" Remedy: give each asserted property its own
  negative control (a mutant or edit that must turn it red), and assert every anchor is found.
- **provenance:** feature `review-leftovers-0924`; commit `cf90897` (the base; the reviewed increment is
  uncommitted); source `.dev/features/review-leftovers-0924/REVIEW.md` findings 4 and 5, both reproduced in scratch
  copies; date 2026-09-25.
- **why it is real and not hypothetical (P7):** two measured passes-on-the-defect in one increment that explicitly
  cited the neighbouring non-vacuity lessons.
