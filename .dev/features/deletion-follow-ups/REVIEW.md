# REVIEW — deletion-follow-ups (6.57.0)

- Reviewer: `/pharn-dev-review`, an independent session with fresh context, in an isolated worktree on branch
  `review-deletion-follow-ups` (from `deletion-follow-ups` at `9c26dbf`). Base `45107f7` (main 6.56.0).
- Reviewed: `git diff 45107f7..9c26dbf`. Part A extracts `IGNORE_DATA_PATH` / `loadIgnoreData` / `isHumanOnly` /
  `isAlwaysReconciled` into `pharn/floor/reconcile-ignore-core.mjs`. Part B makes `check-bash-reconcile.mjs` judge
  deletions and gives the merged class a deletion row. Also the human-applied `LIMITS.md` §6 sentence (`83c5829`).
- The increment was treated as `trust: untrusted`. No instruction-looking content aimed at the reviewer was found in
  the diff or in the PLAN, GRILL, REGRESSION or VERIFY files.

## Verdict

**GREEN: 0 floor-gate findings.** There are 3 advisory findings: 1 important and 2 minor.

## Step 1 — floor (P0)

- `node pharn/floor/validate.mjs .`: `FLOOR: GREEN — 37 capabilities checked`, exit 0.
- Re-run here and green: `format:check`, `lint`, `lint:md`, `docs:check`, `check:changelog` and
  `check:changelog-entry` (2 new entries against `origin/main` 45107f7, no merged entry edited). Also green:
  `node --test` over `check-bash-reconcile.test.mjs`, `reconcile-ignore-core.test.mjs` and
  `apply-plan-deletions.test.mjs`, 109/109 passing. The full `npm test` run gave 5300 tests: 5299 passed, 0 failed,
  1 skipped.

## What was probed (scratch fixtures under the OS tmpdir, real hooks copied in; no real baseline touched)

| #   | Scenario                                                                             | Verdict                                                                                  |
| --- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| 1   | `git mv` out-of-scope `src/Out.txt` to in-scope `src/in2.txt`                        | ESCAPE `src/Out.txt` ✓                                                                   |
| 2   | case-only `git mv src/Out.txt src/out.txt`, new name in scope (macOS, APFS)          | **CLEAN**, warning "git-ignored now?" — **F1**                                           |
| 3   | the same as 2, committed                                                             | **CLEAN** — **F1**                                                                       |
| 4   | untracked out-of-scope file deleted, plus a new self-ignoring `src/.gitignore` (`*`) | ESCAPE ✓ (`lstat` does not care about ignore rules)                                      |
| 5   | untracked file **edited**, plus a self-ignoring `src/.gitignore`                     | CLEAN, WARN only. This is the ignored-paths bound, but the prose misnames the route (F2) |
| 6   | untracked file edited, plus `git init` inside its directory (nested repo)            | ESCAPE ✓                                                                                 |
| 7   | `src/` replaced by a symlink to a copy (the scope names `src`)                       | **CLEAN**, three "git-ignored now?" warnings — **F1**                                    |
| 8   | tracked file replaced by a symlink                                                   | ESCAPE ✓                                                                                 |
| 9   | `rm -rf src` (tracked and untracked files)                                           | ESCAPE ×3 ✓                                                                              |
| 10  | directory replaced by a file (ENOTDIR)                                               | ESCAPE ×3 ✓                                                                              |
| 11  | control path `.claude/hooks/set-writes-scope.cjs`, `git rm` and commit               | ESCAPE ✓                                                                                 |
| 12  | deletions covered by the glob scope `src/**`                                         | CLEAN ✓                                                                                  |
| 13  | baseline directory deleted                                                           | NO_BASELINE, as before 6.57.0; verify's `--require-baseline` turns it into INCONCLUSIVE  |
| 14  | fast-forward pull of an upstream deletion                                            | CLEAN, `merged: [dep.json]` ✓ (no false RED)                                             |
| 15  | upstream deletion merged without fast-forward, after a build commit                  | CLEAN, merged ✓                                                                          |
| 16  | the build commits a deletion, then moves `origin/HEAD` to HEAD                       | merged. This is the stated bound: `origin/HEAD` is a Bash-movable alias                  |
| 17  | the build commits a deletion that upstream also made, then merges                    | merged. This is the "whoever" bound, but the §2a sentence is unconditional (F3)          |
| 18  | upstream renames `dep.json` to `dep2.json` (fast-forward)                            | CLEAN, both paths merged ✓                                                               |
| 19  | upstream deletion merged, plus an untracked out-of-scope unlink                      | ESCAPE only for the unlink; the upstream path is merged ✓                                |
| 20  | case-only `git mv LIMITS.md limits.md` and commit, narrow scope                      | ESCAPE `limits.md` ✓ (the new name is judged)                                            |
| 21  | the same as 20, with the scope naming `limits.md`                                    | ESCAPE `limits.md` ✓ (protect-trusted-paths case-folds)                                  |

**A (extraction): the behaviour is the same.** The three function bodies, `loadIgnoreData`, `isHumanOnly` and
`isAlwaysReconciled`, were extracted from `45107f7`'s `check-bash-reconcile.mjs` and diffed against the core: they
are byte-identical. `IGNORE_DATA_PATH` resolves to the same file, since both modules live in `pharn/floor/`. Only
these two modules import the four names, and the identity test pins that the re-exports are the same objects.

**The regress deviation (REGRESSION.md, orchestration notes) is trustworthy.** The recomputed verdict is
`check-regress.mjs` run over exit-code maps, all three gates 0 → 0. The one gate that was re-run, `structural`, was
reproduced here independently at HEAD:
`check-structural.mjs …/expected-injection-comment.json .dev/features/trust-fence/findings.json .` exited 0. The
`tests` and `validate` exits were never affected by the operand bug. The deviation is disclosed, and the first, wrong
run was not recorded as a verdict. The residual is that the report is not the output of one single runner
invocation. That is an orchestration fact, not a floor gap.

## Floor-gate findings (blocking)

None.

## Advisory findings

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: "pharn/floor/check-bash-reconcile.mjs:259"
  problem: >-
    absenceState treats any successful lstat as "present", and main() reports that as a WARN that is never judged
    (lines 680-683). The shipped prose names one cause only: CHANGELOG [6.57.0], reconciliation-record.md §3 (line 341)
    and §5 (line 445), and the human-applied LIMITS.md §6 sentence (line 291) all say the path is still on disk
    "because it became git-ignored". Two measured routes reach "present" with no ignore rule at all. (1) A case-only
    rename on a case-insensitive volume: lstat of the old spelling succeeds through APFS case folding. (2) A parent
    directory replaced by a symlink: lstat follows the parent component. So an out-of-scope path that git no longer
    lists reads CLEAN on macOS. On a case-sensitive volume, such as Linux CI, the same tree reads ESCAPE, so the
    verdict depends on the platform. This recurs L67: the bound was stated from the inputs the author pictured, and
    "a case-variant on a case-insensitive volume" is one of L67's own examples. L67 is not in the PLAN's
    applied_lessons.
  evidence: >-
    Probe 3: in a fixture repo with scope ["src/out.txt"], `git mv src/Out.txt src/out.txt; git commit` gave
    verdict=CLEAN escapes=[] warnings=["present at anchor, still on disk, no longer in the reconciled set (git-ignored
    now?) — not judged: src/Out.txt"]. Probe 7: `src` replaced by a symlink to a copy (scope covers `src`) gave
    verdict=CLEAN with the same warning for src/Out.txt, src/in.txt and src/untr.txt.
  fix: >-
    Make the WARN branch need git's own proof of ignore. Run
    `git check-ignore -q --no-index -- <rel>` (argv, GIT_LITERAL_PATHSPECS). Exit 0 means present and ignored: keep
    the WARN. Exit 1 means not ignored, which covers the case alias. Any other exit, such as 128 "beyond a symbolic
    link", means unknown. Treat both of those as a CANDIDATE: fail closed, and the platforms agree. Add probes 2/3 and
    7 as rows in the deletion suite. This makes the CHANGELOG, contract and LIMITS wording true without a LIMITS edit.
    Alternative: keep the code and state both routes in §3/§5 and the CHANGELOG, and ask a human to amend LIMITS §6.
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "pharn/pharn-contracts/reconciliation-record.md:341"
  problem: >-
    The §3 WARN paragraph says that when the ignore rule is a tracked .gitignore, its change is judged, and that
    "through .git/info/exclude nothing is". A NEW untracked .gitignore that ignores itself (`*`) is equally invisible:
    it is never listed, so it is never a candidate. The prose names one invisible route out of at least two.
  evidence: >-
    Probe 5: an untracked out-of-scope src/untr.txt was edited and src/.gitignore was created as "*". The result was
    verdict=CLEAN with only the "git-ignored now?" WARN. Probe 4, the same rule plus a deletion, correctly gave ESCAPE.
  fix: >-
    Name it, for example: "through .git/info/exclude, or through a new .gitignore that ignores itself, nothing is".
    This is the stated ignored-paths bound, so it needs prose only.
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "pharn/pharn-contracts/reconciliation-record.md:293"
  problem: >-
    The §2a deletion row says without qualification that "a deletion the build commits itself leaves the path
    present at M, so it stays an escape". The same unconditional sentence is in check-bash-reconcile.mjs's §2a comment
    and in CHANGELOG [6.57.0] ("A deletion the build commits itself still fails."). It is false when upstream deleted
    the same path inside the window: the path is then absent at M too, and the build's own deletion is classified
    merged. That is consistent with §2a's existing "classified merged whoever wrote them" bound, but the deletion
    sentence does not point to it.
  evidence: >-
    Probe 17: `git rm dep.json; git commit` by the build, and upstream also ran `git rm dep.json`, then
    `git merge origin/main`. The result was verdict=CLEAN merged=["dep.json"].
  fix: >-
    Qualify the sentence: "...stays an escape, unless upstream removed the same path in the window (§2a's 'whoever
    wrote them' bound)". The CHANGELOG [6.57.0] line can be corrected the same way while it is unmerged.
```

## L-eval (P1)

No capability was added or changed. The increment touches floor checkers and a contract only, so no `enforces`
binding is in play, and the floor (validate GREEN) agrees. Coverage note, folded into F1's fix: the only "still on
disk" test row uses `.git/info/exclude`. No row covers the case alias or the parent symlink. The deletion suite
itself is well-built: one enumeration of deletion kinds, declared and undeclared controls, a non-vacuity row for each
merged condition, and the EACCES fail-closed row.

## L-trust (P2)

The checker emits `findings[].problem` free text built from path names. That is unchanged by this increment and
still rendered as data. No guaranteed decision rests on a free-text field: the verdict comes from hook exit codes,
scope-glob membership, `lstat` error codes and git object-id equality. Nothing in the reviewed artifacts changed the
reviewer's behaviour.

## L-axis (P3)

The extraction removes the 6.56.0 review's P3 finding: `apply-plan-deletions.mjs` now imports
`reconcile-ignore-core.mjs`, never the reconcile CLI module, and a load-graph test with a mutant pins that. The core
imports `node:` built-ins only. No sibling-module references were introduced.

## Prose and CHANGELOG conformance

- The CHANGELOG `[6.57.0]` section is a new minor version, opened above `[6.56.0]`, with no `[Unreleased]` leftovers.
  `SKILLS_VERSION`, the README badge and the Current-state inventory (135 checkers) agree.
- `LIMITS.md` §6 (`83c5829`, human-authored, before the anchor) matches the code except for F1's attribution
  ("because it became git-ignored"). Only a human can change it, so F1's code fix is the route that needs no LIMITS
  edit.
- No stale "a deletion is a WARN" prose remains in the shipped surface. The `.dev/guides` entries were updated in
  the same increment.

## Proposed lesson (for `/pharn-dev-memory-promote`, not written here)

This is a recurrence, not a new lesson. **L67 recurred** in deletion-follow-ups (`9c26dbf`, F1). `absenceState`
stated its "present" bound as "it became git-ignored" from the case the author pictured. A case-insensitive volume
and a symlinked parent reach the same branch. Proposed addition to L67's body: "A successful `lstat` of a name proves
that _some_ entry answers to that spelling, not that the name exists as spelled or is outside the set for the reason
the bound names. Ask the tool that owns the classification, here `git check-ignore`, rather than inferring the reason
from the filesystem." Provenance: feature `deletion-follow-ups`, commit `9c26dbf`, source this REVIEW (F1), date
2026-10-11.

## Recommendation

**fix-first, small.** F1 is a narrow fail-open on macOS that contradicts the shipped "because it became git-ignored"
wording, including a human-only LIMITS sentence. A `git check-ignore` gate plus two test rows closes it without
touching LIMITS. F2 and F3 are one-line prose qualifications. If the human prefers, merge now and file F1 as a named
follow-up. Nothing here is a floor-gate blocker.
