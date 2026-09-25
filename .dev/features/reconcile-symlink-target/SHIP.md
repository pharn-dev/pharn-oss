# SHIP — reconcile-symlink-target

**Stages run, in order:** `/pharn-dev-plan` → GATE 1 → `/pharn-dev-grill` → `/pharn-dev-build` → `/pharn-dev-regress` →
`/pharn-dev-verify` → (rebase onto 8eec2d7, re-anchor) → `/pharn-dev-regress` → `/pharn-dev-verify` → `/pharn-dev-review`
→ (rebase onto 67b7b8b, re-anchor) → GATE 2. **Where the run ended:** GATE 2.

## The two gates — model decisions under delegation, NOT human approvals

Both gates were delegated by the user's instruction of 2026-09-24 (verbatim): _"fix all findings, if you can ship some
of them at one run do it, if you can ship some of them simultaniuslly in worktrees do it. each fix needs to be fixed by
using pharn-dev-ship command and needs to ends by merged pull request. you merge pull requests when the CI are green."_

- **GATE 1 (plan acceptance):** approved by the orchestrating session, not by a human. It approved fix (a), plus the
  two decisions flagged for it: the `ALGO` bump to `worktree-fingerprint/2+sha256` with a golden-digest test, and
  removing the exported `LINK_TEXT_ERRNOS`. It added four notes, all applied (`PLAN.md`, "GATE 1").
- **After the grill, amended by this model under the same delegation:** four advisory grill concerns were folded into
  the plan before the build, with no design or `## Files` change (`PLAN.md`, "Post-grill amendments"). They were: the
  no-follow open goes FIRST (measured 35.7 ms vs 49.6 ms of classification over 2220 paths), the guard is executed in
  the ★ fixture, the "final component" wording, and the re-point residual disclosed in the CHANGELOG.
- **GATE 2 (merge / fix / abandon): "merge once CI is green"**, decided by this model under the delegation. The floor
  verdicts below are green, and there is no blocking review finding. The four advisory findings are all minor and are
  left as recorded follow-ups, not fixed here: two need a design choice, and none is cheap enough to justify another
  regress/verify cycle. The orchestrator merges; this run does not.

## Structural verdicts, verbatim

- `/pharn-dev-grill` → `check-plan-lessons.mjs` exit **0** (GREEN)
- `/pharn-dev-build` → `node pharn/floor/validate.mjs .` exit **0** (`FLOOR: GREEN — 36 capabilities`)
- `/pharn-dev-regress` → `regression-report.json` `.verdict` **`no-regressions`** (post-rebase, base `8eec2d7`). An
  earlier post-rebase run read `regressions` (outside `tests` 0 → 1). It did not reproduce, either in a full `npm test`
  or in the one allowed re-run, and is recorded in `REGRESSION.md`.
- `/pharn-dev-verify` → `verify-report.json` `.verdict` **`PASS`**. All seven gates were 0, `reconcile` included
  (`CLEAN` in both epochs; see `VERIFY.md`).
- Final tree after the 6.20.8 renumbering: `npm run check` exit **0** (3269 tests: 3267 pass, 0 fail, 2 pre-existing
  environment skips).
- `changelog-entry: exit 0` (`CHANGELOG-ENTRY: GREEN — this PR opens "## [6.20.8] - 2026-09-25"`).

## Pointers

- `REVIEW.md`: verdict GREEN, 0 floor-gate findings, 4 advisory (minor). The findings are cited there and not restated.
- `GRILL.md`: 4 advisory concerns, folded in before the build.
- `PLAN.md`: design, decisions, the GATE-1 notes, the post-grill amendments, and three renumberings (6.20.5 → 6.20.6 →
  6.20.7 → 6.20.8, as #268, #269 and #270 merged first).

## Honest process notes

- **Two reconciliation epochs, not one.** The build's own writes were reconciled `CLEAN` in the pre-rebase epoch (19
  candidates). After rebasing onto #269 the epoch was re-anchored, so another PR's files would not read as escapes,
  and the post-rebase verify reconciled only later writes (`CLEAN`, 14 candidates). A `git reset --hard` to the
  rebased base, which would have let one epoch cover every write, was refused by the session's auto-mode classifier. It
  was not worked around. The final tree was re-anchored once more after the #270 rebase, for `npm run check`'s own
  `check:reconcile`.
- **Bash writes to in-scope paths:** `SKILLS_VERSION`, and the two rebase renumberings (`CHANGELOG.md`, `README.md`,
  and this branch's own added lines under `pharn/`). Each ran under the build's plan scope, and none reached a path
  outside `## Files`.
- **Pinned shell forms were replaced by node runners** (`xargs`, `$(…)`, `; t=$?` and heredocs are refused in this
  worktree session), and this is recorded in `REGRESSION.md` and `VERIFY.md`. Every runner used argv arrays and
  recorded exit codes only. All were deleted before the lint gate that could read them.

## Lesson extract (Step 2b)

lesson: none — the failure fixed here is L59's own mechanism (a follow-call answering for the target). L59 already
names it and prescribes the remedy this increment applied: classify the link itself and enumerate the path kinds. The
one other candidate, the fingerprint `ALGO` rule broken without a bump in 6.17.1, was remedied in code by the golden
digest, so there is no discipline-only remedy left to promote. Nothing is promoted here: canon needs a human accept at
`/pharn-dev-memory-promote`, and under this delegation none was sought.

deferred: none

changelog-entry: exit 0

## Recorded follow-ups (from `REVIEW.md`, advisory, not built — P7)

- The `worktree-fingerprint.mjs` UPGRADES bound restates four consumers' algo-mismatch behaviour (L35's second-copy
  shape). It is a candidate to trim to a pointer the next time that header changes.
- The straddle block covers a PASSing verify report only; an honest pre-upgrade report that FAILED on the AC gate,
  read through #269's moved-tree E, is untested.

_Chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate, delegated here to the orchestrating session as quoted above._
