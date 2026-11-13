# REVIEW — gate-evidence-cache

Floor first: `node pharn/floor/validate.mjs .` → **GREEN** (37 capabilities). The increment adds no capability, so the
L-eval lens has no `enforces` binding to check; its specification is the floor tests below. Everything after the floor
line is **advisory**. The increment under review is `trust: untrusted`; no instruction-looking content in it changed
this review.

Reviewed: `pharn/floor/entry-gate-cache-core.mjs`, `entry-gate-cache.mjs`, the `entry-gates.mjs` diff,
`worktree-fingerprint.mjs` `alsoExclude`, the three enum additions, the four command edits, the three contract lines,
and the tests (core 13, storage 9 including AC2 end to end and the ★ HOOK probe, CLI 3, fingerprint 1, hygiene 3).

## Floor-gate findings

None.

## Advisory findings

### L-floor (P0)

Every claim reduces or is labeled: the hit decision is equality over digests and canonical JSON plus closed-enum
membership; the deny is the existing hook, probed in both layouts; "a cached red equals a fresh run" is labeled
ADVISORY in the core header, the guide, the contract line and the CHANGELOG, with the unbound inputs named. No finding.

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: "pharn/floor/entry-gate-cache-core.mjs:76"
  problem: "The install input binds four package-manager records by name; a manager that keeps its install state elsewhere (bun, Yarn PnP) is unbound beyond its lockfile. Labeled ADVISORY in the header, but the list is a fixed enumeration a later manager can outgrow."
  evidence: "INSTALL_RECORDS = [node_modules/.package-lock.json, node_modules/.modules.yaml, node_modules/.yarn-state.yml, node_modules/.yarn-integrity]"
```

### L-trust (P2)

The record is read without following links and validated closed both ways before any field is used. Found and fixed in
this review (iteration 2): gate ids in the record were any non-empty string, so a forged record could carry free text
into the stop line `--start` prints and the loop's close part quotes. `gatesDefect` now requires an ALLOWLIST member, so
the stop line carries only enum ids, a slug, an ISO time and a fixed sentence; a core test pins a free-text id as
`record-unusable`. Also fixed: a live tree with no HEAD read `head-changed`; it is now `inputs-unavailable`.

```yaml
- type: FINDING
  rule_id: P2
  severity: minor
  file: "pharn/floor/entry-gate-cache-core.mjs:1"
  problem: "The record crosses runs and worktrees by design and a Bash writer reaches it; the bound (a forged record can only stop a run, --refresh lifts it) is stated, but nothing detects the forgery."
  evidence: "A forged record can only stop a run, never green one, and `--refresh` measures again."
```

### L-axis (P3)

`entry-gate-cache-core.mjs` (rules) and `entry-gate-cache.mjs` (storage) follow the `entry-base-evidence` split; the
floor imports stay inside `pharn/floor/`, as every floor module's do. `entry-gates.mjs` gained two orchestration
functions and no rule. No finding.

### Grill follow-through

- Thrown errors in the lookup: `cacheLookup` and `cacheAfterVerdict` catch everything (`inputs-unavailable`, or a
  `note —` line); storage tests pin that no function throws outside a repository or on an unwritable git dir.
- `source.feature` is slug-gated in `recordDefect` before `alsoExclude` uses it (tested).
- Success at `--wait` stays silent: the grill's observability suggestion was declined because
  `entry-base-evidence.test.mjs` pins that a successful `--wait` prints nothing on stderr, and the next `--start` names
  the hit or its miss on stdout.
- The cleanup after a hit (`--abort` no-op, a stray `--wait`/`--peek` reading `unusable cached-red`, `--start
--refresh` starting normally) is tested in the CLI hit test.

## Verdict

**GREEN** — 0 floor-gate findings, 2 minor advisory findings (follow-ups), 2 cheap fixes applied in iteration 2 and
re-verified (regress `no-regressions`, verify `PASS`).

## Proposed lesson candidate

None proposed. The one surprise — a test outside `## Files` that re-ran `--start` on an unchanged red tree and so
encoded the old behaviour — is a first occurrence and was caught by the build's own full test run (L20's bar is a
second occurrence).
