# GRILL — entry-cache-per-worktree

Plan: `.dev/features/entry-cache-per-worktree/PLAN.md` · spec-hash: match (`f058fca3…`, recomputed with
`hash-doc.mjs`) · Step 1b lessons-declaration verdict (FLOOR): **GREEN** — `check-plan-lessons.mjs` exit 0; L35, L65,
L66, L84 resolve in canon and are referenced in the plan body.

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194044 B of griller files, 99396 B printed; deep omission: 13 pharn-owned, 0 other; left out where present: guarantee-audit (13), machine-readable-emission (13), two-layers (13), layer-1 (13), finding-output (13); kept whole: none

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`)

Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line; a scanner finding
is not the griller's judgment.

Findings: none (no secrets, PII or i18n scanner hit).

- `scan-plan-migrations`: mentions true — lines 66 (migration), 73 (migration), 101 (migration), 143 (migration), 170 (migration). Not a finding: whether the plan needs or adequately declares this is the migrations griller's judgment.
- `scan-plan-observability`: mentions false. Not a finding: whether the plan needs or adequately declares this is the observability griller's judgment.

## Findings (advisory — each gates nothing)

### Honest scope / the reset claim (P7, P0)

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/features/entry-cache-per-worktree/PLAN.md:56"
  problem: "The reset is stated as 'removing that worktree's git-dir records removes the record too'; it holds only for a cleanup that removes the whole worktree git dir or names this file, so the build's header and guide text should name the file rather than imply any git-dir cleanup resets it."
  evidence: "removing that worktree's git-dir records (what CORE-342 did) or the worktree itself (`git worktree remove` deletes `.git/worktrees/<name>/`) removes the record too"
```

### Comprehension (the lost gain must be visible to users)

```yaml
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/entry-cache-per-worktree/PLAN.md:51"
  problem: "Giving up cross-worktree hits is a behaviour change a user of several worktrees may notice (a red no longer carries to a fresh worktree); the CHANGELOG entry, not only the PLAN, should say so."
  evidence: "Every option that fixes the shared slot gives up cross-worktree hits"
```

### Testability (P1)

Presence recognized (`## Evals to write (P1)`, five concrete test cases). Adequacy note, no finding: the cases are
storage-layer (`writeCache` / `readCache` / `cachePath`). The decision layer is unchanged and already reads the record
through `readCache`, and the migration case reaches `recordDefect`, the one function the schema bump changes. A CLI-level
two-worktree `--wait` → `--start` test would cost a gate runner per worktree; the storage test takes the changed branch
on realistic input (a real linked worktree), which is what L84 asks.

## Axes with no finding

- **Migrations (scanner mentions: lines 66–170).** The plan reshapes a persisted record (a schema string and a
  location). A migration and its rollback are declared: forward = ignore every `/1` record by `recordDefect`; rollback
  (downgrade to 7.25.0) reads a `/2` record as `record-unusable` too, so both directions fail to a miss, never a stop.
  No data of value is lost — a cached red is a convenience, and `--refresh` re-measures. Safe.
- **Error handling.** No new failure path: `gitDirFile` returns null on a git failure exactly as `commonDirFile` did,
  and every caller already maps null to `git-dir-unresolved` / a miss.
- **Architecture / coupling.** The move aligns the record with every other per-run git-dir record (`entry-base-evidence`
  offer, `head-reuse-offer`, `pre-run-snapshot`, the inputs file — all `--absolute-git-dir`, checked this run); one
  resolver retired. No sibling import added.
- **Security / privacy.** No new input or output; the forged-record bound (a Bash writer; can only stop a run) is
  unchanged and restated. The ★ HOOK test re-probes the new path rather than assuming it.
- **Performance, observability, i18n, a11y, documentation.** Not touched beyond the header/guide/contract text the
  plan already lists.

## Summary

The plan is narrow (one resolver swap, one schema string, text that described the old location) and is triggered by
an observed failure (CORE-342). The design choice it makes deliberately — losing unmeasured cross-worktree hits — is
argued against three alternatives. Two minor wording concerns: name the record file when describing the reset, and put
the lost cross-worktree hit in the CHANGELOG.

ADVISORY VERDICT: 2 concerns raised (0 blocking-severity, 2 advisory) — for the human to weigh before /pharn-dev-build.
