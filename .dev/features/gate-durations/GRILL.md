# GRILL — gate-durations

Plan: `.dev/features/gate-durations/PLAN.md` · spec-hash: `d19c3ae5…8bcf` matches the live `pharn/ARCHITECTURE.md` ·
**Step 1b lessons declaration: GREEN** (`check-plan-lessons.mjs` exit 0 — L35, L36, L60, L62, L63, L84 resolve and are
referenced in the body; that they were applied is advisory).

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194044 B of griller files, 99396 B printed; deep
omission: 13 pharn-owned, 0 other; left out where present: guarantee-audit (13), machine-readable-emission (13),
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

### Trust / privacy (inline P2; privacy and security grillers)

```yaml
- type: FINDING
  rule_id: P2
  severity: important
  file: ".dev/features/gate-durations/PLAN.md:81"
  problem: >-
    The work-row id rule (`isIdentityToken`) admits any short, path-free string, and a `--gates` token's id DEFAULTS
    TO ITS COMMAND (gate-run-core.mjs:396), so a command line — possibly carrying a token or a URL — would be copied
    into the committed cost.json.
  evidence: "`id` the stamp id when it is an identity token (`cost-value-core.mjs isIdentityToken` ...), else `null`"
```

Remedy proposed for the build: copy an id only when it is a MEMBER of a closed set — `ALLOWLIST`, `RESERVED_IDS`, or
`STRUCTURAL_PREFIX` followed by an identity token — and write `null` otherwise (`seq` still maps the row to the stamp).
The same rule gates the entry `gate` event's id, where it refuses the event instead.

### Guarantee audit (inline P0)

```yaml
- type: FINDING
  rule_id: P0
  severity: important
  file: ".dev/features/gate-durations/PLAN.md:236"
  problem: >-
    "floor by construction in the runner" and "floor-tested parity" label tested runner behaviour as floor, but
    neither reduces to a hook, a content-hash or an enum/regex check.
  evidence: "a timed-out run's `duration_ms >= timeoutMs` → floor by construction in the runner"
```

Remedy: label both as tested behaviour (advisory as a guarantee). Floor stays limited to the shape checks
(`validateStamp`, `validateWork`, `validateEntryEvent`) and the source closure scan, which is a regex check run in the
suite and bounded to today's files.

### Error handling / migrations

```yaml
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/gate-durations/PLAN.md:89"
  problem: >-
    The plan states what an older reader does with a new entry line (Q3) but not with a `/2` work line; after a
    downgrade an older emitter drops it into `dropped[]` as `work.jsonl[<n>]`, which the contract should say too.
  evidence: "`work.jsonl` is never pruned, so every reader keeps admitting `/1` lines."
```

### Documentation / comprehension

```yaml
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/gate-durations/PLAN.md:114"
  problem: >-
    Retiring the residual should name the processes still not timed per gate in the ledger — the regress install
    (it has `install.ms`), /pharn-build's project gate, /pharn-test's red run — so "per-gate durations are recorded"
    is not read as covering every process PHARN runs.
  evidence: "the three sentences that name the residual are replaced, and `gate-process-duration` is recorded as retired"
- type: FINDING
  rule_id: P5
  severity: minor
  file: ".dev/features/gate-durations/PLAN.md:98"
  problem: >-
    The `gate` event's identity key `(nonce, gate, id)` has no consumer once the view drops gate events (the checker's
    duplicate rule is exact-canonical); define it for totality but say it decides nothing.
  evidence: "Identity key `(nonce, gate, id)`: a gate id runs once per invocation"
```

### Griller axes with no finding

- **architecture / coupling (P3):** fit recognized. The value has one producer (`run-gates.mjs`), one shape owner per
  record (`gate-run-core`, `stage-work`, `entry-observations`), and the entry drain already reads `run --next` stdout;
  no sibling import is added (`stage-work.mjs` already imports `cost-value-core.mjs`).
- **testability (P1):** presence recognized — six criteria, each mapped to named tests, with L60 controls and L84
  realistic-input runs.
- **performance:** no scaling risk recognized (one `performance.now()` pair per gate, one appended line per gate).
- **error-handling:** present and adequate for the change — every new write is the existing best-effort, never-throwing
  append; a run whose stdout lacks `duration_ms` writes no event.
- **observability:** the increment is itself an observability record; nothing further owed.
- **a11y, i18n:** not applicable (no UI, no user-facing text). **migrations:** no schema of a datastore; the record
  version change is covered by the finding above. **privacy, security:** covered by the P2 finding.

## Summary

The plan is narrowly scoped and its criteria map to tests. Two concerns are worth acting on before or during the build:
the id copied into `cost.json` must be a membership-tested value, not any path-free string (a `--gates` command line is
its default id), and two guarantee labels overstate tested behaviour as floor. Three minor documentation points
(downgrade behaviour of `/2` work lines, the processes still untimed, an identity key with no consumer) belong in the
contracts.

ADVISORY VERDICT: 5 concerns raised (0 blocking-severity, 2 important, 3 minor) — for the human to weigh before
/pharn-dev-build. The Step 1b result above is a separate floor verdict and is not counted here.
