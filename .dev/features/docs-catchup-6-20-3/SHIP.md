# SHIP — docs-catchup-6-20-3

Prose corrections only, requested by the user in chat on 2026-09-24 ("go to worktree and provide updates, then create
pull request") after a docs audit of the last ~30 commits.

## Where the run ended

**GATE 2 is the user's.** `PLAN.md`, then the edits (through the Write/Edit tools, under a scope set from the plan and
a reconcile anchor taken after it), then the gates below, run once in the session's worktree. The dev stage commands
(`/pharn-dev-grill`, `/pharn-dev-regress`, `/pharn-dev-verify`, `/pharn-dev-review`) were **not** run: the request was
for the edits and a PR, and the change is prose. The PR is opened, not merged.

## Structural verdicts, verbatim

- `check-plan-lessons.mjs` exit **0** (`applied_lessons: [L47]`).
- `validate.mjs` **`FLOOR: GREEN — 36 capabilities checked`**.
- `npm run check` exit **0**: `format:check`, `lint`, `lint:md`, `docs:check`, `check:markers`, `check:badge`
  (`6.20.3`), `check:changelog`, `check:contributing`, `check:reconcile` (`"verdict": "CLEAN"`), and `test`
  (3207 tests: 3205 pass, 0 fail, 2 skipped).
- `check:changelog-entry`: **GREEN** — one new entry, opens `## [6.20.3] - 2026-09-24`.

lesson: none

deferred: the `stop-guard-live-probe` follow-up (open since 6.12.0 wired the `Stop` guard; `CLAUDE.md` already says so).

_the named floor verdicts are as shown — this is NOT a judgment that the change is good or wise; that is the human's
call at the merge._
