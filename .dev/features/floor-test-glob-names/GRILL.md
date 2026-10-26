# GRILL — floor-test-glob-names

Plan: `.dev/features/floor-test-glob-names/PLAN.md`. Spec hash: `d5a97430…f33a5`, matches the plan's
`spec_content_hash`. Step 1b lessons declaration: **GREEN** (`check-plan-lessons.mjs` exit 0; L1, L26, L41, L50, L68,
L75, L78 resolve and are referenced). That verdict covers the declaration only, never that the lessons were applied.

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194044 B of griller files, 99396 B printed; deep omission: 13 pharn-owned, 0 other; left out where present: guarantee-audit (13), machine-readable-emission (13), two-layers (13), layer-1 (13), finding-output (13); kept whole: none

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`)

Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line; a scanner finding
is not the griller's judgment.

Findings: none (no secrets, PII or i18n scanner hit).

- `scan-plan-migrations`: mentions true — lines 35 (migration). Not a finding: whether the plan needs or adequately declares this is the migrations griller's judgment.
- `scan-plan-observability`: mentions false. Not a finding: whether the plan needs or adequately declares this is the observability griller's judgment.

## Orchestration note

The 13 grillers' procedures were applied by one read-only subagent over the extract, the plan, the scan output and
the repo at `bc63759f` (with pharn-cli `origin/main` @ `33d0ec9` for grounding); the inline axes (Step 2) were applied
in the main session. Both are advisory model work.

## Findings — inline interrogation (Step 2)

### Guarantee audit (P0)

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/floor-test-glob-names/PLAN.md:200"
  problem: "The hook leg of 'the build wrote only ## Files' is not floor on the script route: the hooks are called by an agent-run Bash script, not by the PreToolUse matcher, so calling them is discipline. The floor part is the reconcile at verify (content-hash; detection, non-adversarial)."
  evidence: "floor: hook (both real hooks judge each write) + content-hash (reconcile at verify)"
```

### Determinism / sweep (P5, L75)

```yaml
- type: FINDING
  rule_id: "P5"
  severity: important
  file: ".dev/features/floor-test-glob-names/PLAN.md:167"
  problem: "The re-run grep as written also matches the new names (ac-test-infra-core contains test-infra-core), so it cannot show 'only 7.0.1 lines'. The post-build check must use the boundary-anchored form the build's rewrite already uses: (?<![\\w-])test-(infra-core|results-core|results-formats)."
  evidence: "Grill re-run: the same grep after the build must show, outside the kept classes, only lines that carry `7.0.1`."
```

## Findings — grillers (Step 2b)

### comprehension

```yaml
- type: FINDING
  rule_id: "P7"
  severity: minor
  file: ".dev/features/floor-test-glob-names/PLAN.md:33"
  problem: "The plan's restatement of pharn-cli's floor copy rule omits the floor-root `fixtures/` exclusion (pharn-cli FLOOR_TEST_FIXTURES_DIRS = test-fixtures, fixtures)."
  evidence: "copies the floor by walking the directory, minus `*.test.(mjs|cjs)` and `test-fixtures/`"
```

### documentation

```yaml
- type: FINDING
  rule_id: "P7"
  severity: minor
  file: ".dev/features/floor-test-glob-names/PLAN.md:42"
  problem: "Allowing the LIMITS.md §9 patch to land in a later release would ship 7.0.1 with a trusted doc citing a module that no longer exists."
  evidence: "as its own commit on this branch, or later in its own patch release"
```

### error-handling

```yaml
- type: FINDING
  rule_id: "P7"
  severity: important
  file: ".dev/features/floor-test-glob-names/PLAN.md:37"
  problem: "'Still load' holds only at 7.0.1: the orphaned old modules import live siblings, so a later release that changes one of those exports makes them fail to load, and a bare node --test reports that as a failing test."
  evidence: "which still load (they import only each other and floor siblings that still exist)"
- type: FINDING
  rule_id: "P7"
  severity: minor
  file: ".dev/features/floor-test-glob-names/PLAN.md:175"
  problem: "The plan does not say what the write script does when a hook denies partway (halt, roll back, or leave a half-renamed tree)."
  evidence: "writes only when both exit 0"
```

### migrations

```yaml
- type: FINDING
  rule_id: "P7"
  severity: important
  file: ".dev/features/floor-test-glob-names/PLAN.md:38"
  problem: "'Delete them by hand' breaks an install where pharn update skipped a user-modified importer (update-decision.ts SKIP modified): that importer still imports the old name, so deleting the orphan raises ERR_MODULE_NOT_FOUND."
  evidence: "The CHANGELOG tells the user to delete them by hand."
```

### security

```yaml
- type: FINDING
  rule_id: "P2"
  severity: important
  file: ".dev/features/floor-test-glob-names/PLAN.md:200"
  problem: "Same as the P0 finding above, from the security axis: the script-invoked hooks are discipline, and the only backstop is the reconcile at verify, which detects without preventing and does not hold against an adversary."
  evidence: "→ floor: hook (both real hooks judge each write) + content-hash (reconcile at verify)"
```

### testability

Same root as the P5 finding above (the unanchored re-run grep; the rewrite itself is anchored in the build script and
idempotent). Not repeated.

### No findings

a11y (no UI), architecture (renames stay in `pharn/floor/`, no layer crossing), coupling (ripple only through static
imports, all in `## Files`), i18n, observability, performance (one nested `node --test` over stubs), privacy.

## Summary

The plan is a mechanical rename plus a regression probe; nothing found disputes the names, the version or the
`MIN_CLI` decision. The concerns are about what the plan claims and tells users: the script route's hook calls are
discipline (verify's reconcile is the check); the post-build grep must be boundary-anchored; the CHANGELOG's
delete-by-hand advice needs the skipped-modified-importer condition and the reason (orphans break later); and the
LIMITS patch should land in this PR. Dispositions the build takes, all within `## Files`: the CHANGELOG entry gains
the condition and the reason; the new suite excludes both pharn-cli fixture dirs; the build script halts at the first
denial (it throws before writing, and the renames are `git mv`, so a partial tree is visible in `git status`); BUILD.md
and SHIP.md state the guarantee split. The plan text itself is not edited after approval.

ADVISORY VERDICT: 8 concerns raised (0 blocking-severity, 5 important, 3 minor) — for the human to weigh before
/pharn-dev-build. The Step 1b lessons verdict (GREEN) is a separate floor verdict and is not in this count.
