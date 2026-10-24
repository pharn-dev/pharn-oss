# GRILL — review-dropped-findings

Plan: `.dev/features/review-dropped-findings/PLAN.md` · spec-hash: MATCH
(`2c84959cbca0b2dc51aaad90f90d40e574732c9c5c83c0bda7e1481ecb0db12e` recomputed = pinned) · Step 1b lessons
declaration (FLOOR, `check-plan-lessons.mjs`): **GREEN** — exit 0, "all 8 cited id(s) resolve … and are referenced in
the plan body".

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

## Findings (advisory — each gates nothing)

### Inline axes

```yaml
- type: FINDING
  rule_id: P2
  severity: important
  file: ".dev/features/review-dropped-findings/PLAN.md:218"
  problem: "JSON.stringify escapes C0 controls but NOT U+2028 / U+2029, so a 'quoted' value is one line only by the CommonMark definition of a line ending; a renderer that breaks on those separators sees two lines."
  evidence: "each of its six values is `JSON.stringify(asText(v))` — control characters and newlines escaped, so the value is ONE line"
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/review-dropped-findings/PLAN.md:78"
  problem: "The order of the two PHASE-4 writes is unstated; whichever is second can fail after the first landed, leaving a fresh out.json beside a stale merge-report.json (or the reverse) at exit 1."
  evidence: "| `1`  | usage error or a write failure — nothing usable | not written / stale |"
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/review-dropped-findings/PLAN.md:6"
  problem: "When no lens file exists, Step 5's unexpanded glob reaches the merge as a literal path; that used to die and will now be recorded as an unreadable input with a `*` source, which REVIEW.md would render as a lens named `*`."
  evidence: "read, is not JSON or is not an array no longer aborts the whole merge"
```

### Grillers

- **testability** — presence recognized (`## Files` names the test changes, `## Applied lessons` L60 names a
  negative control per property). No finding.
- **error-handling** — the plan is itself an error-handling change; declared (D2 exit table). The write-order gap is
  the inline minor finding above. No further finding.
- **security** — scanner clean. The untrusted-free-text path into `merge-report.json` and `REVIEW.md` is the axis the
  GATE-1 condition 3 amendment addresses; the residual is the U+2028 finding above. No further finding.
- **architecture / coupling** — fit recognized: the change stays inside one floor CLI and its one command caller; the
  report shape is owned by the CLI header (no contract file, consistent with how `sources[]` / `backstop` are owned).
  No finding.
- **documentation / comprehension** — header rewrite + Step 5/6 text + CHANGELOG declared; the exit-3 choice carries
  its WHY (runtime-floor's 2). No finding.
- **performance** — one finding only as prose: a lens emitting many malformed findings makes `dropped[]` (and the
  rendered section) proportional to that lens's output, which is the same bound `sources[]` already has. No finding.
- **observability** — stderr lines kept, stdout gains a count, the report is a file. No finding.
- **a11y / i18n / migrations / privacy** — the change touches no UI, no user-facing locale text, no persisted schema
  and no personal data. No finding.

## Summary

The plan is a narrow fix to one floor CLI and its one caller. The three concerns are edge cases of the new output
path: a Unicode line separator surviving `JSON.stringify`, the ordering of the two writes, and the unexpanded-glob
input. All three are cheap to settle in the build (escape U+2028/2029 in the quoting function; write `out.json`
first and the report last so a report on disk never describes a merge whose `out.json` failed; leave the glob case
as named behavior or have the source derive from the path as today).

ADVISORY VERDICT: 3 concerns raised (0 blocking-severity, 3 advisory: 1 important, 2 minor) — for the human to weigh
before /pharn-dev-build.
