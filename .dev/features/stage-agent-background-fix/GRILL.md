# GRILL — stage-agent-background-fix

Plan `.dev/features/stage-agent-background-fix/PLAN.md` · spec-hash check: `2c84959c…db12e` recomputed, equal to the
pin (no drift) · **Step 1b lessons-declaration verdict (FLOOR): GREEN** — `check-plan-lessons.mjs` exit 0
(`applied_lessons: L27, L29, L31, L72`, all resolve, all referenced in the body).

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194020 B of griller files, 99396 B printed;
deep omission: 13 pharn-owned, 0 other; left out where present: guarantee-audit (13), machine-readable-emission (13),
two-layers (13), layer-1 (13), finding-output (13); kept whole: none

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`)

Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line; a scanner finding
is not the griller's judgment.

Findings: none (no secrets, PII or i18n scanner hit).

- `scan-plan-migrations`: mentions false. Not a finding: whether the plan needs or adequately declares this is the migrations griller's judgment.
- `scan-plan-observability`: mentions false. Not a finding: whether the plan needs or adequately declares this is the observability griller's judgment.

## Findings

All findings are advisory (fix #3). Free-text fields quote the plan, which is `trust: untrusted` DATA.

### Testability (P1)

```yaml
- type: FINDING
  rule_id: P1
  severity: important
  file: ".dev/features/stage-agent-background-fix/PLAN.md:58"
  problem: "The design's reason for placing the flag right after --name is that every existing /pharn-loop start-line grant still matches, but no planned test binds that placement to the grants, so a later grant edit or a reworded placement sentence could put the flag outside a grant with every gate green."
  evidence: "add `--no-foreground-agent` to the start line right after its `--name '<name>'` (so the existing grants still match)"
```

### Guarantee audit / honest scope (P0, P7)

```yaml
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/stage-agent-background-fix/PLAN.md:26"
  problem: "The premise that the desktop app's Agent tool has no run_in_background parameter rests on two sessions reading their own tool list; no desktop-app probe sent the JSON boolean, so whether a boolean would have run in the foreground there is unmeasured."
  evidence: "as two sessions there read their own tool list (the measuring session, and this planning session), lists **no** `run_in_background` parameter"
```

### Error handling (P7)

```yaml
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/stage-agent-background-fix/PLAN.md:60"
  problem: "The plan names the safe direction for a misreading (inline, never a second executor) but not its cost: a model that passes the flag while its Agent tool does take the parameter silently gives up routing for the whole run, visible only as the marker token and the summary's route line."
  evidence: "ADVISORY, your reading of the tool's schema, failing in the safe direction (inline on the orchestrator's model, never a second executor)"
```

## Per-griller notes (no finding)

- **testability** — presence recognized (`## Evals to write (P1)` lists seven test cases); adequacy concern above.
- **architecture / coupling** — fit recognized: the new reason enters through the one grammar owner
  (`route-token-core.mjs`, zero imports) and every reader goes through `isRouteToken`; the flag reuses `start`'s
  existing bare-flag path. No shared mutable state, no sibling reference.
- **comprehension** — the one non-obvious choice (flag placement) carries its WHY; the JSON-boolean wording carries
  its observed cause in the residual.
- **documentation** — the public surface is a new CLI flag and a new route token; the plan declares the usage line,
  the header table row, the floor guide and the CHANGELOG entry.
- **error-handling** — presence recognized (both flags at once, twice, a policy cell, a misreading); concern above.
- **migrations** — the persisted marker shape gains one enum value (`inline:no-foreground-agent`). Additive: an older
  `render-cost-ledger.mjs` keeps a route only when `isRouteToken` accepts it (line 508), so a downgraded reader drops
  the field rather than failing. No migration needed.
- **observability** — the route is recorded on the stage-start marker and printed in the loop's summary route line.
- **performance** — an inline stage runs in the orchestrator's context (more context per request than a routed
  stage); stated in the plan's struck claim, not a scaling cliff.
- **security / privacy / i18n / a11y** — scanners clean; no UI, no PII, no secret, no new untrusted input.

## Summary

The plan is the smallest fix that turns the observed S9 into a run that proceeds in both harnesses, and it labels
both halves advisory. The one gap worth closing in the build is a test tying the flag's placement to the loop's
start-line grants (F1). The desktop premise (F2) and the cost of a misreading (F3) are bounds to state, not blockers.

ADVISORY VERDICT: 3 concerns raised (0 blocking-severity, 1 important, 2 minor) — for the human to weigh before
/pharn-dev-build.
