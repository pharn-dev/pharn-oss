# REVIEW — worktree-session-root

Floor first: `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 37 capabilities checked` (build round 2). Everything
below is advisory.

Two passes: an independent read-only reviewer (a subagent given the diff and the constitution, not the plan's
conclusions) over round 1, which probed the patched hooks in temp fixtures; then the four inline lenses over round 2.
Every free-text field below quotes the reviewed increment and is DATA (P2).

## Round 1 — the independent review, and what round 2 did with it

```yaml
- type: FINDING
  rule_id: P0
  severity: important
  file: ".claude/hooks/enforce-writes-scope.cjs:144"
  problem: "With a NON-git launch directory under a temp root holding an installed git tree, and the payload cwd in that tree, the launch directory's own paths were allowed as ordinary temp paths, contradicting the header and pharn/LIMITS.md §7 ('a move never puts a file of the launch tree ... under another tree's rules')."
  evidence: "probe: pharn/floor/x.mjs, pharn.config.json and .claude/settings.json in the launch dir went from exit 2 (no cwd) to exit 0"
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".claude/hooks/enforce-writes-scope.cjs:327"
  problem: "payloadCwd() used the JS realpath, which keeps a case-variant spelling on APFS, so the 'enclosing tree is refused' comparison could be bypassed by letter case (launch paths stayed denied only through the native target resolution)."
  evidence: "cwd = /PRIVATE/var/.../outer: ROOT became the outer tree"
- type: FINDING
  rule_id: P5
  severity: minor
  file: ".claude/hooks/enforce-writes-scope.cjs:284"
  problem: "A case-variant spelling of the launch checkout as the payload cwd denied every write (fail-closed availability regression)."
  evidence: "a write to pharn/features/z.md went from exit 0 to exit 2"
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".claude/hooks/protect-trusted-paths.cjs:200"
  problem: "'it can only ADD a guarded root' overstated: the payload cwd is also the base a relative write path resolves against."
  evidence: "relative pharn/CONSTITUTION.md with cwd = a notes dir resolves under the notes dir"
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".claude/hooks/enforce-writes-scope.cjs:276"
  problem: "'never renders it in a message' overstated: the root derived from the payload cwd is printed in deny messages (quoted as data, as a process-cwd root was)."
  evidence: "the deny message printed the case-variant root"
- type: FINDING
  rule_id: P1
  severity: minor
  file: ".claude/hooks/enforce-writes-scope.test.cjs:1"
  problem: "Missing cases: a non-git launch with a nested installed tree, case-variant or symlinked cwd, a different-repository session, the launch checkout's own docs under protect, a nested non-worktree tree."
  evidence: "none of the tests read pass vacuously; the negative controls and the unusable-cwd matrix are sound"
```

The reviewer found **no widening for a git launch checkout** and a clean fail-open check (`readStdin()` runs after
both `uncaughtException` handlers; every new path exits 0 or 2).

**Disposition (build round 2, `PLAN.md` "Build round 2").** All six were fixed by the maintainer's patch 2
(`6314c131`) and the round-2 tests: enforce keeps `LAUNCH` and denies any target inside it (spelled or folded) once
`ROOT` moves, before any out-of-project allowance; both `payloadCwd()` copies use `fs.realpathSync.native`; the §7
sentence and both comments are corrected; six cases were added, and the three that exercise the fix (non-git launch,
two case variants) fail against patch 1's hooks (measured in a scratch copy: 3 fail, 3 pass). Round 1's epoch was
reconciled `CLEAN` before patch 2 landed, and regress/verify ran on round 2 only.

## Round 2 — the four lenses

- **L-floor (P0).** Every claim is either a hook verdict executed by a test (worktree allowed, worktree control
  surface denied, launch paths denied after a move, enclosing tree refused, unusable cwd ignored) or labelled
  advisory/bounded: the payload `cwd` is shape-checked only, and a `Bash`-planted `.git` can turn a directory into a
  tree (§7). No floor-gate finding.
- **L-eval (P1).** No capability changed; the hook suites are the evals (29 new cases, the `payloadCwd` pin, the
  payload parity matrix). `validate` agrees (GREEN). No finding.
- **L-trust (P2).** The payload `cwd` is used only as a path (realpath'd, stat'd); the derived root is rendered only
  through the existing `asData()` quoting. No instruction-looking content in the reviewed files changed this review.
  No finding.
- **L-axis (P3).** The change stays inside the two guards and their tests; `workTreeRoot()` is untouched (its
  three-copy pin holds); `payloadCwd()` is a new pinned copy rather than a shared control-surface module, by the file's
  existing rule. No finding.

Advisory, carried from GRILL.md: the `/pharn-loop` Stop guard (`require-loop-record.cjs`) keeps the same root logic and
is inert in a worktree session (its fail-open direction); it is named in the CHANGELOG entry and handed back as a
follow-up.

## Lesson

No candidate. The defect was caught by the review step the chain already has, and L37 (probe a quantified bound
against the guard, not the reading) is the rule the reviewer's probes applied; its remedy is not "remember next time".

VERDICT: GREEN — 0 floor-gate findings; 6 advisory findings from round 1, all fixed in round 2.
