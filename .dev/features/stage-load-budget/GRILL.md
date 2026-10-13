# GRILL — stage-load-budget

Plan: `.dev/features/stage-load-budget/PLAN.md` (as amended after GATE 1 — open questions resolved, the L3/L5 failure-message
addition written in). Spec-hash check: `75088a82d113bc52cdd3d5fb2e44533e81cba5f520877f5eaa441ced45fb0fd6` recomputed with
`.dev/floor/hash-doc.mjs` equals the plan's `spec_content_hash` — no drift. **Step 1b lessons-declaration verdict (FLOOR,
`pharn/floor/check-plan-lessons.mjs`): GREEN, exit 0** — "applied_lessons: L1, L29, L34, L35, L36, L45, L60, L67 … all 8
cited id(s) resolve … and are referenced in the plan body." That verdict covers the declaration only, never that the
lessons were applied.

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`)

Findings: none (no secrets, PII or i18n scanner hit). `scan-plan-migrations`: mentions false. `scan-plan-observability`:
mentions false. (Scanner verdicts are regex matches; the grillers' judgment below is advisory.)

## Findings (advisory — each gates nothing)

### Interrogation (Step 2)

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/features/stage-load-budget/PLAN.md:140"
  problem: "W3 says the committed CI command line is executed, but only the node line can run in a fixture; the fetch line is pinned as text and never executed, and the plan does not say so."
  evidence: "the CI command line, executed in a fixture repo, exits 0 on +100 B and 1 on +3,000 B of `CLAUDE.md`."

- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/features/stage-load-budget/PLAN.md:235"
  problem: "With +10% headroom a stage can still grow by 26-34 KB (grill/review rows) with no red, so any claim that a load 'cannot grow unnoticed' must be bounded to growth past the headroom in the test header, guide and CHANGELOG."
  evidence: "10% headroom on a 259–341 KB row is 26–34 KB — one new griller (~14.5 KB) or lens fits without a red."

- type: FINDING
  rule_id: P4
  severity: minor
  file: ".dev/features/stage-load-budget/PLAN.md:124"
  problem: "The new test re-derives 'the product stages on disk' (pharn-*.md minus pharn-dev-* minus parts), the same membership command-hygiene.test.mjs derives privately for COMMAND_BYTE_CEILINGS; two derivations can drift. Acceptable only if both read parts from command-family.mjs's allParts (the one record of parts) — the build should use that and say so."
  evidence: "L1 closure — the stages on disk equal both tables' keys (non-empty; no stage without a row, no row without a stage)."

- type: FINDING
  rule_id: P5
  severity: minor
  file: ".dev/features/stage-load-budget/PLAN.md:130"
  problem: "READ_RE's verb list (read/re-read/follow/load) is the whole detection surface of L5; the plan should pin the exact regex in the test header and give each verb and the line-wrap fold its own control, or a later edit to the regex silently narrows the rule."
  evidence: "every match of `READ_RE` (a read/re-read/follow/load verb, an optional `the`, then a backticked `pharn/…` or `.claude/commands/…` path ending `.md`, over whitespace-folded text)"
```

### Griller axes (Step 2b — `count-grillers.mjs` registered 13; each procedure applied inline)

- **a11y (P7):** no UI surface — no finding.
- **architecture (P3):** fits the tree — a `.dev/floor/` test may import product modules (`stage-agent-core.mjs`) and
  spawn shipped counters; no product file references `.dev/`. Fit recognized; no finding.
- **comprehension (P7):** the non-obvious values (the +10%/512 rule, the 2,048 B default, `HEAD^1`) each carry their
  WHY in the plan (cited rule, base-read budget, merge-commit parent). Rationale recognized; no finding beyond the
  headroom bound above.
- **coupling (P3):** no shared mutable state; the test reads frozen tables and on-disk bytes. A future edit to
  `ROUTE_POLICY` changes the ship total by design (explicit data flow, not a hidden ordering). No finding.
- **documentation (P7):** the new npm script and the test's tables are documented in `CONTRIBUTING.md` and two
  `.dev/guides/` files per `## Files`. Present; no finding.
- **error-handling (P7):** failure modes are declared — a counter that fails or prints zero members is red (L2), a
  shallow CI checkout whose fetch fails exits 2 (`base-unresolved`), never green. No finding.
- **i18n (P7):** scanner clean; no user-facing text. No finding.
- **migrations (P7):** scanner clean; no persisted-data shape changes. No finding.
- **observability (P6):** scanner clean; a CI test and a CI step are observable through their own exit codes and
  messages; nothing operational runs in production. No finding.
- **performance (P7):** two counter spawns, one small git fixture, byte reads of ~40 files — bounded; no scaling risk.
- **privacy (P2):** scanner clean; no personal data. No finding.
- **security (P2):** scanner clean. The CI step adds no `${{ }}` interpolation into `run:` and keeps
  `persist-credentials: false` (job-level, unchanged); it reads contributor `CLAUDE.md` only through the checker's
  data-only parser. No finding.
- **testability (P1):** a verification approach is present — rules L1–L6 and W1–W3, each with a named negative
  control. Presence recognized; adequacy is the review's call.

## Summary

The plan's scope matches the live gap after re-measurement: per-file command ceilings already exist, so it budgets the
per-stage load set and wires the existing growth gate into CI over this repo's own `CLAUDE.md`. Four minor concerns, all
about stating bounds precisely rather than about the design: say the CI fetch line is pinned but not executed; bound
every "cannot grow unnoticed" wording to growth past the headroom; derive parts only from `command-family.mjs`; pin
`READ_RE` with a control per verb and for the line-wrap fold.

ADVISORY VERDICT: 4 concerns raised (0 blocking-severity, 4 advisory minor) — for the human to weigh before
/pharn-dev-build. This is not a judgment that the plan is good; the Step 1b result above is a separate floor verdict.
