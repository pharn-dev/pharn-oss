# GRILL — loop-command-sections

Plan: `.dev/features/loop-command-sections/PLAN.md`. Spec-hash check: `d19c3ae5…7a8bcf` recomputed, equal to the
plan's pin (no drift). **Step 1b lessons declaration (FLOOR): GREEN** — `check-plan-lessons.mjs` exit 0: "applied_lessons:
L12, L26, L57, L60 … all 4 cited id(s) resolve … and are referenced in the plan body."

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194044 B of griller files, 99396 B printed;
deep omission: 13 pharn-owned, 0 other; left out where present: guarantee-audit (13), machine-readable-emission (13),
two-layers (13), layer-1 (13), finding-output (13); kept whole: none

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`)

Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line; a scanner finding
is not the griller's judgment.

Findings: none (no secrets, PII or i18n scanner hit).

- `scan-plan-migrations`: mentions false. Not a finding: whether the plan needs or adequately declares this is the migrations griller's judgment.
- `scan-plan-observability`: mentions false. Not a finding: whether the plan needs or adequately declares this is the observability griller's judgment.

## Griller pass

- **testability (P1):** presence recognized — `## Acceptance criteria` maps each criterion to a test or a build record,
  and the new test names a negative control per asserted property.
- **architecture / coupling (P3):** the pin test sits in `command-hygiene.test.mjs` beside the existing stuck-point
  tests (`STUCK_POINTS`), and the ceiling row in its one table. No new mechanism, no sibling reference. No finding.
- **documentation:** no new public surface; a CHANGELOG entry is planned. No finding.
- **error-handling, performance, observability, migrations, security, privacy, i18n, a11y:** the change is text layout
  of one command table plus a test; none of these axes applies. No finding.
- **comprehension:** one finding (below).

## Findings (advisory)

```yaml
- type: FINDING
  rule_id: P4
  severity: minor
  file: ".dev/features/loop-command-sections/PLAN.md:73"
  problem: "The command gains a bare `<!-- prettier-ignore -->` line whose reason is stated nowhere a later editor of pharn-loop.md would look, so the next person may delete it as noise."
  evidence: "the stuck-point table (lines 472–497) rewritten compact, `<!-- prettier-ignore -->` directly above its header"
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/features/loop-command-sections/PLAN.md:120"
  problem: "The row-identity proof for AC 6 is a one-time build record; after merge only the existing per-row regexes hold the table's text, and they pin fragments of some rows, not every cell."
  evidence: "the full-table identity is a one-time build record (`BUILD.md`), not a standing check"
```

## Summary

The plan is small and its claims are labeled. Finding 1 is answered by the pin test the plan adds: deleting the
ignore line turns that test red, and the test's comment carries the reason, which is where the product-commands guide
wants rationale (not restated in the command, P4). Build should make sure the failure message names the reason.
Finding 2 is a stated bound, not a gap. The plan already labels it, and the per-row content is pinned by `STUCK_POINTS`
(24 ids with their `blocked:` spellings), `BLOCKED_IDS` equality and the S14/S14b/S14c/S15/S18 regexes.

ADVISORY VERDICT: 2 concerns raised (0 blocking-severity, 2 advisory, both minor) — for the human to weigh before
/pharn-dev-build.
