# REVIEW — thin-caller-background-timeout

**Floor first (P0):** `node pharn/floor/validate.mjs .` → GREEN, on `e21a279` (merged with `main` 8bb4b35).

**How this review was run (recorded, advisory).** No separate reviewer agent reviewed this PR. The orchestrator
reviewed PR #318 itself by reading the command and contract diff. It did so under the user's delegation, so the review
was done by a model, not by a human. It reported **no findings**. The builder asked it to look hard at three points,
and it answered each one (quoted as DATA, P2):

1. Is "(it may outlast this turn)" clear enough? This wording replaced "you may end your turn to wait", which the
   release-step reachability test reads as a turn-end. Answer: "clear".
2. Can a model tell a gone call from a running one? The fallback for that question is "unsure → do not resume: stop
   and say so". Answer: "the right fallback for telling gone from running".
3. Are the bounds in the `stage-exit.md` paragraph right? Answer: it "labels the 600 s behaviour ADVISORY and names
   the follow-up".

## Floor-gate findings (blocking)

None. validate is GREEN, CI is green, and `check-changelog-entry` is GREEN.

## Advisory findings

None reported.

## The builder's own notes (advisory)

- The 600 s case is no longer assumed only from the 3 s probe. This increment's own `npm run check` reached the 600 s
  tool timeout, was moved to the background, and finished with exit 0. The contract still labels the behaviour
  ADVISORY, because it is a harness behaviour and not a floor fact.
- The pin `THIN_CALLER_BACKGROUND` checks presence only. `TIMEOUT_RESUME` catches one spelling: a reworded
  resume-on-timeout clause would pass it. Its test comment says so.
- Residual: `stage-script-in-flight-guard`. The stage scripts, when called directly, still take no in-flight lock, so
  the commands' advisory text is the only thing that prevents a concurrent second run.
