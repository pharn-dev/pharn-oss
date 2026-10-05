# GRILL — gate-exclusion-config

Plan: `.dev/features/gate-exclusion-config/PLAN.md`. Spec-hash check: `node .dev/floor/hash-doc.mjs pharn/ARCHITECTURE.md`
→ `d831d30d399a37dc403080072763d13383de6f6f31875e7e8cb4eadeb642f4f4`, equal to the plan's `spec_content_hash` (no
drift). **Step 1b (FLOOR):** `node pharn/floor/check-plan-lessons.mjs .dev/features/gate-exclusion-config/PLAN.md
.dev/memory-bank/lessons-learned.md` → exit **0** (`GREEN — applied_lessons: L6, L15, L29, L34, L35, L36, L41, L43, L62,
L64, L65 … all 11 cited id(s) resolve … and are referenced in the plan body`).

**How this grill was run (recorded, advisory).** An independent, read-only Opus agent with a fresh context interrogated
the plan against the live code at `947bdad`. It wrote nothing and ran no setter. It reported that the build had started
in the worktree while it ran; it judged the plan against the HEAD code and spot-checked the in-progress diff only for
G8. The builder wrote this file from its report. The agent's free text below inherits the plan's untrusted tag and is
quoted as DATA (P2). The 13 registered grillers (`node pharn/floor/count-grillers.mjs .`) were applied by axis. The
five scanner-backed ones were run over the plan: `scan-plan-i18n` / `-pii` / `-secrets` found nothing;
`scan-plan-migrations` matched the word "migration" (the lock-schema migration, no data migration);
`scan-plan-observability` matched "logging"/"telemetry" in prose (no telemetry claim). a11y, i18n, privacy and
migrations do not apply: there is no UI, no user-facing strings beyond fixed render lines, no personal data and no data
migration.

## Findings

```yaml
- type: FINDING
  rule_id: "P4"
  severity: important
  file: ".claude/commands/pharn-loop.md:195"
  problem: "The S4 row, the S12 row and the verify mapping restate discovery's causes; an exclusion becomes a new cause of S4 and S12 (with a suggestion that is not a command) and bad-gate-exclusion a new S9 cause, but pharn-loop.md is not in ## Files."
  evidence: "S4 '... allowlist ∩ package.json scripts is empty — or ... only the e2e gates'; S12 'a criterion's level has no test runner with per-test results'."
- type: FINDING
  rule_id: "P4"
  severity: important
  file: ".claude/commands/pharn-build.md:80"
  problem: "The build's never-change list omits gates.exclude, which the /5 pin covers; pharn-ship.md's build-gate discovery sentence and pharn-spec.md's e2e question omit the exclusion too."
  evidence: "'never change the level gates' scripts ..., their pre/post scripts or the testResults formats'."
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/gate-exclusion-config/PLAN.md:## Files"
  problem: "command-hygiene.test.mjs pins byte ceilings (pharn-verify.md 503 bytes left, pharn-regress.md 632) and requires the anchor 'reads `test-infra-changed`' exactly once in pharn-verify.md; the plan does not declare the test file."
  evidence: "COMMAND_BYTE_CEILINGS; NAMED_LIMITS."
- type: FINDING
  rule_id: "P1"
  severity: important
  file: ".dev/features/gate-exclusion-config/PLAN.md:180"
  problem: "The stage-regress ★ WIRING test is hedged, and no wiring test runs /pharn-test's pinned lines with a declaration in place."
  evidence: "'(if the suite's fixtures allow it cheaply)'."
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/gate-exclusion-config/PLAN.md:77"
  problem: "Two windows are unnamed: /pharn-test runs before the reconcile anchor, so an exclusion it writes is pinned as legitimate (regress's scope partition is the backstop); and in bootstrap/legacy SPECs a PLAN-declared pharn.config.json edit can exclude a gate with regress still reading no-regressions."
  evidence: "LIMITS.md §9 'The test stage runs before the reconcile window'; baseSpecFrom copies the head set."
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/features/gate-exclusion-config/PLAN.md:184"
  problem: "'A declared id is not discovered → floor' is runner behaviour that nothing re-derives at verify or regress; only the red run's bindStamp re-resolves."
  evidence: "validateStamp checks `excluded` only when present."
- type: FINDING
  rule_id: "P5"
  severity: minor
  file: ".dev/features/gate-exclusion-config/PLAN.md:65"
  problem: "run-gates reads the declaration beside --discover while the preflight, bindStamp and the pin read it at --root/root; they agree only because every pinned caller passes package.json and '.'."
  evidence: "the same split exists today for the scripts in bindStamp."
- type: FINDING
  rule_id: "P4"
  severity: minor
  file: ".dev/features/gate-exclusion-config/PLAN.md:29"
  problem: "The plan does not say whether the pin's readGates / scriptNamedFiles filter an excluded level gate (the in-progress build does not)."
  evidence: "L29 lists 'the pin' as a discovery reader."
- type: FINDING
  rule_id: "P5"
  severity: minor
  file: ".dev/features/gate-exclusion-config/PLAN.md:56"
  problem: "Applying the exclusion before the regress e2e rule credits e2e to the declaration although regress never runs it, and drops the 'not run at regress (verify-only)' line."
  evidence: "'removed BEFORE the regress e2e rule'."
- type: FINDING
  rule_id: "P4"
  severity: minor
  file: "pharn/pharn-contracts/ac-tests.md:168"
  problem: "The closed last line is defined with a /pharn-ship suggestion; the exclusion suggestion is not a command, a mixed case names only the test-infra route, and preflight exit 2 on a bad config maps to /pharn-test's mapping-unusable."
  evidence: "'suggested: <a /pharn-ship command for a test-infra increment>'."
- type: FINDING
  rule_id: "P4"
  severity: minor
  file: "pharn/floor/ac-gate-core.mjs:264"
  problem: "The AC gate's details for an AC whose level gates are all excluded say 'the head run has none of …' and (bootstrap) 'the runner is not delivered yet', neither naming the exclusion."
  evidence: "gate-absent / ac-untested detail strings."
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/features/gate-exclusion-config/PLAN.md:## Open questions"
  problem: "Three costs are unstated: --write writes /5 for every project (a universal rollback cost), a /4 or /3 lock over an unparseable pharn.config.json now reads changed, and README's generated floor count moves."
  evidence: "computeTestInfra now loads the declaration."
```

## Summary

The agent found no escape for a test-first or quick SPEC. The `/5` pin is read at verify and by the loop's check I. The
lock sits outside the build's scope. The fingerprint and regress's scope partition turn a build-added exclusion into
`test-infra-changed` (S13) or `scope-escaped`. The gaps are restatements the plan did not list, the command-hygiene pins,
hedged or missing wiring tests, and two unnamed windows. It found no blocking P0 overclaim. All twelve findings were
taken; how each was taken is recorded in the plan's "Grill amendments".

ADVISORY VERDICT: 12 concerns raised (0 blocking-severity, 5 important, 7 minor) — for the human to weigh before
/pharn-dev-build. The Step 1b lessons-declaration result is the header's floor verdict and is not counted here.
