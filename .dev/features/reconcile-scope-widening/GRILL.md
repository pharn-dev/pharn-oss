# GRILL — reconcile-scope-widening

Plan: `.dev/features/reconcile-scope-widening/PLAN.md`. Spec-hash check: `75088a82…fb0fd6` matches the plan's pin.
**Step 1b lessons-declaration verdict (FLOOR): GREEN** (`check-plan-lessons.mjs` exit 0).

Grillers: `count-grillers.mjs` reports 13 registered. Their deterministic scanners over the plan found nothing
(secrets, pii and i18n: none; migrations and observability: no mentions). The findings below come from the inline
axes plus the architecture, error-handling, testability and documentation grillers, applied inline.

## Findings

```yaml
- type: FINDING
  rule_id: P5
  severity: important
  file: ".dev/features/reconcile-scope-widening/PLAN.md:31"
  problem: "The `stage command` test (set_by under `.claude/commands/`) treats every command file alike. A command that sets scope from frontmatter with a writes: wider than artifacts would authorize anything. Today every command amendment narrows to `--target` artifacts, but the rule should state that this relies on the setter's --target discipline, not on the path prefix."
  evidence: "An amendment whose `set_by` is **not** a stage command file"
- type: FINDING
  rule_id: P1
  severity: important
  file: ".dev/features/reconcile-scope-widening/PLAN.md:94"
  problem: "The plan's tests use a CLI-level fixture. The F3 regression tests (promote amendment clears canon) must stay green unmodified. If any of them uses a PLAN-shaped set_by for its amendment, the new rule changes their meaning silently. Check every existing amendment fixture's set_by before relying on them as controls."
  evidence: "the existing F3 tests stay green"
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/features/reconcile-scope-widening/PLAN.md:66"
  problem: "The loop-close re-derivation (`set-writes-scope --from-plan` then `--amend-scope`) runs after verify. A later `npm run check` (check:reconcile) in that worktree would then flag nothing new unless the plan widened, which is correct, but the contract should say the rule applies whenever the checker runs, not only at verify."
  evidence: 'the loop close''s "plan''s scope, re-derived"'
```

## Summary

The rule is a membership test over recorded scopes plus a string test on `set_by`. It closes the audit's P2-I
self-widening and deliberately accepts loud REDs on legitimate re-plans (GATE 1, option A). The concerns are about
stating the command-origin assumption, auditing the existing amendment fixtures, and wording.

ADVISORY VERDICT: 3 concerns raised (0 blocking-severity, 2 important, 1 minor). They are for the human to weigh
before /pharn-dev-build. The Step 1b floor verdict (GREEN) is reported in the header and is not counted here.
