# GRILL — triage-model-key

Plan: `.dev/features/triage-model-key/PLAN.md` · spec-hash: matches (`f3d8748e…`, `hash-doc.mjs`) · lessons
declaration: GREEN (`check-plan-lessons.mjs` exit 0: L33, L50 resolve and are referenced in the body).

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194044 B of griller files, 99396 B printed;
deep omission: 13 pharn-owned, 0 other; left out where present: guarantee-audit (13), machine-readable-emission (13),
two-layers (13), layer-1 (13), finding-output (13); kept whole: none

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`)

Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line; a scanner finding is not
the griller's judgment.

Findings: none (no secrets, PII or i18n scanner hit).

- `scan-plan-migrations`: mentions false. Not a finding: whether the plan needs or adequately declares this is the
  migrations griller's judgment.
- `scan-plan-observability`: mentions false. Not a finding: whether the plan needs or adequately declares this is the
  observability griller's judgment.

## Findings

### Interrogation — P6 (doc vs the referent it describes)

```yaml
- type: FINDING
  rule_id: P6
  severity: important
  file: ".dev/features/triage-model-key/PLAN.md:41"
  problem: "The plan tells a project it may add a `triage` key but not what happens to that edit later: pharn-cli's own reference says `pharn update` keeps a block the project changed and a re-run `pharn init` replaces it with pharn-oss's, which names no `triage` key."
  evidence: "a project on pharn-cli 0.18.1 or newer may add `models.stages.triage`"
```

Read live: `~/Projects/pharn-cli/docs/reference/pharn-config.md:245-258` ("`pharn update` treats the block like a
file … one you changed is kept"; "A re-run `init` replaces your block with pharn-oss's"). The build can cite that page
rather than restate it (P4).

### testability (P1)

Presence recognized: the plan's guarantee audit names the existing `★ live ★ L41` test (the shipped block names no
`triage` key) and `check-model-config.mjs agreement` (an own key is held to the frontmatter) as what checks it.

```yaml
- type: FINDING
  rule_id: P1
  severity: minor
  file: ".dev/features/triage-model-key/PLAN.md:67"
  problem: "The new sentence's one new fact — the pharn-cli 0.18.1 boundary — is checked by nothing in this repo; it is labelled advisory, which is the honest state, and will go stale silently if pharn-cli changes it."
  evidence: '"pharn-cli 0.18.1 accepts a `triage` key" → advisory'
```

### documentation (P7)

No finding: the increment is itself the documentation for an existing surface (`models.stages`), and it adds none.

### The other ten grillers

a11y, architecture, comprehension, coupling, error-handling, i18n, migrations, observability, performance, privacy,
security: no finding. The plan changes one prose bullet, one test comment and one CHANGELOG entry; it adds no code path,
interface, data, schema, user-facing UI text, dependency or new coupling between files.

## Summary

The plan is a docs correction of a sentence that expired when pharn-cli 0.18.1 shipped. Its sweep is stated with its
boundary. The one substantive gap: a project that adds the key should know how `pharn update` and a re-run `pharn init`
treat its edited block — a cite to pharn-cli's reference closes it. The version boundary itself stays advisory.

ADVISORY VERDICT: 2 concerns raised (0 blocking-severity, 1 important, 1 minor) — for the human to weigh before
/pharn-dev-build.
