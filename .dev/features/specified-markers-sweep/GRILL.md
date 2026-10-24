# GRILL — specified-markers-sweep

Plan: `.dev/features/specified-markers-sweep/PLAN.md` · spec-hash: recomputed
`2c84959cbca0b2dc51aaad90f90d40e574732c9c5c83c0bda7e1481ecb0db12e` = the plan's pin (no drift) · **Step 1b
lessons declaration: GREEN** (`check-plan-lessons.mjs` exit 0 — all 10 cited ids resolve and are referenced in the
body; this verifies the declaration, never the application).

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194015 B of griller files, 99391 B printed; deep omission: 13 pharn-owned, 0 other; left out where present: guarantee-audit (13), machine-readable-emission (13), two-layers (13), layer-1 (13), finding-output (13); kept whole: none

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`)

Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line; a scanner finding
is not the griller's judgment.

Findings: none (no secrets, PII or i18n scanner hit).

- `scan-plan-migrations`: mentions false. Not a finding: whether the plan needs or adequately declares this is the migrations griller's judgment.
- `scan-plan-observability`: mentions false. Not a finding: whether the plan needs or adequately declares this is the observability griller's judgment.

## Findings (advisory — the plan's free text is quoted as untrusted DATA)

### error-handling (P7)

```yaml
- type: FINDING
  rule_id: P7
  severity: important
  file: ".dev/features/specified-markers-sweep/PLAN.md:55"
  problem: "The plan asserts that a sibling worktree is listed by `git ls-files --others` as one `dir/` entry and skipped, but a LINKED worktree carries a `.git` FILE, not a directory, and the plan does not say this was measured."
  evidence: "Entries ending in `/` (a nested repo, e.g. a sibling worktree under `.claude/worktrees/`) ... are skipped"
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/specified-markers-sweep/PLAN.md:58"
  problem: "Failure of the git spawn itself (git absent from PATH, a TARGET inside an ignored directory listing zero files) is folded into 'not a git work tree, or zero files listed → exit 2' without naming the spawn-failure case separately in the tests."
  evidence: "Not a git work tree, or zero files listed → **exit 2**"
```

### architecture / coupling (P3)

```yaml
- type: FINDING
  rule_id: P3
  severity: minor
  file: ".dev/features/specified-markers-sweep/PLAN.md:67"
  problem: "'an exemption covering a file that holds a registered site → exit 2' does not say whether forward-claim site files (e.g. `.dev/guides/deferred-decisions.md`) count as registered sites; the stricter reading (both classes) keeps every guarded file un-exemptable."
  evidence: "an exemption covering a file that holds a registered site → exit 2"
```

### testability (P1)

Presence recognized (`## Evals / tests to write`). Layer 2 adequacy:

```yaml
- type: FINDING
  rule_id: P1
  severity: minor
  file: ".dev/features/specified-markers-sweep/PLAN.md:104"
  problem: "The diff-coverage gate needs every added line executed; the test list names the RED paths but not one test per exit-2 validation branch (non-object key, non-array exempt, non-object entry, bad path kinds, duplicate)."
  evidence: "✧ exit 2: exemption covers a site file; malformed `marker_sweep` / `exempt` / entry; bad path; duplicate"
```

### performance, security, privacy, documentation, comprehension, observability, migrations, a11y, i18n

No findings. The sweep reads every listed file once (≈3.1k files here, the same order as the existing `docs:check`
walk); git runs via `execFileSync` with no shell and a fixed argv; symlinks are skipped so nothing outside the tree
is read; no personal data, schema, UI or user-facing strings; the guide and checker header are in `## Files`, and the
plan records the reasons for each design choice.

## Summary

The plan is narrow and its P0 audit labels the bound honestly (the phrase only; exemptions hide whole files). The one
concern worth acting on in build is the unmeasured worktree-skip assumption: measure it with a real `git worktree
add` in a fixture rather than relying on the nested-repo behaviour of a `.git` directory. The rest are clarifications
the build can settle (treat forward-claim site files as un-exemptable too; one test per exit-2 branch).

ADVISORY VERDICT: 4 concerns raised (0 blocking-severity, 1 important, 3 minor) — for the human to weigh before
/pharn-dev-build.
