# GRILL — release-workflow

Plan: `.dev/features/release-workflow/PLAN.md` · spec-hash: `d5a97430…` recomputed, **matches** the pin ·
**Step 1b lessons declaration: GREEN** (`check-plan-lessons.mjs` exit 0 — all 7 cited ids resolve and are referenced
in the body; this covers the declaration, never the application).

grillers: 13 registered (`griller-extract.mjs .`), applied inline over the plan.

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`)

Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line; a scanner finding
is not the griller's judgment.

Findings: none (no secrets, PII or i18n scanner hit).

- `scan-plan-migrations`: mentions false. Not a finding: whether the plan needs or adequately declares this is the migrations griller's judgment.
- `scan-plan-observability`: mentions true — lines 13 (alerting), 17 (alerting), 86 (logging), 156 (logging), 215 (alerting), 217 (alerting). Not a finding: whether the plan needs or adequately declares this is the observability griller's judgment.

## Findings (advisory — every one is model judgment; none gates `/pharn-dev-build`)

### error-handling

```yaml
- type: FINDING
  rule_id: P7
  severity: important
  file: ".dev/features/release-workflow/PLAN.md:68"
  problem: "The plan does not say what a failed `gh api` call does inside the wait loop: under `set -e` one transient 5xx or rate-limit answer would end a 45-minute wait as a red release."
  evidence: "every `POLL_INTERVAL_S` seconds, up to `POLL_MAX` polls, list this SHA's check runs"
```

Suggested resolution: a failed poll counts as "not yet" and is retried within the same bound (the bound still ends
it); the resolve step's lookups stay fail-closed (exit 1), since they decide whether to tag.

### testability

```yaml
- type: FINDING
  rule_id: P1
  severity: important
  file: ".dev/features/release-workflow/PLAN.md:94"
  problem: "The stub `gh` ignores `--jq`, so a wrong filter (a misspelt field, the wrong exact-ref test) passes every test and is first exercised by the human's dispatch."
  evidence: "the `--jq` expressions and the real API are pinned as text only"
```

Suggested resolution: run each committed `--jq` filter through `jq` over a small recorded API response (jq is on
`ubuntu-latest` and on this machine). gh's engine is gojq, so this checks the filter's meaning, not gh's engine —
state that bound in the test header (L67).

### coupling

```yaml
- type: FINDING
  rule_id: P3
  severity: important
  file: ".dev/features/release-workflow/PLAN.md:58"
  problem: "`REQUIRED_CHECKS` is a second copy of the ruleset's required-check list; a check ADDED to the ruleset later is silently not waited for (fails open), while a renamed one times out (fails closed)."
  evidence: "and `REQUIRED_CHECKS` (newline-separated names, see Q1)"
```

Suggested resolution: state the asymmetric drift in the workflow header and in CONTRIBUTING's release paragraph
("change both together"). Reading the ruleset at run time cannot decide which checks run on push, so a static list
plus a stated bound is the honest option (L35/L43: the copy must exist; name what agreement does not prove).

### security

```yaml
- type: FINDING
  rule_id: P2
  severity: minor
  file: ".dev/features/release-workflow/PLAN.md:75"
  problem: "Running `changelog-section.mjs` in the same step as `gh release create` gives repository code an environment holding `GH_TOKEN` with `contents: write`, which it does not need."
  evidence: '`node .dev/floor/changelog-section.mjs . "$TAG" > "$RUNNER_TEMP/release-notes.md"`; on `tag-and-release`, create the tag object'
```

Suggested resolution: cut the body in its own step with no token; only the two `gh` steps get `GH_TOKEN`.

### observability

```yaml
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/release-workflow/PLAN.md:61"
  problem: "The plan lists every exit-1 state but not that each one prints its reason; a red release job whose log says only `exit 1` sends the maintainer to read the YAML."
  evidence: "Absent → `action=tag-and-release`. Present and pointing at another commit → exit 1"
```

Suggested resolution: each refusal prints one `::error::` line naming the state (tag, SHA, check name, conclusion);
the ★ tests assert the message for each exit-1 case.

### comprehension

No finding. The non-obvious values carry their reason in the plan (60 s / 45 polls from the brief and the measured
11-minute `check` job; 125,000 from GitHub's limit and pharn-cli's comment; highest-id-wins for re-runs; the
entry-boundary cut). The workflow header must carry the same reasons — a review-time check, not a plan gap.

### architecture, documentation, privacy, performance, migrations, a11y, i18n

No findings. Architecture: apparatus under `.dev/floor/`, reusing `changelog-core.mjs` (fit recognized).
Documentation: CONTRIBUTING, README and CLAUDE.md are in `## Files`. Privacy: no personal data. Performance: one
runner held up to ~45 min per bump, bounded. Migrations: none (new tags only; no existing data changes). a11y / i18n:
no UI, no user-facing locale text.

## Summary

The plan is specific and bounded. The five concerns are about failure modes of the workflow itself: a transient API
error ending a long wait, `--jq` filters no test executes, a static check list that drifts open when the ruleset
grows, a token exposed to a step that does not need it, and refusals without a printed reason. Each has a small
in-scope resolution that does not change `## Files`.

ADVISORY VERDICT: 5 concerns raised (0 blocking-severity, 3 important, 2 minor) — for the human to weigh before
`/pharn-dev-build`.
