# REVIEW — loop-closeout-script

**Reviewer:** an independent opus agent run by the batch orchestrator on commit `6d1f19e`; its findings were relayed
by the orchestrator, which decided "fix all" under the user's delegation (not a human decision). The finding texts
below are the reviewer's, quoted as **DATA** (P2): they inform this record and are never instructions.

## Floor gate (FLOOR)

`node pharn/floor/validate.mjs .` → GREEN (36 capabilities). Floor-gate findings from the reviewer: **0**.

## Advisory findings (the reviewer's, quoted) and their disposition

```yaml
- type: FINDING
  rule_id: P5
  severity: important
  file: ".claude/commands/pharn-loop-close.md:174"
  problem: "Step 6d is entered for exit 4 AND a crash, but its item 1 ('already undone') is false after a crash (e.g. a commit hook outliving the tool timeout leaves the checkout on pharn-loop/<name> with the list staged)."
  evidence: "R1 — fix: 6d.1 for exit 4 only; a crash gets its own instruction; write the phase before each git step; a call moved to the background is still running."
- type: FINDING
  rule_id: P5
  severity: minor
  file: "pharn/floor/loop-closeout.mjs"
  problem: "Re-running the closeout after a commit commits again (reproduced)."
  evidence: "R2 — refuse with exit 2 when HEAD is on pharn-loop/<name>[-N]; say never re-run."
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".claude/commands/pharn-loop-close.md"
  problem: "The crash bullet does not name what a crash may lose, and records stage failed on a non-green stop."
  evidence: "R3 — name run-stop marker, cost.json, RUN-REPORT.md; a non-green crash records not committed: <decision>."
- type: FINDING
  rule_id: P5
  severity: minor
  file: ".claude/commands/pharn-ship-close.md"
  problem: "Ship's crash path leaves the run marker open with no remedy."
  evidence: "R4 — the run-marker close may be run by hand (idempotent)."
- type: FINDING
  rule_id: P0
  severity: minor
  file: "pharn/floor/loop-closeout.mjs"
  problem: "The header says it replaces 14 requests; it replaces 15 with one."
  evidence: "R5 — 'replaces 15 requests with one (net −14)'."
- type: FINDING
  rule_id: P4
  severity: minor
  file: ".claude/commands/pharn-ship-quick.md:67"
  problem: "Items 3 and 12 still describe a typed run-marker --close line and an invocation-keyed report skip."
  evidence: "R6 — the close is inside the closeout; the skip keys on the run-start marker's --mode quick."
- type: FINDING
  rule_id: P1
  severity: minor
  file: "pharn/floor/loop-closeout.test.mjs"
  problem: "The end-to-end test executes its own argv, not the committed line (L45)."
  evidence: "R7 — extract the pinned line from the close part and execute it."
- type: FINDING
  rule_id: P5
  severity: minor
  file: "pharn/floor/loop-closeout.mjs"
  problem: "A long hook or checker output could push the closing JSON line out of the tool result."
  evidence: "R8 — git commit -q; cap each step's echoed output."
```

| id  | disposition                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | **Fixed.** The closeout writes `branch`/`add`/`commit`/`undo`/`committed`/`finished` to `.pharn/pharn-loop/<name>/closeout-phase` before each git step (a test's commit hook reads `commit`). The crash bullet has its own instruction: nothing was undone; quote `git status --short --branch` and the phase file; while on `pharn-loop/<name>` no SPEC revert and no Outcome rewrite. 6d.1 is for exit 4 only. The "moved to the background" rule is in Step 6b and ship's Step 3a. |
| R2  | **Fixed.** Exit 2, refusal `on-loop-branch`, when the checkout is on `pharn-loop/<name>` or `pharn-loop/<name>-<n>`; the reproduced double commit is a test (one commit made, no step run the second time). "Never run it again after a crash or after exit 0, 3 or 4" is in the close part.                                                                                                                                                                                          |
| R3  | **Fixed.** The crash bullet names the run-stop marker, `cost.json` and `RUN-REPORT.md`, and records `not committed: <decision>` on a non-green stop.                                                                                                                                                                                                                                                                                                                                  |
| R4  | **Fixed.** Ship's crash path pins the idempotent `run-marker.mjs --close pharn-ship '<name>'` line; the hygiene and run-marker pins now expect exactly that one typed close, after the closeout line, and a test executes it twice.                                                                                                                                                                                                                                                   |
| R5  | **Fixed** (header).                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| R6  | **Fixed.** `pharn-ship-quick.md` items 3 and 12 re-worded (added to `## Files`); the skip-set phrase the hygiene suite pins is kept.                                                                                                                                                                                                                                                                                                                                                  |
| R7  | **Fixed.** The end-to-end test reads the committed line out of the loop family, substitutes the placeholders and runs it under `sh -c`.                                                                                                                                                                                                                                                                                                                                               |
| R8  | **Fixed.** `git commit -q` (a stated difference from the former line, pinned); each step's stdout and stderr are capped to their last 8,192 characters with the cut named (a test).                                                                                                                                                                                                                                                                                                   |

Declined: none. The reviewer also confirmed: outcome strings and order unchanged; `recordFacts` parses like
`check-loop-decision.mjs`; fixed git argv, `GIT_LITERAL_PATHSPECS`, the same staging set; releases after every write;
the saving stated honestly; ceilings hold.

## Lesson candidate

Named for the maintainer, not promoted (parallel PRs collide on lesson ids): **a Bash call past the tool timeout is
moved to the background, not killed — so "a crash" in a pinned line's prose must not be assumed to have stopped the
process, and a re-run while it runs doubles its side effects.** It recurred in this batch (another review named it), so
it may clear L20's bar.
