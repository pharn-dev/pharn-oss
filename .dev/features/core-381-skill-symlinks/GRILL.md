# GRILL — core-381-skill-symlinks

Plan: `.dev/features/core-381-skill-symlinks/PLAN.md` · spec-hash: GREEN (recomputed
`8566b4432ed6cc7035de5d925dafe3755086e23b12acacde0dcdda07a43a9167` equals the pin) · Step 1b lessons declaration:
GREEN (`check-plan-lessons.mjs` exit 0 — applied_lessons L19, L57, L70; the declaration, never the application).

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194044 B of griller files, 99396 B printed; deep omission: 13 pharn-owned, 0 other; left out where present: guarantee-audit (13), machine-readable-emission (13), two-layers (13), layer-1 (13), finding-output (13); kept whole: none

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`)

Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line; a scanner finding
is not the griller's judgment.

Findings: none (no secrets, PII or i18n scanner hit).

- `scan-plan-migrations`: mentions false. Not a finding: whether the plan needs or adequately declares this is the migrations griller's judgment.
- `scan-plan-observability`: mentions false. Not a finding: whether the plan needs or adequately declares this is the observability griller's judgment.

## Findings

### security (P2)

```yaml
- type: FINDING
  rule_id: P2
  severity: important
  file: ".dev/features/core-381-skill-symlinks/PLAN.md:136"
  problem: "The copies commit third-party executable scripts (security-audit's .cjs validators, pharn-ci-* scripts) into the repository; their provenance is a commit pin plus a hash measured once in scratch, and nothing re-checks them on a later edit."
  evidence: "The copied skill trees are third-party/untrusted DATA: copied byte-for-byte, never executed during this work"
```

Checked live: `pharn-install.json` `installRoots` names no `.claude/skills/` path and 0 manifest entries sit there, so
the copies never reach a user's project; they ship only inside the archive, as regular files.

### testability (P1)

```yaml
- type: FINDING
  rule_id: P1
  severity: important
  file: ".dev/features/core-381-skill-symlinks/PLAN.md:129"
  problem: "No committed check stops the next symlink: the acceptance evidence is a one-off measurement, so a later `npx skills add` without copy mode would reintroduce the same outage."
  evidence: "its floor twin is CORE-383, not built here"
```

Accepted as scoped: the plan names CORE-383 (floor check over the archive) as the owner.

### architecture / coupling (P3)

```yaml
- type: FINDING
  rule_id: P3
  severity: minor
  file: ".dev/features/core-381-skill-symlinks/PLAN.md:102"
  problem: "The eslint ignore names one vendored skill, mirroring the markdownlint entry; a future vendored skill with lint errors needs its own entry in both configs."
  evidence: "ignore `.claude/skills/security-audit/**` (third-party; one `no-unused-vars` error measured)"
```

### documentation (P7)

No finding: the user-facing record is the `CHANGELOG.md` `[7.25.6]` section the plan declares, naming the three
uninstallable releases; the two config comments are updated with the change.

### comprehension, error-handling, performance, observability, migrations, privacy, i18n, a11y

No findings: the increment adds no runtime code path, data shape, user-visible text, personal data or UI. The scans
report no secret/PII/i18n hit and no migrations/observability mention.

## Summary

The plan is a mechanical replacement with a measured provenance proof. The standing concerns are that third-party
scripts become committed bytes with no recurring integrity check, and that nothing committed prevents a recurrence
(owned by CORE-383). The `pharn-ci-*`/`pharn-cli` markdown stays inside `lint:md` (it lints clean today), so an
upstream update could redden it; that is noted, not acted on.

ADVISORY VERDICT: 3 concerns raised (0 blocking-severity, 3 advisory) — for the human to weigh before /pharn-dev-build.
