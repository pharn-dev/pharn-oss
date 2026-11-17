# GRILL — install-manifest

Plan: `.dev/features/install-manifest/PLAN.md`. Spec hash: `f058fca3…6775d` recomputed, equal to the plan's pin (no
drift). Step 1b `check-plan-lessons.mjs`: **GREEN** (exit 0, 10 cited ids resolve and are referenced). GATE 1 was
approved by the orchestrator with three answers (minor bump; edit `check-model-config.mjs`; one `dest` plus legacy
roots) and three extra requirements (the CLI's `applies` shape, a relied-on vs must-check list in the schema doc, a
spike harness runnable read-only against pharn-cli `main`). The findings below read the plan together with those.

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194044 B of griller files, 99396 B printed; deep omission: 13 pharn-owned, 0 other; left out where present: guarantee-audit (13), machine-readable-emission (13), two-layers (13), layer-1 (13), finding-output (13); kept whole: none

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`)

Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line; a scanner finding
is not the griller's judgment.

Findings: none (no secrets, PII or i18n scanner hit).

- `scan-plan-migrations`: mentions true — lines 43 (migration), 127 (migration). Not a finding: whether the plan needs or adequately declares this is the migrations griller's judgment.
- `scan-plan-observability`: mentions false. Not a finding: whether the plan needs or adequately declares this is the observability griller's judgment.

## Findings

### error-handling / performance (P7)

```yaml
- type: FINDING
  rule_id: P7
  severity: important
  file: .dev/features/install-manifest/PLAN.md
  problem: "The no-git fallback walks the whole target, node_modules included, to filter a handful of roots."
  evidence: "Decision 6: `gitListing` ... falling back to a walk when git cannot answer"
```

Remedy taken into the build: the fallback walks only the roots the declaration names (`.claude/`, `pharn/`, `LICENSE`),
never the whole tree, so a fixture or an extracted tarball without git costs what the install surface costs.

### testability (P1) — the orchestrator's `applies` requirement

```yaml
- type: FINDING
  rule_id: P1
  severity: important
  file: .dev/features/install-manifest/PLAN.md
  problem: "The plan copies `applies` as parsed, but GATE 1 requires the CLI's shape: the string 'universal' or an archetype array."
  evidence: "`capabilities` from `enumerateCapabilities` ... `applies`/`role` values are copied as parsed"
```

Remedy: `["universal"]` renders as `"universal"`; any other list renders as the array. `universal` beside another
token, an empty list or a non-string token is a refusal (`ENUM_ERROR`), tested per case. Membership of each archetype
token in `{ssr, backend, spa, lib}` stays `validate.mjs` CHECK 4b's (CI "Validate floor"); the schema doc states the
enum and says the CLI re-checks it.

### error-handling (P7) — destination uniqueness

```yaml
- type: FINDING
  rule_id: P7
  severity: important
  file: .dev/features/install-manifest/PLAN.md
  problem: "The LICENSE mapping makes `dest` differ from `path`, and nothing in the plan refuses two files with one dest."
  evidence: "`license` `LICENSE` dest `pharn/LICENSE`"
```

Remedy: a duplicate `dest` is a refusal; the schema doc lists "dest unique" among the properties the generator
refuses to break and the CLI must still check.

### coupling (P3)

```yaml
- type: FINDING
  rule_id: P3
  severity: advisory
  file: .dev/floor/install-manifest-core.mjs
  problem: "The core imports `check-surface-bump.mjs`, a per-PR gate CLI, for its glob matcher and version regex."
  evidence: "Reuses ... `matchesGlob`/`VERSION_RE` (`check-surface-bump.mjs`)"
```

Accepted as is: reusing the one closed glob matcher is P4 (one grammar for both declarations, and the closure test
compares sets written in it); a copy would be the second copy L35 warns about. Its import is side-effect free.

### Inline axes with no finding

- Guarantee audit (P0): each claim is floor or labelled advisory; the spike is labelled a measurement.
- Trust (P2): inputs are this repo's own files; the CLI-side trust is CORE-194's and is named.
- Determinism (P5): every branch is a membership, equality, lstat or regex test; refusals are throws.
- Scope (P7): one increment (declaration + generator + checker + the docs the owner asked for); the trigger is real.
- a11y, i18n, migrations, privacy, observability, security griller axes: no UI, no locale text, no schema, no PII, no
  runtime service, no new input surface beyond repo files — fit recognized, no finding. Architecture: the
  `.dev/ → pharn/` import direction is the allowed one — fit recognized. Documentation/comprehension: RFC and schema doc
  are declared — presence recognized.

## Summary

The plan is sound in shape. Three gaps are folded into the build: the fallback walk's width, the `applies` shape the
CLI needs, and destination uniqueness. One coupling note is accepted.

ADVISORY VERDICT: 4 concerns raised (0 blocking-severity, 3 important, 1 advisory) — for the human to weigh before
/pharn-dev-build. This verdict covers the interrogation only; the Step 1b result above is its own floor verdict.
