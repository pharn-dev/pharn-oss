# SHIP — pharn-footprint-move

`/pharn-dev-ship` roll-up: an advisory record of which stages ran and their floor verdicts. Nothing reads this file.

## Where the run ended

GATE 2, after one review fix round. The chain ran: plan (GATE 1, then revisions 2–4, each maintainer-approved) →
grill → Phase A (human patch 1, `54fe8f3a`) → build → regress (run 1 STOPPED, maintainer chose "Fix and re-run";
run 2 clean) → verify (FAIL on the approved post-anchor R8 fix) → review → fix round (human patch 2, `2ae9f024`; a
fresh build anchor; regress run 3; verify) → lesson → CHANGELOG check.

## Floor verdicts, verbatim

- grill — `check-plan-lessons.mjs` exit 0 (13 cited lessons).
- build — `validate.mjs` exit 0 (`FLOOR: GREEN — 37 capabilities checked`), in both the build and the fix round.
- regress — `regression-report.json` `.verdict`: `"no-regressions"` (run 3, the standing one; run 1 was `"regressions"`,
  R8 walking the new scratch root).
- verify — `verify-report.json` `.verdict`: `"PASS"` (the fix round; every gate exit 0, reconcile `CLEAN`). The first
  verify was `"FAIL"` on exactly the approved R8 escape.
- changelog-entry: exit 0
- `check:surface-bump`: exit 0 (189 product paths; SKILLS_VERSION 6.75.0 → 7.0.0).

## Also measured (advisory)

- Acceptance grep over `.claude/` + `pharn/`: 0 lines. 20+ old-path lines carry a migration label.
- Diff coverage against `7e71753c` (`npm run test:coverage`, lcov, the way pharn-ci reads it): 1,137 / 1,137
  executable added lines = 100%. `pharn/floor/test-infra-core.mjs` (2 changed lines) is absent from every lcov:
  Node's default coverage exclusion skips `test-*` file names. How pharn-ci treats a changed file with no lcov data was
  not checked locally.
- `.dev/` and `docs/` leftovers: 22 hits in 8 dated `.dev/measurements/` records and 4 in the changelog-per-pr
  fixtures, all historical; 0 in `docs/`.
- Writes: every agent write in this worktree went through the hook-checked helper (`write-log.tsv`: one line per write
  and its verdict). That route was a maintainer-approved exception, because this session's Write/Edit tools judge
  from the main checkout. The promote write (L78) took the same route, a further approved exception to that command's
  tool-only rule.

## Pointers

- `REVIEW.md` — four lenses plus three adversarial reviewers; 0 blocking. Every finding has a disposition (fix-round
  table).
- `GRILL.md` — advisory; its four build-breaking concerns drove plan revision 2.
- `BUILD.md`, `REGRESSION.md`, `VERIFY.md`, `HUMAN-PATCH.md`, `HUMAN-PATCH-2.md`, `rewrite-hits.tsv`, `build/`.

lesson: promoted L78

deferred:

- Appending a component to a path list shifts every positional reader. Here a hard-coded `rel[2]` in `stage-agent.mjs`
  `writeResult` pointed one directory too high, and the suite caught it. A neighbour of L72, not yet a second
  occurrence.
- A desktop worktree shared by several sessions: scope-setter calls and file removals run with it as cwd clobber
  another session's epoch. Kept as a memory note, not canon: its remedy is environmental.

## Not done here (named)

- `CLAUDE.md` keeps two `LIMITS.md §7` cites (the backslash-symlink bound and the hook-wiring measurement) under
  the doc's old name. CI's instruction-growth check caps what one PR may add to `CLAUDE.md` at 2,048 bytes, and
  this PR adds 1,968 with those two lines left unchanged. They name the doc, not a link. Update them in a follow-up
  PR.

- `/pharn-loop` acceptance run on a scratch project installed with pharn-cli 0.14.x (`pharn init --ref <this branch>`).
  It needs the branch pushed, which is the maintainer's call.
- Cross-repo follow-ups, listed in CHANGELOG [7.0.0]: `pharn-dev/skills` commands.md, `pharn-dev/pharn-ci` probing
  `pharn/ci.yml`, `pharn-dev/phargus` via `pharn update`.
- A merge conflict waits with `loop-isolation-stop` (6.76.0, in progress in another session). It edits the
  `/pharn-loop` commands, the loop-record contract and the CHANGELOG, and it adds `.pharn/pharn-loop/<name>/isolation.json`,
  which this move must carry to `pharn/.run/` if that PR merges first.

Chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate.
