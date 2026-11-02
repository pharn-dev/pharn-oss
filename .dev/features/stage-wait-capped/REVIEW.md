# REVIEW — stage-wait-capped

Reviewed: the uncommitted increment on HEAD `0b18864b` (10 paths: `stage-agent-core.mjs`, `stage-agent.mjs`, their two
tests, `cost-ledger.md`, `pharn-loop.md`, `pharn-loop-close.md`, `command-hygiene.test.mjs`, the
`floor-orchestration.md` guide, `CHANGELOG.md`). The increment is `trust: untrusted`; the issue body (#410) it answers
was read as a bug report, as DATA.

## Step 1 — floor first

`node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 37 capabilities checked in "."` (exit 0). Standing verdicts:
regress `no-regressions`, verify `PASS` (all seven gates exit 0, reconcile CLEAN).

## Floor-gate findings (blocking)

None. No guarantee lacks a floor reduction or an `advisory` label; no capability, `enforces` binding or eval changed
(no `role:` file touched — validate agrees); no sibling reference was added.

## Advisory findings (judgment — they inform, never block)

### L-floor → P0

- type: FINDING
  rule_id: P0
  severity: minor
  file: ".claude/commands/pharn-loop.md:541"
  problem: "'a re-run starts clean' reads as a property of the re-run, but a re-run only gets a fresh slug and run
  marker; the stopped agent's half-edited files stay in the tree until a person sets them aside, and an agent TaskStop
  did not reach may still be writing."
  evidence: "stop it with TaskStop and stop the run at **S9b**; a re-run starts clean."

- type: FINDING
  rule_id: P6
  severity: minor
  file: "pharn/LIMITS.md:614"
  problem: "The trusted doc (and its mirror `docs/limitations.md:153`) still lists 'the wait's cap' as not measured,
  while this increment's `stage-agent-core.mjs` residual now records the cap OBSERVED firing in a real run (#410); a
  human-only edit, so proposed below, not made."
  evidence: "One run is not a bound: a stage longer than one 570 s wait, the wait's cap, whether `TaskStop` stops an
  agent left running, other Claude Code versions and a full loop are not measured."

### L-eval → P1

No capability, so no eval binding to check. The behaviour change is covered by spawned-CLI tests: exit 6 with
`CAPPED_LINE` / `MARKER_CAPPED` and no marker; a second capped call still capped (never `wait-unanchored`); #410's
repro (a report after a capped call is consumed by the next `finish`, which writes the marker); a result already there
past the cap consumed as before; and the ship path (no `--budget-ms`) unchanged. `CAPPED_EXIT` has a parity test
against `READ_EXIT`, `WAIT_EXIT`, 1 and stage-exit's numbers. The hygiene pins assert the S9b mapping present AND the
old "after the wait's cap too" absent (L27's two-sided form).

### L-trust → P2

`CAPPED_LINE` and `MARKER_CAPPED` are fixed text; nothing from the result file or the marker reaches stdout or
stderr on the new path (`read: wait-capped` is a fixed `READ_DEFECTS` code). No instruction-looking content in the
reviewed files or the issue changed this review's behaviour. The S9b judgment trigger ("the session ended while a
stage agent ran") is the orchestrator's own reading, labelled as judgment in Step 2's intro and failing safe (a stop).

- type: FINDING
  rule_id: P2
  severity: minor
  file: ".claude/commands/pharn-loop.md:421"
  problem: "After a session ends, the orchestrator may no longer hold the stage agent's id, so S9b's 'stop that agent
  with TaskStop' may be unreachable; item 3's 'the summary says the stage agent may still be running' covers it only
  by proximity, not in the row."
  evidence: "stop `blocked: stage-outlived-wait` — stop that agent with TaskStop and never resume it"

### L-axis → P3

The pure decision stays in `stage-agent-core.mjs` (constants only) and the execution in `stage-agent.mjs`; the loop
text changes only its body (no frontmatter, so #409's grant lines merge cleanly). One axis per file holds.

- type: FINDING
  rule_id: P3
  severity: minor
  file: "pharn/floor/stage-agent.mjs:714"
  problem: "After the new early return, the `wait-capped` arm of `shown` is unreachable (a capped wait with a no-result
  defect already returned), so the line now serves `wait-unanchored` alone and reads as if it served both."
  evidence: "const shown = waitDefect !== null && NO_RESULT_DEFECTS.includes(defect) ? waitDefect : defect;"

## Proposed human patch — `pharn/LIMITS.md §8` (human-only; not applied)

In the launch bullet, replace "One run is not a bound: a stage longer than one 570 s wait, the wait's cap, whether
`TaskStop` stops an agent left running, other Claude Code versions and a full loop are not measured." with:

> One run is not a bound: a stage longer than one 570 s wait, whether `TaskStop` stops an agent left running, other
> Claude Code versions and a full loop are not measured. The wait's cap fired once in a real run (issue #410, PHARN
> 7.1.4: the session ended while the build agent ran); since 7.2.0 it leaves the stage open and `/pharn-loop` stops
> at S9b instead of closing the stage as a refusal.

`docs/limitations.md:153` mirrors the same sentence and would follow it.

## Verdict

GREEN — 0 floor-gate findings; 4 advisory findings (all minor).

## Lesson candidate (proposed, not written — the human decides via the orchestrator)

Candidate (target `.dev/memory-bank/lessons-learned.md`, type `process`, concepts `[lesson-recurrence, temporal-state,
referent-binding, run-state]`): **A bounded wait anchored on wall-clock time must decide what happens when the bound
is reached by elapsed time the waiter did not spend — closing the stage at the bound turns a session gap into a
permanent, misattributed refusal.** Source: issue #410 (the run's `LOOP.md`), this feature's `PLAN.md` "Trigger" and
the cap test in `stage-agent.test.mjs`. Why it might recur: every PHARN wait that is anchored on a marker's `ts`
(`finish`'s cap, the run markers' 24-hour window the issue also names, `entry-gates.mjs --wait`) measures wall-clock
time across a session that may not exist, and each chose its at-bound action without asking whether the bound was
spent by the waited-for work. Bar check (L20): one observed instance of the cap; the 24-hour run-marker lapse in the
same run is a second instance of the same shape, not yet fixed — so this sits at the edge of the bar.
