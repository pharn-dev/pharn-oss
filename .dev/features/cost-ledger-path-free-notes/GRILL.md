# GRILL — cost-ledger-path-free-notes

Plan: `.dev/features/cost-ledger-path-free-notes/PLAN.md` · spec-hash check: MATCH (`2f8b9264…e838`) · **Step 1b lessons-declaration verdict (FLOOR): GREEN**, meaning `check-plan-lessons.mjs` exited 0 and all 4 cited ids (L29, L41, L51, L52) resolve and are referenced in the body. This covers the declaration only, never whether the lessons were applied.

Grillers discovered: 13 (`count-grillers.mjs`). Applied inline: testability, privacy (`scan-plan-pii.mjs`: `{"found":false}`), documentation, error-handling. No finding came from the other nine (a11y, architecture, comprehension, coupling, i18n, migrations, observability, performance, security), because the change only rewrites two string literals in one emitter and touches no UI, schema, public API or network surface.

## Findings

```yaml
- type: FINDING
  rule_id: P1
  severity: minor
  file: ".dev/features/cost-ledger-path-free-notes/PLAN.md:57"
  problem: "The multi-dir branch is reached through a separator-bearing session id. That id is itself caller input, so the test asserts path-freedom only for the relative form the fixture chooses."
  evidence: "multi-dir via a separator-bearing id"
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/cost-ledger-path-free-notes/PLAN.md:41"
  problem: "The limit on sessionId interpolation is stated in the plan. It should also reach the CHANGELOG entry so a reader of the release does not read 'no path can enter coverage_note'."
  evidence: "`sessionId` stays interpolated: it is a caller-supplied id"
```

## Summary

- **Testability:** a verification approach is present (Evals section, A–D plus the five-branch enumeration). Requiring test A to fail on the pre-fix code is the right non-vacuity control.
- **Documentation:** no public surface changes. The note text is not a documented contract (`cost-ledger.md` only shows `"<why it is never complete>"`), so a CHANGELOG entry is enough.
- **Error-handling:** all five `unavailable` branches keep distinct wording. absent, ambiguous (multi-dir) and unusable (empty-selection, no-usage) stay distinguishable.

ADVISORY VERDICT: 2 concerns raised (0 blocking-severity, 2 advisory), for the human to weigh before /pharn-dev-build.
