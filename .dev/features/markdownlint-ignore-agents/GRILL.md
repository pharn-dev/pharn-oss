# GRILL — markdownlint-ignore-agents

Plan: `.dev/features/markdownlint-ignore-agents/PLAN.md` · spec-hash: recomputed
`4950796f5342df20a298fe22812e45dec3c15317592bd2358a31e149d2dc1c7f` == the plan's pin (no drift) · Step 1b
lessons-declaration verdict (FLOOR, `check-plan-lessons.mjs`): **GREEN**, exit 0, "all 5 cited id(s) resolve … and are
referenced in the plan body".

Grillers: `count-grillers.mjs` registered 13. The five deterministic plan scanners (`scan-plan-i18n`,
`-migrations`, `-observability`, `-pii`, `-secrets`) each returned an empty hit set. `a11y`, `i18n` and `migrations`
declare `applies` sets (`ssr`/`spa`/`backend`) that a lint-config change does not touch. The universal grillers were
applied inline; only testability, coupling and documentation had anything to say, and they appear below by axis.
Testability Layer 1: a verification approach is **present** (the premise test at PLAN.md:59, and the verify-stage
`lint:md` run with `.agents/` in place), so the griller raises no absence finding.

## Findings (advisory — none gates `/pharn-dev-build`)

### Measurement scope (P6)

```yaml
- type: FINDING
  rule_id: P6
  severity: important
  file: ".dev/features/markdownlint-ignore-agents/PLAN.md:25"
  problem: "The plan measured only lint:md and format:check with .agents/ present; the other whole-repo gates (eslint ., docs:check, validate, npm test's walkers) were not run with it there, so 'lint:md is the only gate it reddens' is assumed, not measured."
  evidence: "`npm run format:check` → **exit 0**. Prettier 3.9.8 reads `.gitignore` by default"
```

The plan keeps the `.agents/` copy in place through `/pharn-dev-verify`, so the verify run of the full gate map answers
this. If a gate other than `lint:md` goes RED only because of `.agents/`, that is a separate out-of-scope failure to
report, not something to fold into this increment.

### Coupling — one axis per file (P3)

```yaml
- type: FINDING
  rule_id: P3
  severity: minor
  file: ".dev/features/markdownlint-ignore-agents/PLAN.md:59"
  problem: "command-hygiene.test.mjs changes when commands change; a probe of a markdownlint ignores entry changes when the lint config changes, so the file gains a second change-reason (the 6.13.1 worktree probe already set that precedent)."
  evidence: "`.dev/floor/command-hygiene.test.mjs` — one new premise test after the existing one"
```

The plan's reason is reuse: `lintedCount`, `REPO_ROOT` and `MDL_BIN` live there, and a new file would duplicate them.
That is a defensible trade. The human approved the plan with it, so this is recorded rather than re-opened.

### Documentation — a count in a living comment (P0)

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/features/markdownlint-ignore-agents/PLAN.md:58"
  problem: "The config comment is described as giving 'the measured reason'; if it carries the file count (19), a living comment then asserts a number the importer can change at any time, while the CHANGELOG entry is the frozen place for a dated measurement."
  evidence: "with a comment giving the measured reason, why prettier needs no twin, and the bound"
```

Suggested build handling, within the plan's `## Files`: name the mechanism (a nested H1 → MD025) in the config
comment, and keep the dated count in the CHANGELOG only.

## Summary

The plan is small and grounded: every claim in its failure section came from a command run this session, and its
guarantee audit labels the config entry as advisory, backed by an executed test that is skipped without the dev
toolchain. The largest gap is scope of measurement. `.agents/` was tested against two of the ten `npm run check`
gates, and verify is where the other eight get answered. The coupling note restates a trade the plan already made on
purpose. The documentation note is a wording choice for the build.

ADVISORY VERDICT: 3 concerns raised (0 blocking-severity, 1 important, 2 minor) — for the human to weigh before
/pharn-dev-build. The Step 1b lessons-declaration verdict above is a separate floor result and is not counted here.
