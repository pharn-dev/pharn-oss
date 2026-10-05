# GRILL — gates-parallel-drain (the shrunk decision-record plan)

Plan: `.dev/features/gates-parallel-drain/PLAN.md`, shrunk at GATE 1. Spec hash: the pinned
`d831d30d…42f4f4` equals `node .dev/floor/hash-doc.mjs pharn/ARCHITECTURE.md` this run. **Step 1b, the lessons
declaration (FLOOR):** `check-plan-lessons.mjs` is GREEN. All of `L24, L58, L66` resolve in canon and are referenced in
the body.

## Findings

### Honest scope (P7)

```yaml
- type: FINDING
  rule_id: "P7"
  severity: important
  file: ".dev/features/gates-parallel-drain/PLAN.md:128"
  problem: "The reopen trigger for regress-base-outside-tree names 'a project that has opted in', but the opt-in was not built, so that trigger can never fire."
  evidence: "Trigger to reopen (P7): a project that has opted in, or a regress whose wall clock is still a top-two bucket"
```

### Guarantee audit (P0)

```yaml
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/features/gates-parallel-drain/PLAN.md:106"
  problem: "The percentage does not follow from the plan's own arithmetic: 75–235 s plus 1–2 round trips over a 5,505 s run is about 1.5–4.5 %, not 2–5 %."
  evidence: "The 92-minute run had one measured regress, so ≈ 2–5 % of it."
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/features/gates-parallel-drain/PLAN.md:98"
  problem: "The 1.25 contention factor comes from a node --test sample and is applied to next build and vitest; F4 says so, but F5 does not repeat that the factor is an extrapolation."
  evidence: "a contention factor of 1.25 from F4"
```

### Grillers (Step 2b)

`count-grillers.mjs` registered 13 grillers. The plan changes no code, contract or capability, so most of their axes
have nothing to bite on: a11y, i18n, migrations, privacy, security, observability, error-handling, coupling,
architecture and testability. **performance** asks whether a speed claim is measured; F4/F5 measure it and label it,
so it has no further finding. **documentation** and **comprehension** found nothing beyond the three findings above.

## Summary

The record is consistent with the GATE 1 decision and makes no floor claim. The P7 finding matters most: as written, a
follow-up's reopen trigger can never fire. The two P0 findings correct a percentage and repeat a label.

ADVISORY VERDICT: 3 concerns raised (0 blocking-severity, 3 advisory: 1 important, 2 minor), for the orchestrator to
weigh before the record ships.
