# GRILL — lessons-canon-root

Plan: `.dev/features/lessons-canon-root/PLAN.md` · spec hash: recomputed `2c84959c…b12e` = the plan's pin (no drift) ·
Step 1b lessons declaration: **GREEN** (`check-plan-lessons.mjs` exit 0 — L1, L19, L22, L29, L31, L35, L36, L41, L72
resolve and are referenced in the body; the declaration, never the application).

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194015 B of griller files, 99391 B printed;
deep omission: 13 pharn-owned, 0 other; left out where present: guarantee-audit (13), machine-readable-emission (13),
two-layers (13), layer-1 (13), finding-output (13); kept whole: none

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`)

Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line; a scanner finding is
not the griller's judgment.

Findings: none (no secrets, PII or i18n scanner hit).

- `scan-plan-migrations`: mentions false. Not a finding: whether the plan needs or adequately declares this is the
  migrations griller's judgment.
- `scan-plan-observability`: mentions false. Not a finding: whether the plan needs or adequately declares this is the
  observability griller's judgment.

## Findings

### Error handling (P7)

```yaml
- type: FINDING
  rule_id: P7
  severity: important
  file: ".dev/features/lessons-canon-root/PLAN.md:68"
  problem: "The canon-root parser is lexical only; a repo-relative root that is a symlink to a directory outside the repo is accepted and read, and the plan does not say so."
  evidence: "a repo-relative POSIX path, segments of `[A-Za-z0-9._-]`, no `.`/`..` segment, not absolute"
```

Disposition proposed: state the bound in `canon-root.mjs`'s header (the CLIs only READ under the root; no write goes
there; the caller chooses the root). No filesystem resolution — resolving would add a symlink-follow decision this
increment has no failure to justify (P7).

```yaml
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/lessons-canon-root/PLAN.md:83"
  problem: "check-provenance gains the runtime floor and an entry gate, so on a Node below the floor it now exits 2 instead of running; that is a user-visible behaviour change of a shipped checker the plan lists only as a mechanism."
  evidence: 'gains `import "./runtime-floor.mjs"` first and an `import.meta.main` gate'
```

Disposition proposed: name it in the CHANGELOG. `/pharn-memory-promote` already treats any non-zero exit as RED, so it
fails closed.

### Architecture (P3)

```yaml
- type: FINDING
  rule_id: P3
  severity: minor
  file: ".dev/features/lessons-canon-root/PLAN.md:72"
  problem: "The product core will render header prose supplied by its caller (storageNote / columnsNote), so the dev surface's wording lives in a .dev file but is emitted by product code; a caller-supplied note bypasses the title fence/control-char refusals."
  evidence: "A `profile` object (`canonPath`, `outPath`, `gen`, `regen`, `storageNote`, `columnsNote`)"
```

Disposition proposed: acceptable — profiles are code-supplied (trusted), never derived from canon; the CHECK-5 refusal
already runs over the whole rendered content. Say so at the parameter.

### Testability (P1)

Presence recognized: the plan names tests per file, a no-flag default test per CLI (L41), a thinness closure and a
dogfood test, and leans on `docs:check` for the byte-identity of `docs/lessons-index.md`.

```yaml
- type: FINDING
  rule_id: P1
  severity: important
  file: ".dev/features/lessons-canon-root/PLAN.md:44"
  problem: "The thinness closure must be shown to discriminate (a wrapper that re-declares a grammar constant fails), or it certifies by staying silent."
  evidence: "a thinness closure: a dev wrapper may not declare the grammar"
```

Disposition proposed: a negative control in the same test (inject `const HEADING_RE = …` into the wrapper's source text
and require the rule to fire).

### Coupling, documentation, comprehension, performance, security, privacy, observability, migrations, a11y, i18n

- Coupling: `.dev/` → `pharn/` only; no product file imports `.dev/`. Fit recognized.
- Documentation: the new flags are documented in each CLI's usage header, the floor-checks guide and the CHANGELOG;
  the Q2 bound is recorded in the plan. Declaration recognized.
- Comprehension: the reason the dev wrappers still exist (their committed-index verdicts and throw-on-absent canon)
  is stated in the plan; it must reach the wrapper headers. No finding.
- Performance: one extra generator run on COLD/STALE over a ~210 KB file. No finding.
- Security: the root value comes from pinned command lines or a contributor shell; validated before any join. The
  symlink bound is the error-handling finding above. No separate finding.
- Privacy, observability, migrations, a11y, i18n: not touched.

## Summary

The plan is a refactor with two small behaviour additions (two flags; a mandatory regenerate step). The concerns are
bounds to state (symlinked root, the runtime-floor exit on old Node, caller-supplied header prose) and one test
obligation (a negative control on the thinness closure). None asks to change the design.

ADVISORY VERDICT: 4 concerns raised (0 blocking-severity, 2 important, 2 minor) — for the human to weigh before
/pharn-dev-build.
