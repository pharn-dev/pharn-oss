# GRILL — front-grill-concurrent

Plan: `.dev/features/front-grill-concurrent/PLAN.md` · spec hash: the pinned `d831d30d…` equals the live
`sha256(pharn/ARCHITECTURE.md)` · **lessons declaration (Step 1b, `pharn/floor/check-plan-lessons.mjs`): GREEN**:
L19, L29 and L38 all resolve and are referenced in the body.

## Findings (advisory)

### Guarantee audit (P0)

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/front-grill-concurrent/PLAN.md:85"
  problem: "Ship's post-grill lessons re-read is dropped. After the grill, nothing re-checks the lessons declaration in /pharn-ship before the build (only the chain is re-checked by /pharn-build). The plan states the bound but should name this exact gap in the command or the CHANGELOG, not only in the plan."
  evidence: "Dropping the post-grill read is safe within its stated bound"
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/features/front-grill-concurrent/PLAN.md:83"
  problem: "A ship STOP at the pre-grill read leaves no RED GRILL.md. Before, the grill-log recorded the refusal ('the audit trail is never silent'). The STOP must present the checker's RED line itself so the trail is not lost."
  evidence: "either non-zero → **STOP** (no grill agent, no `GRILL.md`)"
```

### Determinism / closure (P5, L29)

```yaml
- type: FINDING
  rule_id: "P5"
  severity: important
  file: ".dev/features/front-grill-concurrent/PLAN.md:67"
  problem: "The loop's grill stage-start without --route and its inline invocation must satisfy every marker-wiring set (PHASE_MARKER_WIRING, STAGE_AGENT_WIRING rule 2: stage-starts carrying --route == routed). Check both sets' assertions over the loop body after the edit, not only the policy-parity rule."
  evidence: "it keeps a stage-start marker **without** `--route`"
- type: FINDING
  rule_id: "P5"
  severity: minor
  file: ".dev/features/front-grill-concurrent/PLAN.md:56"
  problem: "--floor-only has one invoker. Pin that invocation both ways: pharn-loop.md names `/pharn-grill <name> --floor-only`, and pharn-grill.md names /pharn-loop as its invoker. Otherwise renaming either side drifts silently."
  evidence: "(full mode) is its one invoker"
```

### Cost honesty (P7)

```yaml
- type: FINDING
  rule_id: "P7"
  severity: minor
  file: ".dev/features/front-grill-concurrent/PLAN.md:103"
  problem: "The inline grill puts pharn-grill.md (~21 KB) into the orchestrator's context for the rest of the run. Every later orchestrator request re-reads it, mostly from cache. The saving estimate should name this cost as a tokens-only offset (cache reads), not a wall-clock one."
  evidence: "the Skill load, the setter, two checkers"
```

### Grillers (13 registered, `count-grillers.mjs`)

- **architecture / coupling.** The policy cell and the command move together; `stage-agent-core.mjs` stays the one
  owner of the policy, and the rationale lives there (P3/P4). No finding.
- **documentation.** The plan lists the README, `CLAUDE.md` and PROTECTED-FOLLOWUPS sites. One addition: the loop's own
  `## What you may claim` (in the close part) should strike "the loop interrogated the plan", if any wording implies it
  (folded into the guarantee audit above).
- **a11y, comprehension, error-handling, i18n, migrations, observability, performance, security, testability.** These
  axes target product application code. This increment changes orchestration prose and a policy enum, so no finding.

## Summary

The design is coherent and the policy parity test enforces its main structural claim. The two P0 items are about
keeping the audit trail and naming the dropped re-read. The P5 items are wiring pins to add.

ADVISORY VERDICT: 5 concerns raised (0 blocking-severity, 2 important, 3 minor) — for the orchestrator to weigh
before /pharn-dev-build.
