# SHIP — loop-host-execution-consent (Linear CORE-397)

Stages run, in order: `/pharn-dev-plan` → GATE 1 (human: "Approve as written"; decision "Keep both"; LIMITS.md "I
edit after verify") → `/pharn-dev-grill` → `/pharn-dev-build` → `/pharn-dev-regress` → `/pharn-dev-verify` (run 1
FAIL, environment fixed, run 2 PASS) → `/pharn-dev-review` → GATE 2 (human: "Fix review nits first") → nit fix within
`## Files` → `/pharn-dev-regress` (run 3; the earlier re-run was stopped) → `/pharn-dev-verify` (run 3 FAIL, reverted,
run 4 PASS, after a re-run regress, run 4) → human LIMITS.md patch after verify PASS → `/pharn-dev-review` re-review →
lesson gate → GATE 2.

verdict-grill: exit 0
verdict-build: exit 0
verdict-regress: no-regressions
verdict-verify: PASS
run-ended: GATE 2

## Notes on the verdicts

- **Verify ran four times.** Run 1 (`a94ced9a…`) **FAIL** on `lint`: eslint reached this ship's own scratch runner
  under git-ignored `pharn/.run/`, and the scripts were deleted. Run 2 (`6c9fd08b…`) **PASS**, then GATE 2 chose the
  nit fix. Run 3 (`7b8a370c…`) **FAIL** on `reconcile`: the human's correct `pharn/LIMITS.md` patch had landed inside
  the build's anchor→verify window (L68). At the human's choice the local commit `a44a772a` was undone
  (`git reset --soft`), the doc restored to main's bytes and the manifest regenerated; the baseline was neither
  re-anchored nor edited. Run 4 (`da0efe54…`) **PASS** is the verdict above. Every run is in `VERIFY.md` § History,
  and no gate value was carried across runs.
- **Regress ran four times** (`REGRESSION.md` § History). Run 4, on the tree verify run 4 judged, is the verdict above.
  One runner launch crashed before any gate ran, and one run was stopped when the tree changed under it; neither
  wrote a verdict.
- **After verify run 4 the tree changed in exactly two product files, and `.dev/` canon:** the human's
  `pharn/LIMITS.md` §6 sentence (applied by the human's patch script; bytes `cmp`-equal to the copy tested on a scratch
  tree) and the regenerated `pharn-install.json`. Then the L88 promotion and `docs/lessons-index.md`. Checked on the
  final tree, but not as a verify run: `docs:check` GREEN (catalog, lessons index, install manifest), the 65
  install-manifest tests pass, the ✧ 7.26.1 / 7.3.0 / S15 pins pass, and prettier passes on LIMITS.md and the
  manifest. CI judges the full final tree.
- Regress runs used a `spawnSync` runner of the command's pinned forms, because this isolated worktree session
  refuses compound git shell lines. From run 3 on it lived outside the worktree.

## Pointers

- Review: `.dev/features/loop-host-execution-consent/REVIEW.md` (GREEN; 0 floor findings; both minor advisory findings
  resolved in the re-review)
- Grill: `.dev/features/loop-host-execution-consent/GRILL.md` (advisory; 1 important + 1 minor, both folded into the
  build)

changelog-entry: exit 0

lesson: promoted L88

deferred: none

## Open items for the human

- Nothing is committed (the one LIMITS.md commit was undone at the human's choice), pushed or opened as a PR. The
  work sits in the worktree `~/Projects/pharn-oss-worktrees/core-397` on branch
  `przemek/core-397-pharn-loop-dont-ask-for-approval-of-the`. A trusted-doc and canon edit stay red under a local
  `npm run check` (`check:reconcile`) until committed (L68's companion rule in CLAUDE.md).

chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate.
