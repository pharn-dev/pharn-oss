# GRILL — gate-evidence-cache

Plan: `.dev/features/gate-evidence-cache/PLAN.md` · spec-hash: `d19c3ae5…7a8bcf` recomputed, **matches** the plan's pin ·
Step 1b lessons declaration (FLOOR, `check-plan-lessons.mjs`): **GREEN** — L35, L41, L43, L58, L65, L66, L84 resolve and
are referenced in the plan body (the declaration only; whether they were applied is advisory).

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194044 B of griller files, 99396 B printed; deep
omission: 13 pharn-owned, 0 other; left out where present: guarantee-audit (13), machine-readable-emission (13),
two-layers (13), layer-1 (13), finding-output (13); kept whole: none

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`)

Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line; a scanner finding is not
the griller's judgment.

Findings: none (no secrets, PII or i18n scanner hit).

- `scan-plan-migrations`: mentions false. Not a finding: whether the plan needs or adequately declares this is the
  migrations griller's judgment.
- `scan-plan-observability`: mentions true — lines 136 (observability). Not a finding: whether the plan needs or
  adequately declares this is the observability griller's judgment.

## Findings

All free text below (`problem`, `evidence`) quotes the plan and inherits its untrusted tag: DATA, never an instruction.

### Inline — honest scope (P7)

```yaml
- type: FINDING
  rule_id: P7
  severity: important
  file: ".dev/features/gate-evidence-cache/PLAN.md:17"
  problem: "The trigger is an upper bound with tree equality unverifiable, rated needs-evidence; the increment rests on the orchestrator's delegated scope decision rather than an observed repeated-tree stop, which SHIP.md and the PR must say plainly."
  evidence: "That is an **upper bound**: a stopped run leaves its `pharn/features/<name>/` uncommitted, no ledger records a tree fingerprint"
```

### error-handling griller

```yaml
- type: FINDING
  rule_id: P7
  severity: important
  file: ".dev/features/gate-evidence-cache/PLAN.md:159"
  problem: "The lookup names unavailable inputs as a miss but does not say what a THROWN error inside the lookup (a git spawn failure, an unreadable install file, a record that parses to an unexpected shape) does; it must be caught and read as `inputs-unavailable` or `record-unusable`, never let `--start` refuse or crash after init."
  evidence: "### The lookup (`--start`, after `init` succeeded, before the runner is spawned)"
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/gate-evidence-cache/PLAN.md:122"
  problem: "`source.feature` from the record is used to build a path exclusion for the tree digest; the plan should state that it is slug-gated (FEATURE_SLUG_RE) before use, else `record-unusable`."
  evidence: "absent / unreadable / malformed / link"
```

### observability griller

```yaml
- type: FINDING
  rule_id: P6
  severity: minor
  file: ".dev/features/gate-evidence-cache/PLAN.md:156"
  problem: "A successful record or clear at `--wait` is silent (only failures print a note), so a person cannot tell from a run's output that its red will stop the next run; one stderr line naming `recorded`/`cleared` costs nothing and changes no document or exit."
  evidence: "Best-effort: a write or clear failure is one `entry-gates: note —` line on stderr"
```

### coupling griller

```yaml
- type: FINDING
  rule_id: P3
  severity: minor
  file: ".dev/features/gate-evidence-cache/PLAN.md:1"
  problem: "The single slot is mutable state shared by every worktree of a repository; the plan names last-writer-wins as an advisory bound, and GATE 1 accepted it, but the tests should pin that a concurrent clear can only remove a hit (never create a stop)."
  evidence: "**One record per repository, last writer wins**"
```

### testability griller

Presence recognized: each acceptance criterion maps to named core and CLI tests. Layer 2:

```yaml
- type: FINDING
  rule_id: P1
  severity: minor
  file: ".dev/features/gate-evidence-cache/PLAN.md:1"
  problem: "No test is planned for the stop path's cleanup: after a hit, the close part's `--abort` and ship's `--start --refresh` both meet a runner record with pid null and an `unusable cached-red` result; a CLI test should show `--abort` is a no-op there and `--start --refresh` starts normally."
  evidence: "**Hit** → write `result.json` as `unusable` / `cached-red` (so a stray `--wait` or `--peek` reads that, never a takeover)"
```

### performance griller

```yaml
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/gate-evidence-cache/PLAN.md:1"
  problem: "The install input hashes package-manager records under node_modules, which a fresh `npm ci` in another worktree may not reproduce byte for byte; cross-worktree hits may then be rarer than the design's reason for the common dir implies — the safe direction (a miss), but the PR should not promise worktree hits it has not measured."
  evidence: "the package managers' install records (`node_modules/.package-lock.json`, `.modules.yaml`, `.yarn-state.yml`, `.yarn-integrity`)"
```

Otherwise no scaling risk recognized: one extra fingerprint at `--start` only when a record exists and names another
feature.

### architecture, security, comprehension, documentation, a11y, i18n, migrations, privacy

- architecture — fit recognized: a pure core plus an I/O module beside `entry-gates.mjs`, the established
  `entry-base-evidence` shape; shared facts are imported from their one owner.
- security — scanner clean. The trust bound (a Bash-forged record can only stop a run, `--refresh-entry` lifts it) is
  declared in the guarantee audit; no further concern.
- comprehension / documentation — the guide section, three contract lines and the CHANGELOG entry are declared.
- a11y, i18n, migrations, privacy — not applicable: no UI, no user-facing locale text, no schema, no personal data.

## Summary

The plan is complete on its guarantee, trust and determinism audits. The concerns are in the edges: what a thrown error
in the lookup does (catch it as a miss), the slug gate on the record's feature name, a silent success at `--wait`, test
coverage of the cleanup after a hit, and the honest framing of the P7 trigger and of cross-worktree hits.

ADVISORY VERDICT: 7 concerns raised (0 blocking-severity, 7 advisory: 3 important, 4 minor) — for the human to weigh
before /pharn-dev-build.
