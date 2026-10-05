# GRILL — plan-instruction-file-rule

**Header.** Plan: `.dev/features/plan-instruction-file-rule/PLAN.md`. Spec-hash check: `pharn/ARCHITECTURE.md` recomputes
to `d831d30d399a37dc403080072763d13383de6f6f31875e7e8cb4eadeb642f4f4`, equal to the plan's `spec_content_hash` (no
drift). **Step 1b lessons-declaration verdict (FLOOR): GREEN**, exit 0: "all 7 cited id(s) resolve in
.dev/memory-bank/lessons-learned.md and are referenced in the plan body". That verdict covers the declaration only,
never whether the lessons were applied.

## Inline interrogation (Step 2)

```yaml
- type: FINDING
  rule_id: P0
  severity: important
  file: ".dev/features/plan-instruction-file-rule/PLAN.md:70"
  problem: "The shipped rule states a platform loading behaviour as fact ('are loaded into every agent of every stage'), but the repo measured it on one project only, and the `@…` import and `paths:` halves are documented platform behaviour that was never probed here."
  evidence: "> imports with `@…` (e.g. `AGENTS.md`), and every `.claude/rules/` file without `paths:` frontmatter are loaded into"
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/plan-instruction-file-rule/PLAN.md:127"
  problem: "The test both DERIVES the AUTHOR set from frontmatter and pins it to the literal ['pharn-plan.md'], a second store of one fact (L35); the plan should say why the literal is kept (a tripwire so a new PLAN author is classified on purpose) or drop it."
  evidence: 'the derived set has ≥ 1 member, and it equals `["pharn-plan.md"]` today'
```

Line numbers are those of the formatted PLAN on disk at grill time.

- **P0, F1.** The rule's job is to steer a model, so a plain statement is reasonable, but the shipped text should not
  read as a measured universal. A word of attribution keeps it honest without costing lines: "Claude Code loads
  `CLAUDE.md` … into every agent". The plan's own "Platform behaviour" paragraph already separates measured from
  documented; the rule text should match that split.
- **P1.** No capability is added, so no eval is owed. The verification approach is declared: a closed presence pin,
  per-property controls, and a live mutation run. The plan says plainly that no behavioural test exists.
- **P2.** No new untrusted input. A PLAN's `## Files` stays untrusted DATA, and the rule does not change how it is
  read.
- **P3.** One file per reason: the rule lives in the command, the pin in the hygiene suite, the bound in `LIMITS.md`.
  The test reuses `writeToolStep3` from the same file rather than adding a second Step-3 slicer.
- **P5.** The AUTHOR/CONSUMER split is read from `writes:` frontmatter, a membership test. The one judgment, whether
  a routed plan agent sees Step 3, was checked by rendering the brief: rule 2 tells the agent to read
  `.claude/commands/pharn-plan.md` and follow it.
- **P7.** The trigger is real: the 634,379 B measurement. The cause, ~98 PLANs routing narrative into `CLAUDE.md`, is
  user-reported and labelled so. The increment is the smallest coherent one: one command, one pin and one doc
  bound.

## Grillers (Step 2b — `count-grillers.mjs` registered 13)

Each procedure was applied inline to the PLAN. All findings are advisory.

- **testability.** A verification approach is present: the structural pin with per-property controls, a live
  mutation run, and a stated absence of a behavioural harness. Presence recognized. No finding.
- **documentation.** No public API or config surface is added. The one user-facing documentation change, the
  `LIMITS.md §3e` bound, is planned and drafted. No finding.
- **comprehension.** Every non-obvious choice carries its reason: Step 3 rather than `## Files` (L28), patch rather
  than minor, the byte headroom, why only one AUTHOR exists. F2 above is the one uncaptured reason. No further
  finding.
- **architecture.** It fits. The pin goes in the suite that already holds `WRITE_TOOL_RULE`, and no sibling
  reference is added. No finding.
- **coupling.** The rule names Claude Code's file conventions (`CLAUDE.md`, `.claude/rules/`, `paths:`), which change
  when the platform changes, inside a command that already depends on the same platform (`.claude/commands/`).
  No new axis of change. No finding.
- **performance.** About 1 KB added to a command loaded on every `/pharn-plan` run, under the byte ceiling. It
  is a net reduction if it keeps even one per-feature section out of an instruction file. No finding.
- **error-handling, observability, security, privacy, i18n, a11y, migrations.** The change adds no code path, I/O,
  secret, personal data, UI string, UI surface or schema. Not applicable. No finding.

## Summary

The plan is narrow and its evidence is labelled honestly. There are two concerns. F1: the shipped rule states the
platform's loading behaviour without attribution, even though that behaviour was measured on one project and
partly not at all. F2: the test keeps a literal copy of the set it derives, with no stated reason. Both can be fixed
inside the approved `## Files` during the build, and neither changes scope.

ADVISORY VERDICT: 2 concerns raised (0 blocking-severity, 1 important, 1 minor) — for the human to weigh before
/pharn-dev-build.
