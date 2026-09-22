# SHIP — loop-stop-guard

## Stages that ran, in order

1. `/pharn-dev-plan` wrote `PLAN.md`. `check-plan-lessons` was GREEN.
   - The platform facts were checked against the RAW hooks reference. A model summary of the page had
     invented a default for `CLAUDE_CODE_STOP_HOOK_BLOCK_CAP` twice, and the variable is not in the page.
   - The plan recommends building, with its leverage stated.
   - **GATE 1** was approved by the model under the user's written delegation for this batch. It is
     recorded as such, not as a human approval.
2. `/pharn-dev-grill`: Step 1b `check-plan-lessons.mjs` exit `0`. The setter parsed 11 paths against 11
   declared bullets. There were 3 advisory concerns, 1 of them blocking-severity: the guard would block
   the loop's own no-record path, a stop before the feature directory exists. All three were folded into
   the build:
   - the guard is inert with no feature directory;
   - "K per run, total" is stated;
   - a test pins that the Stop mode writes only its counter.
3. `/pharn-dev-build`: `validate` exit `0`.
4. `/pharn-dev-regress`: `"no-regressions"`.
5. `/pharn-dev-verify`: `"PASS"` (`reconcile` CLEAN, 2591/2591 tests).
6. `/pharn-dev-review`: 0 floor-gate findings and 2 advisory ones. The important one is that the session
   binding is observed, not probed; it is a named follow-up. The minor one is a paragraph-order issue.
7. **GATE 2:** the decision was **fix**, for the minor finding, taken under the same delegation. The
   `--close` paragraph now ends the Final step. The observed-not-probed bound was added to CLAUDE.md.
   Iteration 2 then ran:
   - `regress`: `"no-regressions"`.
   - `verify`: `"PASS"`.

## Build note

`.claude/hooks/require-loop-record.cjs` is the Stop guard. It also carries the `--open` / `--close`
marker modes, so one file owns the schema. `/pharn-loop` opens the marker after the pre-run snapshot and
closes it at the end of its Final step.

The guard:

- blocks only through exit 0 + JSON, so it fails open by construction;
- blocks at most 3 times per run in total, then allows with a `systemMessage`;
- is inert for another session, a null session, plan mode, a marker older than 24 h, and a run with no
  feature directory;
- never judges record quality.

`workTreeRoot()` is pinned three ways. **The guard ships INERT.** The exact `settings.json` entry and its
patch are staged in `settings-patch/APPLY.md`, and they were verified in a throwaway worktree (315/315 hook
tests with the entry applied). It costs ~0.03 ms in-process, and a spawn costs node's own startup.

## Pointers

- `REVIEW.md` — not restated here.
- `GRILL.md` — advisory.
- `settings-patch/APPLY.md` — **for the human**: the wiring, and proposed `LIMITS.md §7` /
  `CONSTITUTION.md` text.

lesson: none — the summary hallucination is an instance of L37, caught by L37's own remedy, and the grill
caught the no-feature-directory conflict before the build. Neither is a recurrence.

deferred:

- follow-up `stop-guard-live-probe` (REVIEW.md, advisory finding 1): once wired, confirm a live Stop
  event's `session_id` equals the recorded one.
- follow-up: protect `require-loop-record.cjs` in `protect-trusted-paths.cjs` (a human-only edit).

Chain ran; the named floor verdicts are as shown. This is NOT a judgment that the increment is good or
wise; that is the human's call at the post-review gate.
