# REVIEW — specified-markers-sweep

The increment under review is `trust: untrusted`. No instruction-looking content in the reviewed files changed this
review.

## Step 1 — floor

`node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 37 capabilities checked`. The increment adds no capability, so
validate only confirms it did not break one. The guaranteed parts of this review are that result plus the standing
verdicts from regress (`no-regressions`) and verify (`PASS`). Everything below is advisory.

## Floor-gate findings (blocking)

None. Every guarantee the increment states reduces to enum/regex (regex hit offsets, byte-range containment, path-set
membership, an integer count) and carries its bounds.

## Advisory findings

### L-trust → P2

```yaml
- type: FINDING
  rule_id: P2
  severity: important
  file: ".dev/floor/check-specified-markers.mjs:112"
  problem: "The header's TRUST paragraph still says the checker reads only trusted docs and ingests no untrusted input, but the sweep now reads every file git lists, untracked ones included, and quotes a line of any unregistered hit into its RED output."
  evidence: "the docs it reads are trusted. No untrusted input is ingested; no free text steers a branch."
```

The behaviour itself is sound. Only match offsets and paths drive branches, and the quoted line goes through
`JSON.stringify`, which escapes control characters, so no terminal escape reaches the output. The sentence is the
defect: this increment made it false (L33). **Fixed in this run** (see "Fixes applied").

### L-floor → P0

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/floor/check-specified-markers.mjs:496"
  problem: "The RED headline counts unregistered hedges, stale exemptions and unreadable files as 'drifted annotation(s)', which misnames two of the three."
  evidence: "SPECIFIED-MARKERS: RED — ${reds.length} drifted annotation(s)"
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/floor/check-specified-markers.mjs:296"
  problem: "`git ls-files` inherits GIT_DIR / GIT_WORK_TREE / GIT_INDEX_FILE, so a run from inside a git hook would list another index's files. No hook in this repo runs the checker today, so this is a stated bound rather than a fix (P7)."
  evidence: 'execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], { cwd: TARGET, ...'
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/floor/check-specified-markers.mjs:321"
  problem: "Coverage is computed from specified_primitives markers only, so a phrase hit inside a FORWARD-claim marker would RED. No registered forward marker carries the phrase today, and the phrase belongs to the specified class, so this is the intended reading, but nothing states it."
  evidence: "for (const p of primitives) { for (const s of p.sites) markersByFile.set(...) }"
```

### L-eval → P1

No capability, so no eval pair. The 22 new `node --test` cases drive every RED and exit-2 path on real git trees.
Each ✧ case is a mutant of one property (an extra hit, a same-file hit, a wrapped hit, a stale exemption, an exemption
over a site). Line coverage from `--experimental-test-coverage` shows every added line executed; the 8 uncovered lines
were already uncovered before this change. The worktree-skip behaviour flagged at grill is now measured inside a test
(git lists a linked worktree and a nested repo as one `dir/` entry each), not assumed.

### L-axis → P3

The checker gains a third direction on the same axis it already had: binding a registered annotation to reality. The
manifest's new `marker_sweep` belongs to the same axis, registration. No sibling reference; the dependency still
points `.dev/` → nothing in `pharn/`. No finding.

## Fixes applied (GATE 2 delegation: fix the important finding and the cheap, clearly right ones)

- P2 TRUST paragraph rewritten to describe what the sweep reads and how its output is quoted.
- P0 RED headline changed to `finding(s)`.
- P0 GIT_DIR inheritance and P0 forward-marker coverage: each recorded as a one-line bound in the header. No code
  change, since neither has a triggering failure (P7).

Line numbers above cite the file after the fixes. Re-checked after the fixes: eslint clean, the checker's suite
95/95, `npm run check:markers` GREEN.

## Verdict

GREEN — 0 floor-gate findings; 4 advisory (1 important, 3 minor), all addressed above. This is the reviewer's advisory
reading, not a guarantee.

## Lesson candidate (proposed, not promoted)

A checker whose new direction widens its input set must re-derive its own TRUST/scope statements: the "no untrusted
input" sentence became false the moment the sweep began reading untracked files. This is L33's expiry pattern applied
to a checker's own header, a third instance after the CANNOT-DISCOVER sentence this increment already rewrote. Source:
this REVIEW.md, L-trust finding. Deferred per the batch brief.
