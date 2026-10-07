# GRILL — reconcile-trusted-docs

Plan: `.dev/features/reconcile-trusted-docs/PLAN.md`. Spec-hash check: `75088a82…fb0fd6` matches the plan's pin.
**Step 1b lessons-declaration verdict (FLOOR): GREEN** (`check-plan-lessons.mjs` exit 0).

Grillers: `count-grillers.mjs` reports 13 registered. Their deterministic scanners found nothing over the plan
(secrets, pii and i18n: none; migrations and observability: no mentions). a11y, i18n, migrations, privacy and
performance have no surface in a floor-data change. The findings below come from the inline axes plus the
architecture, error-handling, testability and documentation grillers, applied inline.

## Findings

```yaml
- type: FINDING
  rule_id: P0
  severity: important
  file: ".dev/features/reconcile-trusted-docs/PLAN.md:66"
  problem: "The plan's L68 consequence names trusted docs, but canon is now in the no-baseline HEAD comparison too. So a /pharn-dev-memory-promote run outside any build epoch, followed by `npm run check` before the canon edit is committed, REDs. Before this plan that read NO_BASELINE (green). The contract should name the promote case explicitly, because it is a designed workflow, not a human ad-hoc edit."
  evidence: "a human's uncommitted edit of a trusted doc, CODEOWNERS, the SPEC template or canon reads as an escape"
- type: FINDING
  rule_id: P1
  severity: important
  file: ".dev/features/reconcile-trusted-docs/PLAN.md:122"
  problem: "Tests that iterate `human_only` read the list from reconcile-ignore.json. If the list were emptied, every per-member ESCAPE assertion would pass vacuously (L34). Each iterated test needs a non-empty, exact-count guard."
  evidence: "for each `human_only` member: added untracked with a forged baseline → ESCAPE"
- type: FINDING
  rule_id: P5
  severity: minor
  file: ".dev/features/reconcile-trusted-docs/PLAN.md:42"
  problem: "This repo has `.github/CODEOWNERS`, not a root `CODEOWNERS`, while never_exempt lists only the root one. The plan's never_exempt ⊆ always-reconciled pin holds, but the reverse gap (`.github/CODEOWNERS` absent from never_exempt) is unstated. Mention it, or leave never_exempt as it is with a reason."
  evidence: "`CODEOWNERS`, `.github/CODEOWNERS`, `docs/CODEOWNERS`"
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/features/reconcile-trusted-docs/PLAN.md:107"
  problem: "The forged-baseline claim covers the reconciled bytes, but bound 7 (the checker runs from the worktree) means a Bash writer can still edit check-bash-reconcile.mjs or reconcile-ignore.json itself. That edit is caught only by the checker it disables. The contract's existing struck claim covers this; the CHANGELOG entry must not say trusted docs are now 'tamper-proof'."
  evidence: "a Bash write to a trusted doc / CODEOWNERS / the SPEC template / canon is reported even when its baseline entry is forged"
```

## Summary

The plan closes two measured gaps: trusted docs forgeable through the baseline, and untracked control files
invisible to `git diff HEAD`. It keeps the guard parity and C1's `merged` class untouched, and states the loud
no-baseline consequence. The concerns are about naming the promote-outside-a-build case, guarding iterated tests
against an empty set, and keeping restatements away from "tamper-proof".

ADVISORY VERDICT: 4 concerns raised (0 blocking-severity, 2 important, 2 minor). They are for the human to weigh
before /pharn-dev-build. The Step 1b floor verdict (GREEN) is reported in the header and is not counted here.
