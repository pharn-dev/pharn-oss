# BUILD — floor-test-glob-names

Built from the approved `PLAN.md` (GATE 1 approved by the user on 2026-10-25, with the hook-checked script write route)
on branch `fix/floor-test-glob-names` at `bc63759f`. Spec hash re-checked: `d5a97430…f33a5`, unchanged. Scope set from
the plan's `## Files` (44 paths) and the reconciliation epoch anchored before any write.

What landed: the three modules and their two suites renamed by `git mv` (`ac-test-infra-core`, `per-test-results-core`,
`per-test-results-formats`); 33 files' cites rewritten by three boundary-anchored regexes (`(?<![\w-])test-…`, so the
new names never re-match), skipping lines that carry `7.0.1`; two dated-record lines kept with a label (L78) and a
one-line "named … before 7.0.1" record in each renamed header; `pharn/floor/default-test-glob.test.mjs` added;
`SKILLS_VERSION` 7.0.1, README badge, CHANGELOG [7.0.1]; `HUMAN-PATCH.md` for `pharn/LIMITS.md` §9. Post-build grep
(anchored) over the tree outside `.dev/features/**`, `CHANGELOG.md` and canon: only the five labelled lines and the
LIMITS cite remain. Floor: `node pharn/floor/validate.mjs .` GREEN (exit 0).

How it wrote, and what that guarantees: this session's Write/Edit reach the main checkout's hooks, which deny every
worktree path, so one scratchpad script spawned this worktree's own `protect-trusted-paths.cjs` and
`enforce-writes-scope.cjs` before each write and rename and wrote only on exit 0 (an undeclared control write was denied
first). Calling the hooks from a script is discipline, not floor (GRILL P0/P2): the floor check of "wrote only
`## Files`" is `/pharn-dev-verify`'s reconcile against the anchored scope — detection, non-adversarial.

GRILL dispositions taken here: the CHANGELOG's delete-by-hand advice gained the skipped-modified-importer condition and
the reason orphans break later; the suite excludes both pharn-cli fixture dirs (`test-fixtures/`, `fixtures/`);
HUMAN-PATCH.md recommends applying the LIMITS edit on this branch before merge. The script halts at the first denial,
before writing.

Deviation: Step 2b's pinned block ran prettier (warned on the three deleted paths) and markdownlint, but its eslint line
aborted on the first deleted path in the scope (`No files matching the pattern "pharn/floor/test-infra-core.mjs"`).
eslint was re-run over the 30 scoped JS paths that exist: exit 0. A plan with `(delete)` entries makes the pinned eslint
line fail; named for review.

Verified before the real build, in a throwaway copy of HEAD (L26): the same script plus the LIMITS edit, then
`npm run check`: every gate through `check:contributing` GREEN; `check:reconcile` ESCAPE on `pharn/LIMITS.md` alone (the
stand-in human edit inside the window, as L68 predicts).
