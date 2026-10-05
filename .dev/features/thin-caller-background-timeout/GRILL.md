# GRILL — thin-caller-background-timeout

Plan: `.dev/features/thin-caller-background-timeout/PLAN.md` · spec hash
`d831d30d399a37dc403080072763d13383de6f6f31875e7e8cb4eadeb642f4f4` matches the plan's pin · **Step 1b
lessons-declaration verdict (FLOOR): GREEN** (`check-plan-lessons.mjs` exit 0; L31, L37, L50, L60, L64 resolve and are
referenced in the body).

## Findings (advisory)

### Built-in axes

```yaml
- type: FINDING
  rule_id: "P5"
  severity: important
  file: ".dev/features/thin-caller-background-timeout/PLAN.md:44"
  problem: "The plan's 'gone' branch assumes the model can tell a gone call from a running one; when it cannot (no notice arrived, the session was resumed later), the bullet has no terminal fallback, and a guess there is exactly the concurrent second run this increment removes."
  evidence: "Only a call that is GONE without an exit code (interrupted, or stopped by the tool after its background limit) is resumed, once"
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/features/thin-caller-background-timeout/PLAN.md:63"
  problem: "The pin's negative half is a single spelling (`TIMEOUT_RESUME`); a reworded resume-on-timeout clause passes it. The plan should state that bound beside the pin, not only 'presence over committed prose'."
  evidence: "and `TIMEOUT_RESUME` (rule 7's existing regex, reused) does not match"
```

### Grillers (13 registered by `count-grillers.mjs`)

- testability — covered by the second finding above (the pin's absence check is one spelling).
- error-handling — covered by the first finding (the unknown state needs a terminal fallback).
- documentation — no finding: the plan corrects the one restatement (`stage-exit.md`) and keeps five true
  "harness kill" sites with a stated reason.
- security — no finding: removing a prescribed second run narrows, never widens, what the stage writes; no new input.
- a11y, architecture, comprehension, coupling, i18n, migrations, observability, performance, privacy — not applicable:
  two command bullets, one contract sentence and one test, with no code path, schema, UI or data change.

## Summary

The increment is small and its trigger is real (#314's review, re-probed this run). Two gaps: the bullet needs an
"unsure → do not resume; stop and say so (ask the human)" fallback, and the pin's negative check should state that it
catches one spelling only.

ADVISORY VERDICT: 2 concerns raised (0 blocking-severity, 2 advisory) — for the human to weigh before /pharn-dev-build.
