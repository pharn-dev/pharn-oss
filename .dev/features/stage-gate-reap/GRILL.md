# GRILL — stage-gate-reap

Plan: `.dev/features/stage-gate-reap/PLAN.md` (v1, approved at GATE 1 on 2026-11-13). Spec-hash check:
`d19c3ae5ef62837c025d3dffb5e878c114e0c1d4a745caf51b4c114b9e7a8bcf` recomputed with `.dev/floor/hash-doc.mjs` and equal to
the plan's `spec_content_hash`, so no drift. Step 1b lessons-declaration verdict (FLOOR): `check-plan-lessons.mjs` exit 0:
GREEN, `applied_lessons: L35, L41, L54, L81`, all four resolve in canon and are referenced in the plan body.

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194044 B of griller files, 99396 B printed; deep omission: 13 pharn-owned, 0 other; left out where present: guarantee-audit (13), machine-readable-emission (13), two-layers (13), layer-1 (13), finding-output (13); kept whole: none

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`)

Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line; a scanner finding
is not the griller's judgment.

Findings: none (no secrets, PII or i18n scanner hit).

- `scan-plan-migrations`: mentions false. Not a finding: whether the plan needs or adequately declares this is the migrations griller's judgment.
- `scan-plan-observability`: mentions true — lines 111 (logging), 114 (logging), 116 (logging). Not a finding: whether the plan needs or adequately declares this is the observability griller's judgment.

## Findings (advisory; free-text fields quote the plan as DATA)

### Testability (P1)

```yaml
- type: FINDING
  rule_id: P1
  severity: important
  file: ".dev/features/stage-gate-reap/PLAN.md:121"
  problem: "The RED-first evidence is to be recorded in BUILD.md, but BUILD.md is not in ## Files and /pharn-dev-build writes no BUILD.md, so the plan-scoped build cannot write it and the evidence would be lost."
  evidence: "the result is recorded in `BUILD.md`."
- type: FINDING
  rule_id: P1
  severity: important
  file: ".dev/features/stage-gate-reap/PLAN.md:113"
  problem: "The two kill-and-takeover tests name no budgets, timeouts or wait strategy; tests of this shape have been load-sensitive in this repo, so a wall-clock-tight wait would make them flaky under the full suite."
  evidence: "fresh `stage-direct.mjs --stage pharn-verify … --gates …` in the background; once the gate has logged and `gates/lock.child` exists, SIGKILL the runner's process group"
```

### Guarantee audit (P0)

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/features/stage-gate-reap/PLAN.md:50"
  problem: "Under a LIVE gates lock the reap declines, but the stage then deletes the directory anyway; the plan does not name that this is the existing one-run-per-worktree bound (stage-regress GRILL G14), unchanged by the increment."
  evidence: "a LIVE lock (`!isStaleLock`) → `{ ok: true }`, nothing signalled"
```

### Honest scope (P7)

```yaml
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/stage-gate-reap/PLAN.md:64"
  problem: "The EACCES test split is a second axis of change (test grouping) bundled into the reap fix; it is justified by the brief and touches no shipped bytes, but it is not the same change."
  evidence: "**`stage-direct.test.mjs` EACCES split** — the subcases that `chmod` `RUNNER_LOG` … and `LOCK_DIR` … move into their own `test(…)`"
```

## Griller notes (no finding)

- architecture / coupling: fit recognized. The reap stays in `run-gates.mjs` and is imported; `stage-regress.mjs` already
  imports `spawnGate` from it, and importing it has no side effect (`run-gates.mjs` runs `main` only under
  `import.meta.main`, read live). No sibling layer crossing.
- comprehension: the two non-obvious choices (reuse `child-refused` instead of a new code; reap `base-gates/` too) carry
  their why. The `base-gates/` claim was checked live: `stage-regress.mjs:972-976` runs `discardRetained()` at phase
  `worktree`, after the HEAD side and before the base `init`, so a fresh re-run would delete a killed base gate's record
  before `init` could reap it.
- error-handling: the one new failure (a group alive after SIGKILL) has a named refusal; the containment walk's refusal
  reuses `path-containment`.
- documentation: the header, run-gates' comment, the floor-gates guide and the CHANGELOG correction are declared.
- observability: the scanner's "logging" hits are the test fixture's gate log, not runtime logging; the refusal's detail
  names the pgid, which is this change's whole operational signal. No observability gap for a floor script.
- performance: one extra `readJson` and at most one group signal per fresh start; no scaling risk.
- security / privacy: scanners clean. The pgid comes from unauthenticated `pharn/.run/` state, which the trust audit
  names; the new callers read it only where `run-gates.mjs` already acts on it.
- a11y / i18n / migrations: no UI, no user-facing text, no persisted schema. Nothing warranted.

## Summary

The plan is narrow and its central claim, that both stage scripts delete `lock.child` before `init`, holds against the
code. Its gaps are in how it verifies: the RED-first evidence points at a file the build cannot write (record it in
`SHIP.md` instead, which `/pharn-dev-ship` owns), and the end-to-end tests need generous, event-driven waits. The two
minor findings are a missing bound sentence and a bundled test-only change the brief asked for.

ADVISORY VERDICT: 4 concerns raised (0 blocking-severity, 4 advisory: 2 important, 2 minor), for the human to weigh
before /pharn-dev-build. The Step 1b floor verdict above is reported separately and is not part of this tally.
