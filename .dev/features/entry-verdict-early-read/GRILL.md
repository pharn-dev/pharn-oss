# GRILL — entry-verdict-early-read

Plan: `.dev/features/entry-verdict-early-read/PLAN.md` · spec-hash: MATCH (`ab4dbd92…c7fd`) · Step 1b lessons
declaration (FLOOR, `check-plan-lessons.mjs`): **GREEN** — applied_lessons L22, L31, L35, L36, L44, L66, L72, L83 all
resolve and are referenced in the plan body (the declaration only; whether they were applied is advisory).

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

### Inline — guarantee audit / evals (P0, P1)

```yaml
- type: FINDING
  rule_id: P6
  severity: blocking
  file: ".dev/features/entry-verdict-early-read/PLAN.md:62"
  problem: "The in-progress stamp view as specified would never pass validateStamp: validateStamp ends with coverageGap(stamp) and refuses 'coverage-violation' when any required gate is missing from runs, which is every partial run. The partial red path would always print continue, and the increment would save nothing on the measured run. Verified live: pharn/floor/gate-run-core.mjs, the `coverageGap` check before the caller expectations."
  evidence: "`finalized: true`, `fingerprint.final` = the last run's `fp_after`, the in-progress-only keys (`entries`, `cwd`, `reuse`) dropped"
- type: FINDING
  rule_id: P1
  severity: important
  file: ".dev/features/entry-verdict-early-read/PLAN.md:177"
  problem: "No eval holds a partial state whose `required` lists more gates than have run, which is the only realistic partial state; the eval set as listed can pass with a view that coverage-refuses every real partial run. The partial-red evals must use a state with unrun required gates."
  evidence: "peek, in progress, a non-style gate red → exit 4, `red` names it"
```

**Remedy for both, inside the declared `## Files` (no new file):** `inProgressStampView` also sets `required` to the
`required` ids that already appear in `runs` (completeness is exactly what a partial view lacks, and every other
check still runs over the runs so far), and the partial evals build states with unrun required gates. This narrows
the plan's literal view description; record it in `SHIP.md`.

### Inline — determinism / copy-pair (P5, L31)

```yaml
- type: FINDING
  rule_id: P5
  severity: minor
  file: ".dev/features/entry-verdict-early-read/PLAN.md:93"
  problem: "The /pharn-ship carried-Continue rule (a Continue at the early read means the final read's 4/6 proceeds without asking) is a branch the wiring test does not pin; only Stop/Continue are listed for ship. A later edit could drop it and the human would be asked twice."
  evidence: "A **Continue** answer here carries to Step 2.3's final read"
```

### coupling / architecture (P3)

```yaml
- type: FINDING
  rule_id: P3
  severity: minor
  file: ".dev/features/entry-verdict-early-read/PLAN.md:58"
  problem: "entry-gates now reads run-gates' in-progress state.json, whose in-progress-only keys are run-gates' internal detail. The coupling is to run-gates' documented single-store rule (state.json is the stamp in progress), which the module header should cite as the owner rather than restating the key list."
  evidence: "Read the in-progress `pharn/.run/pharn-entry/gates/state.json` (run-gates writes it atomically per gate and removes it at finalize)"
```

### security / error-handling (P2)

```yaml
- type: FINDING
  rule_id: P2
  severity: minor
  file: ".dev/features/entry-verdict-early-read/PLAN.md:58"
  problem: "The plan says the partial read is lstat-first through readInProject, but names no eval for a symlinked or oversized state.json; the existing --wait read of stamp.json has the same reader, so a test that a symlinked state.json yields continue (never a decision) would pin the reuse."
  evidence: "read lstat-first through `readInProject`, agreement checked, never provenance"
```

### observability

```yaml
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/entry-verdict-early-read/PLAN.md:40"
  problem: "--peek appends no observation, so the cost ledger cannot tell a run stopped by an early read from one stopped by the final read, nor count early reads. Acceptable as stated (the record's S14/S14b and its next_steps carry the verdict), but it is a measurement gap for judging whether the early read saves time."
  evidence: "no observation line"
```

### Grillers with nothing to raise

- testability — presence recognized (`## Evals to write (P1)`); adequacy concern raised above (P1).
- documentation — declaration recognized (README, CHANGELOG, `.dev/guides/floor-gates.md`, module headers).
- error-handling — declaration recognized (every undecidable partial case → `continue`; the unusable-final bound stated).
- performance — one extra non-blocking read of three small JSON files per boundary; nothing at scale.
- a11y, i18n, migrations, privacy — not touched (no UI, no user text, no schema, no personal data).
- comprehension — the "why" (the measured run and the finalize-only result) is in the plan; carry it into the
  module header.

## Summary

One concern matters before the build: as written, the partial view fails `validateStamp`'s coverage check on every
real partial run, so the feature's purpose would silently not happen (it would degrade to `continue`, the safe
direction, which is why no other test would notice). The fix is one line in the planned `inProgressStampView` plus
evals over states with unrun required gates. The rest are pins and header citations.

ADVISORY VERDICT: 6 concerns raised (1 blocking-severity, 1 important, 4 minor) — for the human to weigh before
/pharn-dev-build.
