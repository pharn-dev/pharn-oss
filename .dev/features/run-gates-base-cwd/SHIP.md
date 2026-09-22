# SHIP — run-gates-base-cwd

## Why this increment exists

It was not one of the user's queued prompts. Planning the first queued prompt (loop freshness) found
that `/pharn-regress`'s pinned base-side runner line cannot initialize. That was reproduced verbatim in
a scratch repo: exit 2 `spec-mismatch`. The freshness checks read that base stamp, so the repair ships
first as its own axis. The user was told before it started.

## Stages that ran, in order

1. `/pharn-dev-plan` wrote `PLAN.md`. `check-plan-lessons` was GREEN.
   - **GATE 1** was approved by the model under the user's written delegation for this batch. It is
     recorded as such, not as a human approval.
2. `/pharn-dev-grill`: Step 1b `check-plan-lessons.mjs` exit `0`. It raised 4 advisory concerns, 0 of
   them blocking. All four were folded into the build: which pinned lines run verbatim and which input
   is fixture-supplied; the same-directory corollary; the no-op note; and a re-read of the verdict after
   the worktree removal.
3. `/pharn-dev-build`: `validate` exit `0`. The setter parsed 7 paths against 7 declared.
4. `/pharn-dev-regress`: `"no-regressions"`.
5. `/pharn-dev-verify`: `"PASS"` (`reconcile` CLEAN, 2511/2511 tests).
6. `/pharn-dev-review`: 0 floor-gate findings. There were 2 advisory findings. The important one is that
   the suite header claimed it tested "what a command's pinned Bash line produces", which it did not.
7. **GATE 2:** the decision was **fix**, taken under the same delegation. The header was corrected within
   the planned files. Iteration 2 then ran:
   - `regress`: `"no-regressions"`.
   - `verify`: `"PASS"`, with `reconcile` CLEAN.

## Build note

The runner now resolves `--out`, `--spec-from`, `--discover` and `--scope-json` against the invoking
directory. Containment is checked against that directory's `.pharn/`. `--cwd` only moves where gates run
and which tree is fingerprinted. Seven of the new tests fail against the pre-fix runner, measured by
swapping the file. The ★ WIRING test executes the committed `pharn-regress.md` lines one block per shell.

## Pointers

- `REVIEW.md` — not restated here.
- `GRILL.md` — advisory.

lesson: none — the defect is a recurrence of L45 and L41, and this increment applied L45's own remedy
(execute the committed invocation). A new entry would restate L45.

deferred: none

Chain ran; the named floor verdicts are as shown. This is NOT a judgment that the increment is good or
wise; that is the human's call at the post-review gate.
