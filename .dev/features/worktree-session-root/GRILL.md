# GRILL — worktree-session-root

Plan: `.dev/features/worktree-session-root/PLAN.md`. Spec hash: `pharn/ARCHITECTURE.md` hashes to
`8566b4432ed6cc7035de5d925dafe3755086e23b12acacde0dcdda07a43a9167`, equal to the plan's pin. Step 1b lessons
declaration: **GREEN** (`check-plan-lessons.mjs` exit 0 — L26, L31, L37, L45, L68, L88 resolve and are referenced).

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
  severity: minor
  file: ".dev/features/worktree-session-root/PLAN.md:74"
  problem: "After a Bash cd into another git tree (an added working directory holding someone else's clone), enforce judges writes there by that tree's own scope record and posture, which that tree's author controls."
  evidence: "- **Moving `cwd`** (after a Bash `cd`): jurisdiction follows the session; stated in `pharn/LIMITS.md §7`."
```

### testability (P1)

```yaml
- type: FINDING
  rule_id: P1
  severity: minor
  file: ".dev/features/worktree-session-root/PLAN.md:1"
  problem: "The new behaviour is executed by spawning the guard scripts by path; no test runs the COMMITTED settings.json command strings with a payload cwd (L45's invocation layer)."
  evidence: "the tests run each guard the way Claude Code did in the measured session (process cwd = the launch checkout, `CLAUDE_PROJECT_DIR` set, the session in the payload)"
```

### honest scope (P7)

```yaml
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/worktree-session-root/PLAN.md:75"
  problem: "The /pharn-loop Stop guard keeps the same root defect; leaving it out is a scope choice, so it must be named in the CHANGELOG and handed back as a follow-up, not lost."
  evidence: "- **Not in this increment (named follow-up):** `require-loop-record.cjs` (the `/pharn-loop` Stop guard) has the same"
```

Griller axes with no finding: architecture (fit recognized — the change stays inside the two guards, reuses
`workTreeRoot()` unchanged and the existing copy-pin pattern), coupling, error-handling (an unusable payload `cwd`
returns null and falls back; module-level throws still reach the registered `uncaughtException` deny), performance
(one extra `JSON.parse` and one directory walk per write), comprehension and documentation (header blocks and
§7 state the rule and its reason), and a11y, i18n, migrations, observability, privacy (no surface).

## Summary

The plan is sound in shape. The first finding is a stated, accepted bound: a moved `cwd` hands a write's judgment to
the tree the session moved into, but never widens a path of the launch tree; `pharn/LIMITS.md §7` says so. The
second is a coverage note — the wiring is unchanged, so the hook suites' direct spawns with a real payload `cwd`
exercise the changed code; a wiring-level case would add little. The third asks that the excluded Stop guard be
recorded, which the CHANGELOG entry already plans.

ADVISORY VERDICT: 3 concerns raised (0 blocking-severity, 3 advisory) — for the human to weigh before /pharn-dev-build.
