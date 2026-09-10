# SHIP — readme-writes-scope-default

- run: `/pharn-dev-ship` (gated mode; no `--loop`)
- ended at: **GATE 2** — the full chain ran; no stage returned a RED verdict

## Stages, in order, and where the run ended

| #   | stage                | outcome                                |
| --- | -------------------- | -------------------------------------- |
| 1   | `/pharn-dev-plan`    | `PLAN.md` written; **GATE 1** approved |
| 2   | `/pharn-dev-grill`   | floor GREEN; 4 advisory findings       |
| 3   | `/pharn-dev-build`   | edits applied; floor GREEN             |
| 4   | `/pharn-dev-regress` | `no-regressions`                       |
| 5   | `/pharn-dev-verify`  | `PASS`                                 |
| 6   | `/pharn-dev-review`  | `REVIEW.md`, 4 lenses                  |
| 2b  | lesson-extract       | asked; promoted                        |

## Structural verdicts read, verbatim

| read from                                       | value                                   |
| ----------------------------------------------- | --------------------------------------- |
| `check-plan-lessons.mjs` exit (grill re-verify) | `0`                                     |
| `pharn/floor/validate.mjs .` exit (build)       | `0` (GREEN — 36 capabilities)           |
| `regression-report.json` `.verdict`             | `no-regressions`                        |
| `verify-report.json` `.verdict`                 | `PASS` (10 gates; `npm test` 1931/1931) |

Advisory, not verdicts: `GRILL.md` (4 findings, 2 self-marked `blocking` — model judgment, gates nothing
per fix #3) and `REVIEW.md` (4 lenses). Both are cited, not restated — see
`.dev/features/readme-writes-scope-default/GRILL.md` and `.../REVIEW.md`.

## lesson

lesson: promoted L40

`## L40 — Probing a claim's members confirms membership, never the claim's stated CAUSE — to test an
attribution, vary the attributed condition, not the member`, accepted at `/pharn-dev-memory-promote`'s own
gate after `check-provenance.mjs` exited 0. Apparatus-only, so no `SKILLS_VERSION` bump for the promotion
itself.

deferred: the P4 finding from `REVIEW.md` lens 2 — this increment creates a SECOND prose site stating the
guard's width, so `DEFAULT_SAFE_SET`/`ALWAYS` now has three places to keep in sync (the hook + two docs).
Not promoted: it is the residual this increment enlarges and is already recorded as the named, deliberately
unbuilt `default-safe-set-doc-pin`, so it did not clear the L20 bar as a separate lesson.

## The run was rebased mid-flight — TWICE

`main` moved under this branch twice while the increment was in the chain, and both moves are recorded
because each changed the deliverable rather than merely the base:

1. **`4bd1b0c` -> `d851a08`** (PR 206, PR 207). PR 206 had already taken `SKILLS_VERSION` to `3.1.2` and
   promoted both an `L38` **and** an `L39`, so this increment's lesson was renumbered **L38 -> L39 -> L40**.
   The final id is derived programmatically from canon's highest `## L<n>` heading rather than assumed —
   after the first assumption tripped a fail-closed assertion, which is the mechanism working.
2. **`d851a08` -> `914f57e`** (PR 210, `SKILLS_VERSION` `3.2.0`). This increment therefore ships as
   **`3.2.1`**, not the `3.1.3` two earlier drafts of this file claimed.

The first move was handled by rebuilding the branch on main's current bytes rather than resolving conflicts,
so PR 206's own README repairs are preserved intact; the second was a real rebase whose only conflicts were
the badge and `SKILLS_VERSION`. **The defects fixed here survived both** — main's bullet was verified
byte-identical to the original before each rebase. Every verdict in the table above is post-rebase and was
re-measured, not carried.

`main` moving mid-run twice is exactly the contention `L38` describes, and the isolated worktree is why it
cost two rebases rather than a corrupted tree.

## Three bounds this run carries, stated rather than left implicit

1. **fix #7 had no jurisdiction over this run.** At the maintainer's instruction the work was done in a
   detached git worktree at `/Users/pgalarowicz/Projects/pharn-oss-wt-writes-scope`, outside the session's
   repo root. Every writes-scope entry is repo-root-relative, so no scope could name a path in it and the
   `PreToolUse` guard denied nothing; every edit went through **Bash** (L19). fix #7 is therefore
   **advisory for this run** — the guard was not bypassed in-repo, it had no jurisdiction at all.
2. **`SKILLS_VERSION` 3.2.0 -> 3.2.1** (patch), because `.claude/commands/pharn-review.md` is product
   surface. `check:badge` and `check:changelog` both verify the bump deterministically; the README bullet
   alone would not have bumped anything.

3. **`check-provenance.mjs` was re-run against the PRE-WRITE canon, not the post-write tree.** Run against
   the live file after the append it correctly REDs on duplicate-id, and the 3.0.6 canon-arg binding
   correctly refused a `/tmp` copy — so the honest re-verification staged main's canon at a path ending in
   `.dev/memory-bank/lessons-learned.md` and passed GREEN there. Both refusals are the gate working, not
   obstacles worked around.

---

Chain ran; the named floor verdicts are as shown — this is **NOT** a judgment that the increment is good or
wise; that is the human's call at the post-review gate.
