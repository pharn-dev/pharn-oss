# SHIP — loop-interactive-cli-attempt1

**Where the run ended: GATE 2**, after `/pharn-dev-review`. The human chose "fix the four findings, then a draft PR".

## Stages, in order, with the verdict each was read by

| stage                | verdict read                        | value                      |
| -------------------- | ----------------------------------- | -------------------------- |
| `/pharn-dev-plan`    | GATE 1 (the human, 2026-10-26)      | approved as written        |
| `/pharn-dev-grill`   | `check-plan-lessons.mjs` exit       | 0                          |
| `/pharn-dev-build`   | `validate.mjs` exit                 | 0                          |
| `/pharn-dev-regress` | `regression-report.json` `.verdict` | `no-regressions`           |
| `/pharn-dev-verify`  | `verify-report.json` `.verdict`     | **`PASS`**                 |
| `/pharn-dev-review`  | — (advisory, no verdict)            | GREEN, 0 floor, 4 advisory |

- **The human's decisions in this run:** GATE 1 (approve); at regress, move 12 pre-existing untracked paths aside for
  the scope check and restore them (`REGRESSION.md`); before verify, move the git-ignored
  `.pharn/batch-2026-10-19/followups-discovery.md` aside and restore it (`VERIFY.md`); at GATE 2, fix the review
  findings and open a draft PR.
- **Review:** `REVIEW.md` — no floor-gate finding; four advisory ones, all fixed after GATE 2 under the plan's scope
  (re-scoped with `--from-plan` and recorded with `--amend-scope`): §1.4(b) no longer states how the classifier treats
  grants (now "not shown"), the other setter lines are "not shown" rather than "exposed", (c)'s heading and its
  causal sentence are scoped to attempt 1's two calls and the pinned procedure, and the CHANGELOG restatement (L64)
  matches. Re-checked after the fix: prettier and markdownlint clean on both files, `validate` GREEN, reconcile
  `CLEAN`, `check:changelog` and `check:changelog-entry` GREEN; the full verify chain was not re-run.
- **Grill:** `GRILL.md` — 5 advisory concerns, each answered in `RUN-PROTOCOL-interactive.md` (byte-check outcome on a
  mismatch: stop and ask; the `test` filter's failure path; the wildcard rules' breadth; the attempt-3 assumption) or
  in REVIEW's cite recheck.
- **Built in shipped code: nothing.** §1 shows none of the three failure classes (clock skew, lost result, `finish`
  skipped), so `SKILLS_VERSION` stays 7.1.1.

changelog-entry: exit 0

lesson: none — the important review finding is L40's shape and the two stops are L17's and L61's; canon holds all
three.

deferred: none

## Outside this repository (Bash writes the fix #7 hooks never judged — L19)

- `~/Projects/pharn-measure/cli-1/` — attempt 1's collection, by the protocol's script unchanged.
- `~/Projects/pharn-measure/run-facts.mjs` — gains `scope_calls` and `denials`; checked on `cli-1` (it lists A:226's
  denial of A:225).
- `~/Projects/pharn-starter-6.72` — attempt 2's preparation, after this file: recorded in its
  `RUN-PROTOCOL-interactive.md`.

_Chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate._
