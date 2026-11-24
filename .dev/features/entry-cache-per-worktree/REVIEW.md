# REVIEW — entry-cache-per-worktree

Floor first: `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 37 capabilities checked`. Verify PASS (all eight
gates 0, `reconcile` CLEAN); regress `no-regressions` on its second run (run 1 recorded in `REGRESSION.md`).

Reviewed as `trust: untrusted`: the diff of `pharn/floor/entry-gate-cache.mjs`, `entry-gate-cache-core.mjs`,
`entry-gates.mjs`, both test files, `pharn/pharn-contracts/gate-run-record.md`, `.dev/guides/floor-gates.md`,
`CHANGELOG.md`, `SKILLS_VERSION`, `README.md` and `pharn-install.json`. No instruction-looking content was found in it.

## Floor-gate findings

None.

## Advisory findings

### L-floor → P0

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: "pharn/floor/entry-gate-cache-core.mjs:53"
  problem: "The parenthetical justifying the unbound absolute path is loosely worded: moving a main checkout moves its .git too, so the accurate reason is that the record travels with (or stays in) its own worktree's git dir either way; the claim it supports is still true and advisory-labelled."
  evidence: "bound — the absolute path is left out because a record never leaves its worktree's git dir (a moved checkout keeps its git dir)"
```

Every other claim reduces or is labelled:

- "a record written in one worktree is never read by another" — the path is a function of
  `git rev-parse --absolute-git-dir`, pinned by the two-worktree test (a mutation that maps a worktree's path back to
  the common dir fails it, measured at build). The Bash bound stays stated in the header ("A Bash writer reaches
  both").
- "a pre-7.25.1 record never stops a run" — enum-regex: `recordDefect`'s schema equality, pinned in both test files.
- "out of the write tools' reach" — the ★ HOOK test now asserts the probed linked-worktree record path is under
  `.git/worktrees/` before probing it through both real guards.
- "clearing `pharn/.run/` resets it" is not claimed; the header, guide and CHANGELOG say it does not, and why.

### L-eval → P1

No Capability or `rule_id` changed; `validate` agrees. The tests take the changed branch on realistic input (L84): a
real linked worktree A writes a valid record, B reads `absent`, the main checkout reads `absent` then round-trips its
own record at the unchanged path, B's clear removes nothing elsewhere, and removing A removes its record. Migration: a
`/1` record at the old common path reads `unusable`.

### L-trust → P2

No new input or output. The record is read by equality and membership as before; only its location and schema string
changed.

### L-axis → P3

One axis per file holds: the location change is in the storage file, the schema string (a rule) in the core file. One
resolver (`commonDirFile`) was retired rather than kept beside `gitDirFile` (L35); no sibling import added.

## Process notes (for GATE 2)

- The first regress run stopped on two install-manifest drift tests: `pharn-install.json` pins product digests and
  the plan had not declared it. That was the build's miss, not load. Fixed by a re-plan (the path added to `## Files`)
  and a re-built window over a fresh anchor taken on a clean tree, then regress re-run (green). The same re-anchor
  happened once earlier in the build, for the README badge, before any gate ran. Both are recorded in `SHIP.md`.
- Proposed lesson: none. The drift was caught where designed (`docs:check` inside `npm test`), and CLAUDE.md already
  says "regenerate and commit"; the remedy is not a "remember next time" that a mechanism lacks.

VERDICT: GREEN — 0 floor findings, 1 minor advisory finding.
