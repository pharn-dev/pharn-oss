# REVIEW — orchestrator-direct-stage-calls

**Floor first (P0):** `node pharn/floor/validate.mjs .` → GREEN (re-run after the fixes below).

**How this review was run (recorded, advisory).** An independent Opus agent with a fresh context reviewed pushed
commit `20f4e9c` (PR #314, current with `main` 6.40.0). It reproduced its two important findings rather than reasoning
about them: a Bash call moved to the background at a 3 s tool timeout, and a duplicate-flag refusal on a re-asked
question. The orchestrator relayed the findings and decided, under the user's delegation, to fix all five. That decision
was made by a model, not by a human. The reviewer's free text below inherits the increment's untrusted tag and is
quoted as DATA (P2). The builder wrote this file, and each fix is described in its own words beneath the finding.

## Floor-gate findings (blocking)

None. The reviewer reported 0 floor-gate findings, and validate is GREEN.

## Advisory findings

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: "pharn/floor/stage-direct.mjs:49"
  problem: "A Bash call that hits the tool timeout is MOVED TO THE BACKGROUND, not killed; its child keeps running. The prescribed resume then runs a second stage script concurrently on the same `.pharn/pharn-<stage>/` state; when the backgrounded call ends its `--clear` deletes a scope a later call set, and it writes a stray `orchestrator` marker. The header bullet 'steps 4–6 never run' is wrong."
  evidence: "Backgrounding reproduced at a 3 s timeout; 600 s assumed to behave the same."
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".claude/commands/pharn-ship.md:208"
  problem: "Ship's question relay re-runs 'the same line with the chosen option's argv appended'. On a re-asked tests-unresolved question that duplicates --tests, or collides with --no-tests — the 6.23.0 A2 defect. The answer must be the pinned fresh line + the object's resume.argv (after --budget-ms <B>) + the option."
  evidence: "Duplicate refusal reproduced."
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".claude/commands/pharn-ship.md:150"
  problem: "On a `start` crash (an exit outside {0,2,3}) no stage-start marker is written, so LIMITS' 'records its reason on its marker' is untrue there, and ship-outcome's gate2 can be refused for a missing build stage-start."
  evidence: "The command says only: run the stage inline and name it in SHIP.md's route line."
- type: FINDING
  rule_id: "P4"
  severity: minor
  file: ".claude/commands/pharn-ship.md:563"
  problem: "The close-part load condition names 'step 7's return marker after the first /pharn-verify', but step 7's verify is now one stage-direct.mjs call that writes that marker itself; pharn-ship-close.md:13 and :378 say the same."
  evidence: "Read it once: in the same turn as step 7's return marker after the first `/pharn-verify`"
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "pharn/pharn-contracts/cost-ledger.md:487"
  problem: "The `executions` row is said to span the script's run 'plus the scope set and release', but the setter runs before the start marker, so the row covers the stage plus the scope RELEASE only. CHANGELOG [6.41.0] says the same."
  evidence: "stage-direct.mjs: runSetter(...) precedes tryMarkPhase(... stage-start ...)."
```

**Confirmed fine by the reviewer (quoted as DATA):** every exit, route and read outcome maps to the same row in the
loop, ship and the quick parts; the open-stage rule; the scope is exact and released on every exit; no untrusted shell
input; every wiring pin executes with its controls; the saving claim is honest; the byte ceilings are met.

## Fixes (the builder's account)

- **R1 — an in-flight lock, and "a backgrounded call is still running".**
  - `stage-direct.mjs` now takes `.pharn/stage-direct/in-flight.json` before anything else: `O_EXCL|O_NOFOLLOW`,
    holding the pid, the start time, the stage and the name. A lock whose pid is alive refuses `in-flight` (exit 2,
    nothing set, run or marked). A lock whose pid is dead is stale, so it is cleared and taken. A torn record is never
    guessed stale: it refuses, naming the file to remove. A lock directory that is a link or a file refuses
    `lock-unusable`, and nothing is written through it. The lock is released in a `finally`, and only while it holds
    this call's own record.
  - **One deviation from the finding's wording**, stated: the lock is not under `.pharn/pharn-<stage>/`. Each stage
    script's fresh start deletes that root (`stage-verify.mjs` removes `.pharn/pharn-verify/` whole), which would
    delete a held lock. The two stages also share the one writes-scope file a second call would clobber. So one lock
    serves both, beside their roots.
  - Both orchestrators: "a call the Bash tool reports as moved to the background is STILL RUNNING". Wait for it
    (ship may end its turn; the loop waits inside its turn, else S9 saying the call may still be running), branch on
    what it reports, and never start its resume line or another call meanwhile. The "resume once when the Bash tool
    timed out" clause is gone from both. The header's failure-mode bullet now says what happens.
  - Tests (`stage-direct.test.mjs`): `parseLock`; a live holder refuses a fresh call and a resume (control: no lock
    runs); a dead holder is cleared; a torn record refuses; a link or a file refuses `lock-unusable`; release on every
    exit and a signal, but never of another call's record. One ★ test runs two PROCESSES: a held first call refuses
    the resume line and a verify call, its scope and markers untouched, then closes its own stage. Mutation control:
    with the refusal disabled, all four lock tests fail.
  - Hygiene rule 7 (`DIRECT_STAGE_WIRING`) pins the paragraph in both orchestrators and closes the old timeout
    clause out, each with a mutant.
- **R2 — the answer line.** Ship now says: run `stage-direct.mjs` with the pinned line's own flags up to and including
  `--budget-ms 570000`, then the object's `resume.argv` tokens after its own `--budget-ms` value, then the option.
  A ★ test drives the REAL `stage-regress.mjs` through `stage-direct.mjs`: tests-unresolved, a re-ask, then
  install-unresolved, then `done`. Its controls are the old rule on the re-ask, where a second `--tests` is refused by
  the call and `--tests` beside `--no-tests` is refused by the script. Hygiene rule 8 pins the sentence and closes the
  old one out.
- **R3 — the crash fallback.** Both orchestrators pin one line,
  `node pharn/floor/mark-phase.mjs --name '<name>' --kind stage-start --stage <stage> --route 'inline:route-unavailable'`
  (for the build, with the start line's own `--iteration`). Its route is a fixed literal, so no model types a token.
  Hygiene: exactly one such line per orchestrator, byte-equal; a typed `'<route>'` and a second copy are red;
  `SHELL_VALUES` gains `<stage>`. A ★ WIRING test in `ship-outcome-core.test.mjs` runs the committed fallback for
  build@1, then verify@1, and derives `gate2-quick`. Its control, with no fallback, does not.
- **R4 — the close part's load condition** reads "with step 7's first `/pharn-verify` call that exits other than `5`"
  in the pointer and in both of the close part's sentences. `pharn-ship-close.md` joined the plan's `## Files` for
  this. A family test holds all three, and the old wording is red in either file.
- **R5 — the `executions` wording** in `cost-ledger.md` and CHANGELOG [6.43.0] (renumbered from 6.41.0 after #313): the stage plus the scope release; the
  set is outside the row.

**Not fixed here, flagged:** the thin callers `/pharn-regress` and `/pharn-verify` still tell a person to run the
resume line once when "the Bash tool itself timed out". That is the same misreading R1 corrects, in commands outside
this increment's scope and outside the owner's five decisions. It is named for a follow-up, not changed.
