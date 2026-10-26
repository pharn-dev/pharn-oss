# SHIP — loop-background-cli

**Where the run ended: GATE 2**, after `/pharn-dev-review`. The human chose "Fix 4, then ship (Recommended)": fix the
four advisory findings, commit (the human's trusted-doc edit included), push, take PR #401 out of draft, and reset
pharn-starter.

## Stages, in order, with the verdict each was read by

| stage                | verdict read                        | value                      |
| -------------------- | ----------------------------------- | -------------------------- |
| `/pharn-dev-plan`    | GATE 1 (the human, 2026-10-26)      | approved as written        |
| `/pharn-dev-grill`   | `check-plan-lessons.mjs` exit       | 0                          |
| `/pharn-dev-build`   | `validate.mjs` exit                 | 0                          |
| `/pharn-dev-regress` | `regression-report.json` `.verdict` | `no-regressions`           |
| `/pharn-dev-verify`  | `verify-report.json` `.verdict`     | **`PASS`**                 |
| `/pharn-dev-review`  | — (advisory, no verdict)            | GREEN, 0 floor, 4 advisory |

- **The human's decisions in this run:** GATE 1 (approve; the accurate README sentence instead of "headless also
  completed", one `docs/limitations.md` bullet, trusted-doc text proposed for the human); at regress, move the four
  pre-existing untracked paths aside for the scope check and restore them (`REGRESSION.md`); before verify, move the
  git-ignored `.pharn/batch-2026-10-19/followups-discovery.md` aside and restore it (`VERIFY.md`); after verify, apply
  the trusted-doc patch (`TRUSTED-DOC-PROPOSALS.md`); at GATE 2, fix the four findings and ship.
- **An out-of-order human write, undone in time.** The trusted-doc patch was first applied at 12:51 UTC, inside the
  build's anchor→verify window, after the turn had printed the command early. At this run's request the human reverted
  it at 12:54, before regress's head side started; reconcile stayed `CLEAN`. It was applied for good after verify.
- **Review:** `REVIEW.md` — no floor finding; four advisory ones, all fixed after GATE 2 under the plan's scope
  (re-scoped with `--from-plan` and recorded with `--amend-scope`): the headless restatements now carry their condition
  (6.73.2 sent `run_in_background: false`; headless under 7.1.1 is not measured) in `README.md`, `docs/pipeline.md`,
  `stage-agent-core.mjs`, the CHANGELOG and the proposal file; `docs/pipeline.md`'s "does not stop the run" is bounded
  by the cap and the S9 path; the CHANGELOG names the applied trusted-doc edits. Re-checked after the fixes: prettier,
  markdownlint and eslint clean on the scoped files, and `npm run check` on the commit (in the PR body). The full verify
  chain was not re-run after the fixes.
- **Grill:** `GRILL.md` — 5 advisory concerns, each answered at build: the figure re-derivation and restatement grep
  were done; finding (a)'s share is labelled `R·e`; the CHANGELOG names the trusted-doc edits only now that they landed;
  the verdict keeps its past tense and count; the stage-load budget was checked after the LIMITS edit (314/314).

## Follow-ups

Of `stage-agent-background-wait`'s three (its `SHIP.md` unchanged): `loop-background-wait-measure` — closed by
measurement, except whether `TaskStop` reaches a background agent, which goes with `taskstop-grant-scope`;
`taskstop-grant-scope` — remains; `anchor-clock-skew` — remains, not observed in six waits.

Attempt 1's `loop-foreground-default-prose` — the prose is corrected here; whether `--no-foreground-agent` and its
printed remedy stay remains (0 of 6 routed start lines applied it).

New, proposed in the record's §7, not built: `quick-entry-no-base-slot` (no `base:test` slot under `--quick`; the slot
after the attributable gates in a full run); `loop-operator-allow-rules` (document the two operator rules with their
breadth, and measure the commands' exact grants alone).

changelog-entry: exit 0

lesson: skipped

deferred: none

## Outside this repository (Bash writes the fix #7 hooks never judged — L19)

- `~/Projects/pharn-starter-6.72` — after this file: detached at `9c6343b7`, which removes `START.md`,
  `RUN-PROTOCOL-interactive.md` and `.claude/settings.local.json`; branch `pharn-loop/merge-legal-into-company` kept at
  `f87dd005`, never merged.

_Chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate._
