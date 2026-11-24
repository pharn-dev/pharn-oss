# GRILL — early-marker-refusal

Plan: `.dev/features/early-marker-refusal/PLAN.md` · spec hash: matches
(`f058fca367fabcdfecf939dc70bfb43deaadedb1b0e810b790c4aeb156d6775d`) · Step 1b lessons declaration: **GREEN**
(`check-plan-lessons.mjs` exit 0 — applied_lessons L35, L29; all cited ids resolve and are referenced in the body).

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194044 B of griller files, 99396 B printed; deep
omission: 13 pharn-owned, 0 other; left out where present: guarantee-audit (13), machine-readable-emission (13),
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

### Inline — honest scope / completeness (P7, L29)

```yaml
- type: FINDING
  rule_id: P7
  severity: important
  file: ".dev/features/early-marker-refusal/PLAN.md:44"
  problem: "The quick ship part restates Step 2.1's order explicitly, so adding the check to pharn-ship-stages.md alone leaves pharn-ship-quick.md describing an order without it; the file is not in ## Files."
  evidence: "pharn-ship-quick.md item 3: 'the base capture prints <base sha> (item 7 needs it), the marker opens, the snapshot is recorded'"
```

### error-handling griller

```yaml
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/early-marker-refusal/PLAN.md:42"
  problem: "The loop's stop path for a refusal before the marker opens is described as 'straight to the Step 7 summary', but the plan does not say whether the close part's Final step (require-loop-record.cjs --close '<name>' on the run's OWN name, never the owner's) runs; it must not touch the owner's marker, and the text should say which line runs."
  evidence: "Non-zero → STOP, S9 (`blocked: stage-refused`), no feature directory, no marker → straight to the Step 7 summary"
- type: FINDING
  rule_id: P5
  severity: minor
  file: ".dev/features/early-marker-refusal/PLAN.md:31"
  problem: "Exit 2 carries both a usage error (bad name) and a refusal; the commands branch on non-zero only, so this is safe, but the tests should pin both separately so a usage error cannot pass as 'no owner'."
  evidence: "validates `<name>` with `FEATURE_SLUG_RE` (exit 2 on a bad or missing name) ... Refusal → exit 2"
```

### security griller

```yaml
- type: FINDING
  rule_id: P2
  severity: important
  file: ".dev/features/early-marker-refusal/PLAN.md:42"
  problem: "The refusal names a --close line and /pharn-loop pre-approves require-loop-record.cjs --close *, so an unattended model could clear the owner's marker and continue; the plan's 'never runs the --close line' is prose only (advisory) and should be stated in the command and the claims, not implied."
  evidence: "the loop never runs the `--close` line the message names (a human decides the run is dead)"
```

### testability / architecture / coupling / documentation / comprehension / performance / observability / a11y / i18n / migrations / privacy

No findings. Testability: an `## Evals to write` section with concrete CLI and command-text cases is present. Architecture
and coupling: the mode lives in the module that owns `epochOwnerOpen` (L35), no new sibling import. Performance: one
file read and a handful of `lstat`s. Observability: the refusal is a stderr line the summary quotes. a11y, i18n,
migrations, privacy: not applicable (no UI, no user-facing locale text beyond the existing CLI message, no schema, no
personal data).

## Summary

The plan moves an existing floor test earlier rather than adding a new rule, which fits P7 and L35. Two gaps worth fixing
before build: the quick ship part restates the order and must be edited too (add `.claude/commands/pharn-ship-quick.md`
to `## Files`), and the loop text should say plainly that the stop runs no `--close` for the owner's marker — a prose
rule against a pre-approved grant, so advisory. Tests should keep the bad-name exit distinct from a refusal in their
assertions.

ADVISORY VERDICT: 4 concerns raised (0 blocking-severity, 2 important, 2 minor) — for the human to weigh before
/pharn-dev-build.
