# SHIP — loop-interactive-cli-prep

**Where the run ended: GATE 2**, after `/pharn-dev-review`. The first pass stopped at `/pharn-dev-verify` (`FAIL`,
`lint:md`); at the human's instruction the git-ignored note that caused it was moved aside, and verify and review were
re-run.

## Stages, in order, with the verdict each was read by

| stage                        | verdict read                        | value                      |
| ---------------------------- | ----------------------------------- | -------------------------- |
| `/pharn-dev-plan`            | GATE 1 (the human, 2026-10-26)      | approved as written        |
| `/pharn-dev-grill`           | `check-plan-lessons.mjs` exit       | 0                          |
| `/pharn-dev-build`           | `validate.mjs` exit                 | 0                          |
| `/pharn-dev-regress`         | `regression-report.json` `.verdict` | `no-regressions`           |
| `/pharn-dev-verify` (first)  | `verify-report.json` `.verdict`     | `FAIL` (`lint:md`)         |
| `/pharn-dev-verify` (re-run) | `verify-report.json` `.verdict`     | **`PASS`**                 |
| `/pharn-dev-review`          | — (advisory, no verdict)            | GREEN, 0 floor, 4 advisory |

- **The human's decisions in this run:** GATE 1 (approve; leave the starter's `.claude/settings.json` as committed);
  at regress, move four pre-existing untracked paths aside for the scope check and restore them (`REGRESSION.md`);
  after the verify FAIL, move `.pharn/batch-2026-10-19/followups-discovery.md` aside and re-run (`VERIFY.md`).
- **Review:** `REVIEW.md` — no floor-gate finding; one `important` advisory finding (line 85 of the measurement file
  overstates what changed since the 6.73.2 attempt) and three minor ones. All four fixed after GATE 2 at the human's
  request, under the plan's `## Files` scope: §1 now lists what differs from and what matches the 6.73.2 attempt, the
  shape-hash sentence says what equal hashes do and do not show, §0.5 cites T:10, and the sources line separates §0's
  sources from §1's. Re-checked after the fix: prettier and markdownlint clean on the file, `validate` GREEN, reconcile
  `CLEAN`; the full verify chain was not re-run.
- **Grill:** `GRILL.md` — 4 advisory concerns, each answered in `RUN-PROTOCOL-interactive.md`.

changelog-entry: exit 1

The increment adds no `CHANGELOG.md` entry (the request said no other pharn-oss changes), so CI's per-PR CHANGELOG step
will RED on a pull request carrying it as is.

lesson: none — the slips this run hit are covered by L40/L64 (the comparability sentence) and L17/L61 (the two
stops); see `REVIEW.md`.

deferred: none

## Outside this repository (Bash writes the fix #7 hooks never judged — L19)

- pharn-cli 0.13.0 → 0.14.1 (`npm i -g`).
- `~/Projects/pharn-starter-6.72`, detached at **`998a4d06`**: `505e70ab` (PHARN 7.1.1 from pharn-oss `e4b17048`),
  `9b36cf01` (`gates.exclude` gains `test`: `test` and `base:test` were killed at 540 s), `998a4d06` (`START.md`,
  `RUN-PROTOCOL-interactive.md`). Tree clean, no PHARN records in its git dir.
- `~/Projects/pharn-measure/run-facts.mjs` — the transcript-facts helper the collection runs.
- `.pharn/batch-2026-10-19/followups-discovery.md` is moved back after this file is written.

_Chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate._
