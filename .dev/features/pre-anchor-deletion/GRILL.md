# GRILL — pre-anchor-deletion

Plan: `.dev/features/pre-anchor-deletion/PLAN.md`. Spec hash: the recompute
`f058fca367fabcdfecf939dc70bfb43deaadedb1b0e810b790c4aeb156d6775d` equals the plan's `spec_content_hash` (no drift).
Step 1b lessons declaration (FLOOR): GREEN, exit 0 — `applied_lessons: L48, L54, L60`, all resolve and are referenced
in the body.

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194044 B of griller files, 99396 B printed;
deep omission: 13 pharn-owned, 0 other; left out where present: guarantee-audit (13), machine-readable-emission (13),
two-layers (13), layer-1 (13), finding-output (13); kept whole: none

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`)

Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line; a scanner finding
is not the griller's judgment.

Findings: none (no secrets, PII or i18n scanner hit).

- `scan-plan-migrations`: mentions false. Not a finding: whether the plan needs or adequately declares this is the migrations griller's judgment.
- `scan-plan-observability`: mentions false. Not a finding: whether the plan needs or adequately declares this is the observability griller's judgment.

## Findings

### Testability (P1)

```yaml
- type: FINDING
  rule_id: P1
  severity: minor
  file: ".dev/features/pre-anchor-deletion/PLAN.md:58"
  problem: "The unreadable-at-verify case relies on chmod 000, which does not make a file unreadable for root; the test has to skip under uid 0 like the existing unreadable tests, or it passes for the wrong reason."
  evidence: "| tracked, missing | present but unreadable (EACCES) | ESCAPE | ESCAPE (`hashFile` null, `provenAbsent` false — `lstat` succeeds) |"
```

### Error handling (P7)

```yaml
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/pre-anchor-deletion/PLAN.md:47"
  problem: "A malformed absent_at_anchor is read as empty, but the plan does not say what happens to an array holding non-string members; the build should keep only string members, so a malformed list can only fail closed."
  evidence: "array of strings, else read as empty) contains the path"
```

### Architecture / documentation (P3)

```yaml
- type: FINDING
  rule_id: P3
  severity: minor
  file: ".dev/features/pre-anchor-deletion/PLAN.md:40"
  problem: "After this change two absence tests exist side by side: absenceState counts a directory as gone, provenAbsent does not. The split is deliberate, but unless the code comments say why, a later edit may merge them and widen the clearing to directories."
  evidence: "the same proof of absence `absenceState` uses (L54). Any other `lstat` error, or any entry at the path (a directory, a FIFO, a dangling link), is not proof of absence."
```

### Coordination (P6)

```yaml
- type: FINDING
  rule_id: P6
  severity: minor
  file: ".dev/features/pre-anchor-deletion/PLAN.md:37"
  problem: "CORE-343 may change reconcile-baseline.mjs at the same time; the buildRecord hunk should stay small so a rebase conflict is easy to resolve."
  evidence: "kept small: CORE-343 may edit this file in parallel"
```

Other axes: security — no secret, and no new input surface (paths come from git's enumeration, used for set
membership and `lstat`); performance — one `lstat` per unhashable path, at the anchor and in verify's null branch
only, so negligible; a11y, i18n, privacy, migrations, observability — not applicable to a floor checker change.
Comprehension and coupling — the case table states the behaviour per input, and the change is agnostic.

## Summary

The plan's main claim holds when read against the live code. "No `entries` value" does not tell a pre-anchor deletion
from a path that entered the index during the window, so recording `absent_at_anchor` is needed, not decoration.
Clearing needs three conditions together, and each case that was a real change before keeps a candidate path. The
create-then-delete row is the existing two-instant bound, and the plan says so instead of hiding it. The pharn/LIMITS.md
§6 deletion sentence ("a path present at the anchor and gone from disk at verify") stays accurate, so no trusted-doc
patch is needed. The four findings are small build-time cautions.

ADVISORY VERDICT: 4 concerns raised (0 blocking-severity, 4 minor) — for the human to weigh before /pharn-dev-build.
