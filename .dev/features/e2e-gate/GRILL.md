# GRILL — e2e-gate

Plan: `.dev/features/e2e-gate/PLAN.md` (approved at GATE 1 by the model under the user's overnight delegation,
2026-09-23 — a delegated model decision, never a human approval). Spec-hash check: `pharn/ARCHITECTURE.md` digest
`edc3d07d…ce091a5d2c` **equals** the plan's pin. **Step 1b lessons-declaration verdict (FLOOR): GREEN**
(`check-plan-lessons.mjs` exit 0, 8 cited ids resolve and are referenced in the body). That covers the
DECLARATION only.

Method: the inline Step-2 axes and the 13 registered grillers (`count-grillers.mjs` → `{"registered":13}`),
applied inline. No independent agent pass this time: the increment is a closed-set extension of item 01's
machinery, and the review stage will get one. All findings are advisory (fix #3).

## Findings

```yaml
- type: FINDING
  rule_id: "P7"
  severity: important
  file: ".dev/features/e2e-gate/PLAN.md:5"
  problem: "The plan does not state its honest trigger: no dogfood run failed; the trigger is the maintainer's queue plus a real gap (an AC with `verify: e2e` in the shipped spec-template grammar has no gate to run it)."
  evidence: "Give PHARN an e2e gate — discovered ONLY when the project has a `test:e2e` or `e2e` script"
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/e2e-gate/PLAN.md:62"
  problem: "/pharn-loop runs /pharn-verify every iteration, so an e2e suite now runs once per iteration unattended; the cost is real and should be stated where a user reads it (the verify command and the contract), not discovered."
  evidence: "Stages → `/pharn-verify` only."
- type: FINDING
  rule_id: "P5"
  severity: minor
  file: ".dev/features/e2e-gate/PLAN.md:52"
  problem: 'When a project defines both scripts and one calls the other (`"test:e2e": "npm run e2e"`), the suite runs twice. Acceptable under the typecheck/type-check precedent, but it should be written next to the rule so a user can drop one script.'
  evidence: "If a project has both, both run as distinct gates"
- type: FINDING
  rule_id: "P6"
  severity: minor
  file: ".dev/features/e2e-gate/PLAN.md:66"
  problem: "The regress exclusion changes what `required` holds on a regress stamp; the gate-run-record contract's coverage rule ('for regress, required is the source set minus STYLE_SET when --skip-style') must name the second subtraction, or a reader of a stamp cannot explain a missing e2e id."
  evidence: "`resolveSet` drops `E2E_SET` from a DISCOVERED regress source, both sides alike"
```

## Grillers (13 registered)

`a11y`, `i18n`, `migrations`, `privacy`, `security`: no new surface (no new input is read; the e2e results file
is item 01's untrusted-data path, unchanged). `performance`: the unattended-loop cost is the P0 finding above.
`testability`, `error-handling`, `architecture`, `coupling`, `comprehension`, `documentation`,
`observability`: their concerns coincide with the four findings above.

## Summary

A small, closed-set extension whose shape follows existing precedent (`typecheck`/`type-check`, `STYLE_SET`,
item 01's gate-keyed config). The concerns are all about stating costs and bounds where a reader will find them:
the honest trigger, the per-iteration e2e cost under `/pharn-loop`, the double run when both scripts exist, and
the regress `required` set.

ADVISORY VERDICT: 4 concerns raised (0 blocking-severity, 2 important, 2 minor) — for the human to weigh before
/pharn-dev-build. The Step 1b floor verdict (GREEN) is reported in the header and is not part of this count.
