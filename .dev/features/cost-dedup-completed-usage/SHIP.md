# SHIP — cost-dedup-completed-usage

`/pharn-dev-ship` (gated mode). The request: the cost renderers' transcript dedup kept each request's FIRST line and
so under-counted output tokens. Count the completed usage instead, keep the rule in one owner, correct the false
header claim, add an 8, 8, 163 fixture test with a mutant control, and ship it as a patch with a CHANGELOG entry.

## Where the run ended

**GATE 2, for the second time.** Every stage ran, in order:

1. `/pharn-dev-plan`
2. GATE 1
3. `/pharn-dev-grill`
4. `/pharn-dev-build`
5. `/pharn-dev-regress`
6. `/pharn-dev-verify`
7. `/pharn-dev-review`, iteration 1
8. GATE 2, which chose "Fix, then re-run"
9. `/pharn-dev-memory-promote`, which wrote L63
10. `/pharn-dev-build`, fix iteration 1 (PLAN.md, "Fix iteration 1", F1–F3)
11. `/pharn-dev-regress`, iteration 2
12. `/pharn-dev-verify`, iteration 2
13. `/pharn-dev-review`, iteration 2, by a fresh independent reviewer
14. GATE 2

The grill ran once, on the approved plan. The fix iteration was not re-grilled.

## The human gates

- **GATE 1 (plan acceptance):** the human answered in an interactive form. Identity and timestamp come from the
  request's first line, and the plan was approved as written. Not delegated.
- **GATE 2, first pass (post-review decision):** the human answered in an interactive form:
  - R1: "Bound it";
  - R2: "Extract a core now";
  - the decision: "Fix, then re-run";
  - the lesson: "Promote".

  Not delegated.

- **The promote gate:** "Accept & write".
- **GATE 2, second pass:** pending. This file is written before it. `/pharn-dev-ship` itself merges nothing and
  applies no seal.

## Structural verdicts, verbatim

| stage                | verdict read                           | value                                                                     |
| -------------------- | -------------------------------------- | ------------------------------------------------------------------------- |
| `/pharn-dev-grill`   | `check-plan-lessons.mjs` exit          | `0` (GREEN)                                                               |
| `/pharn-dev-build`   | `node pharn/floor/validate.mjs .` exit | `0` (`FLOOR: GREEN — 36 capabilities`), in both build iterations          |
| `/pharn-dev-regress` | `regression-report.json` `.verdict`    | `"no-regressions"`. Iteration 1 read the same; the file holds iteration 2 |
| `/pharn-dev-verify`  | `verify-report.json` `.verdict`        | `"PASS"`. Iteration 1 read the same; the file holds iteration 2           |

## Pointers

- `REVIEW.md`: the iteration-2 review sits on top and the iteration-1 review below it, unchanged. Iteration 2 has 0
  floor-gate findings and 10 advisory findings, all minor. It finds R1–R10 resolved, R7 partly resolved, and R11
  resolved as documentation.
- `GRILL.md`: 12 advisory concerns. PLAN.md's "Post-grill amendments" (G1–G12) records how each was taken.
- `REGRESSION.md` and `VERIFY.md`: iteration 2.

## Recorded lines

changelog-entry: exit 0

It ran after `git fetch --no-tags origin main`, against `--merge-base origin/main (767bf61f493f)`. That merge-base is
still this run's base. So the check does not see that `main` has moved (see "Before any pull request").

lesson: promoted L63

The human chose Promote at the first GATE 2 and Accept & write at the promote gate. `check-provenance.mjs` was GREEN.
The id is read from the `## L63` heading in `.dev/memory-bank/lessons-learned.md`. `origin/main`'s canon ends at L62,
so a merge causes no id collision. The iteration-2 review (S10) finds one remedy sentence in L63 inexact. Changing it
would edit canon, which is the human's decision.

deferred:

- The iteration-2 review notes that S2 recurs [[L60]]'s class. That would be a note on L60, not a new entry, and it
  is not carried to promotion.

## Named follow-ups (not built)

- **Non-string transcript ids** (iteration-1 R11, filed as a task chip outside the repo): a non-string `requestId` or
  `model` throws in the reader. The iteration-2 S9 belongs there too: a `null` ledger row crashes
  `--verify-transcript` with no RED line.
- **S5:** the projects-directory default is spelled out in three CLIs.
- **S8:** the "skips an unreadable subtree" test never makes anything unreadable.

All three predate this increment.

## Before any pull request

- **`origin/main` moved to 6.23.0** (`1524c6f`, PR #277). It overlaps this increment in `CHANGELOG.md`, `README.md`,
  `SKILLS_VERSION`, `CLAUDE.md` and `.claude/commands/pharn-ship.md`. A PR needs, first:
  - a merge of `origin/main`;
  - this release renumbered from 6.22.1 to 6.23.1, found by diffing the added lines, not from memory;
  - the README regenerated, because the generated floor count moves;
  - every gate re-run over the merged tree.
- **After that merge, a local `check:reconcile` RED on #277's files is expected.** `git merge` writes files the build's
  epoch cannot attribute. CI has no baseline and reads `NO_BASELINE`.
- **Nothing has been committed.**

chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate.
