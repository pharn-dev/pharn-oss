# PLAN — stage-wait-capped

- spec_content_hash: d5a974303fd0b9568945c60423ae5a89c57d7b65f5baa03657e317fbe64f33a5
- applied_lessons: [L27, L29, L72, L75]
- increment: Fix [#410](https://github.com/pharn-dev/pharn-oss/issues/410) by its smallest option — when
  `stage-agent.mjs finish --budget-ms` reaches the wait's cap with no result, it exits with a new closed outcome
  (exit `6`, `capped …`) and leaves the stage open (no return marker), and `/pharn-loop` stops on it at a new stuck
  point S9b (`blocked: stage-outlived-wait`) whose remedy is to stop the stage agent, set its partial work aside and
  re-run the loop — never to resume that agent.
- layer(s): product floor (`pharn/floor/`), one product contract (`pharn/pharn-contracts/cost-ledger.md`), product
  commands (`.claude/commands/pharn-loop.md`, `pharn-loop-close.md`), apparatus (hygiene test, guide), CHANGELOG.
- constitution_refs: [P0, P2, P5, P6, P7]
- approval: APPROVED at GATE 1 on 2026-11-02 by the human maintainer, relayed by the orchestrator session (this
  stage could not ask directly): the plan as written, with its three defaults — exit `6` for the capped outcome, the
  stop row `S9b` / `blocked: stage-outlived-wait`, and the judgment trigger for a session that ended while a stage
  agent ran.

## Trigger (P7) — the real failure

Issue #410 (a real `/pharn-loop` run in pharn-dev/skills, PHARN 7.1.4): the session ended while the routed build
agent ran; the next day the orchestrator resumed that agent and ran the build's finish line. More than
`FINISH_WAIT_CAP_MS` (3,600,000 ms) had passed since the build's stage-start marker, so `finish` printed
`unusable no-result — …` with stderr `read: wait-capped`, exited `2`, AND wrote the `orchestrator` return marker. The
loop stopped S9 `blocked: stage-refused` with 14 half-edited files, and the stage could never be finished afterwards
(every later `finish` sees the return marker as the run's latest marker → `wait-unanchored`).

## Live state measured this run (P6)

- Branch tip `607d82c2` (on `4faed62e`); SKILLS_VERSION already `7.2.0` on this branch, with a `## [7.2.0]` section
  whose `### Fixed` holds the #407 and #411 entries. This increment adds one bullet at the end of that group and does
  not bump.
- `pharn/floor/stage-agent-core.mjs` `waitDecision` (lines ~767–774): the cap is tested before the budget, from
  `anchorMs` (this stage's own open stage-start `ts`), so the first `finish` after a gap longer than the cap is
  `capped` at once. `pharn/floor/stage-agent.mjs` `waitForResult` checks presence BEFORE each decision (so a present
  result always wins), and `finishStage` (lines ~690–709) maps `capped` → `waitDefect = "wait-capped"`, consumes
  (finding nothing), then writes the return marker via `tryMarkPhase` because the verdict is not a `question`.
- `/pharn-loop` (`pharn-loop.md`, `## Running a stage` item 3 and the mapping list) sends finish exit `2`, "`no-result`
  included — after the wait's cap too", to **S9**. The S9 row's remedy (`blocked: stage-refused`) names refusals, not
  an agent still running past the cap — the remedy the run needed (stop the agent, set its work aside, re-run) was
  printed nowhere ([[L27]]'s shape: a shared row whose remedy does not fit this branch).
- `/pharn-ship` (`pharn-ship-stages.md`, five finish lines) pins **no** `--budget-ms`, so `finish` never waits and can
  never be capped there — unaffected. No other command invokes `stage-agent.mjs` (`STAGE_AGENT_WIRING` (1)'s closure).
- `check-loop*.mjs`, `check-loop-record.mjs`, `check-loop-decision.mjs`, `loop-closeout.mjs`, `render-run-report.mjs`
  and `check-cost-ledger.mjs` never read `finish`'s output; the `blocked:` id is a free frontmatter token (no enum in
  `loop-record.md` or any checker), so a new row needs no checker change.
- Cost ledger: `stage-executions-core.mjs` ends a stage-start only at a following `orchestrator` marker; a stage-start
  followed by the stop's `run-stop` is an unmeasured row with reason `no-return-marker`. `cost-ledger.md:533` says "An
  agent still running when the wait reaches its cap bills its later rows outside it" — true today only because the cap
  writes the return marker; it becomes false and is edited.
- Byte budgets: `pharn-loop.md` 70,455 B of a 74,752 ceiling (4,297 headroom); `pharn-loop-close.md` 35,439 of 38,912.
  The stuck-point table is prettier-padded, so the new row's cells are kept inside the existing column widths (no
  re-pad of the whole table).
- `STUCK_POINTS` (`.dev/floor/command-hygiene.test.mjs` ~1756) has 18 entries and a count pin of 18.

## Design

### Floor — `finish` keeps a capped stage open

1. `pharn/floor/stage-agent-core.mjs`: two new exports next to `WAIT_EXIT` / `WAITING_LINE`:
   - `CAPPED_EXIT = 6` — `finish`'s exit when the wait reached its cap with no result. Not a `READ_EXIT` member (no
     result status maps to it), not `WAIT_EXIT`, not `1` (node's crash code), and not one of `stage-exit.md`'s
     numbers, so no caller can read it as a stage-exit meaning.
   - `CAPPED_LINE` — the closed first line, fixed text carrying nothing from a result or a marker:
     `capped — no result within the wait's cap from the stage's start; the stage stays open`.
   - Header THE WAIT: the `capped` row now says exit `CAPPED_EXIT`, `CAPPED_LINE`, stderr `wait-capped`, no return
     marker (the stage stays open, so a result that arrives later is consumed by a later `finish`, whose presence
     check runs before its decision). The `stage-agent-background` residual gains one OBSERVED line for #410 (the
     cap fired in a real run after the session ended) and keeps "at the cap the agent may still be running".
2. `pharn/floor/stage-agent.mjs`:
   - `finishStage`: on `capped`, still run the one last consume (a result that landed between the presence check and
     the decision is consumed and its verdict + return marker printed exactly as before). When that consume finds no
     result (`no-state-dir` / `no-result-file`), return `{exit: CAPPED_EXIT, out: [CAPPED_LINE, MARKER_CAPPED], err:
["read: wait-capped"]}` and write **no** marker. `wait-unanchored` is unchanged (exit 2, return marker written).
   - New export `MARKER_CAPPED = "marker: withheld (capped)"` (second stdout line).
   - Header: the exit-code block (`finish` gains `6` with `--budget-ms`), START / FINISH and THE WAIT sections; the
     cap's bullet names what the cap does now and that the stage stays open. `READ_FILE_DEFECTS` keeps `wait-capped`.
   - `finish` without `--budget-ms` (all of `/pharn-ship`) cannot reach the new path: unchanged.

### `/pharn-loop` — stop at S9b, with the remedy that fits

1. `.claude/commands/pharn-loop.md`:
   - Step 2 table: new row **S9b** — trigger: a routed stage's finish line exits `6` (`capped …`: no result within
     the wait's cap from the stage's start), or, when work resumes, the session ended while a stage agent ran (your
     own judgment — ADVISORY, failing safe); rule: stop `blocked: stage-outlived-wait` — stop that agent with
     TaskStop, set its partial work aside and re-run the loop; never resume the agent. Cells sized to the table's
     current column widths. The intro sentence listing judgment-triggered rows gains S9b's second trigger.
   - `## Running a stage` item 3: exit `6` → stop the stage agent with TaskStop (as item 3 already does on exit 2),
     then **S9b**, no inline return line (the return marker stays unwritten, so the cost ledger does not record the
     stage as returned). One sentence: if the session ended while a stage agent ran, when work resumes do not resume
     that agent (no SendMessage to it) — stop it and stop the run at S9b; a re-run starts clean.
   - The mapping list: "Exit `2` (`unusable …`, `no-result` included — after the wait's cap too)" loses "after the
     wait's cap too"; a new item maps exit `6` (`capped …`, `marker: withheld (capped)`) to **S9b** at every routed
     stage.
   - Step 4's test stage ("Whatever `finish` printed … the row is not read from it"): exit `6` is the one exception —
     it is no agent report and the agent may still be writing, so it is S9b, never the checkers' row.
2. `.claude/commands/pharn-loop-close.md` Step 7: "A stage agent that may still be running (a backgrounded call, S9)"
   → "(a backgrounded call, S9 or S9b)".

### Contract, guide, apparatus

1. `pharn/pharn-contracts/cost-ledger.md` (the sentence at ~533): at the cap `finish` writes no marker either (exit
   `6`) and `/pharn-loop` stops at S9b, so an agent still running bills its later rows to the stage until the run's
   `run-stop`, and none after it; the stage's `executions` row is unmeasured (`no-return-marker`).
2. `.dev/guides/floor-orchestration.md` `stage-agent.mjs` section: the cap's line (exit 6, `marker: withheld
(capped)`, no return marker, S9b) and the finish exit list.
3. `.dev/floor/command-hygiene.test.mjs`: `STUCK_POINTS` gains `{ id: "S9b", blocked: "stage-outlived-wait" }` and the
   count pin becomes 19; `STAGE_AGENT_WIRING` (5)'s loop branch pins the exit-6 → S9b mapping, the TaskStop-before-S9b
   rule, the never-resume sentence, and the absence of "after the wait's cap too". `COMMAND_BYTE_CEILINGS` (and
   `.dev/floor/stage-load-budget.test.mjs`'s `STAGE_LOAD_CEILINGS`) are raised only if measured over, by the rule
   (measured + 10%, next multiple of 512), in a visible diff.
4. `CHANGELOG.md`: one bullet at the end of `## [7.2.0]` `### Fixed`, no date prefix.

### Not covered (stated)

- **Re-anchoring on resume** (#410 options 2 and 3: a `stage-resume` marker that `waitAnchorMs` uses, giving a resumed
  stage a fresh window). Not built: resuming a stage agent that already wrote half its files is the risky path this
  increment steers runs away from, and no run has needed a resumed stage to finish (P7).
- **The 24-hour run-marker ceiling** the issue mentions (the Stop guard and the write guard's fail-closed default
  lapsing across a day-long gap): context only; S9b's remedy (re-run) opens a fresh run and a fresh marker.
- `wait-unanchored` keeps exit 2 and still writes a return marker.
- That TaskStop reaches an agent from an ended session stays unmeasured (the existing residual).

## Applied lessons

- L27 — the S9 row is a shared remedy that did not fit the capped branch (its remedy names refusals; the run needed
  "stop the agent, set its work aside, re-run"), so the capped branch gets its own row and remedy, and the hygiene pin
  asserts the remedy present on S9b's branch AND the old "after the wait's cap too" S9 wording absent.
- L29 — the deliverable is the enumeration of `finish`'s consumers: the closure `STAGE_AGENT_WIRING` (1) already
  iterates (two commands), each finish line in `pharn-loop.md` (spec, plan, test, build — the general mapping covers all
  four, and the test stage's own exception is edited), and `/pharn-ship`'s five lines (no budget, unreachable). The
  `STUCK_POINTS` rules iterate the set, so S9b joins every per-row rule by being added to it.
- L72 — adding an exit to `finish` is an API change: every reader of its exits was grepped (`git grep 'stage-agent.mjs
finish'`, `wait-capped`, `wait's cap`) and each hit is listed in the sweep below with a disposition; an unaware
  caller reads `6` as a crash, which every caller maps to a stop, the safe direction.
- L75 — the sweep records every hit with a disposition (next section), so grill and review can re-run it.

## Sweep (L75) — phrases `wait-capped`, `wait's cap`, `reaches its cap`, `stage-agent.mjs finish`

Run: `git grep -n -E "wait-capped|wait's cap|FINISH_WAIT_CAP|reaches its cap|past the cap|at the cap"` and `git grep -n
'stage-agent.mjs finish'`, excluding `.dev/features/`, `.dev/measurements/` and `CHANGELOG.md` (dated records).

- `.claude/commands/pharn-loop.md:556` ("after the wait's cap too") — edited (Design, "`/pharn-loop` — stop at S9b").
- `.claude/commands/pharn-loop.md:84,87,91,95` (grants) and `:626,652,721,780` (finish lines) — still true (lines
  unchanged; exit 6 handled by the general mapping; `:721` test stage gets the exception sentence).
- `.claude/commands/pharn-loop.md:448` (backgrounded finish call) — still true.
- `.claude/commands/pharn-ship-stages.md:217,266,307,341,460` — still true (no `--budget-ms`, never capped).
- `.dev/guides/floor-orchestration.md:487,489` — edited.
- `docs/limitations.md:153`, `pharn/LIMITS.md:614` ("Not measured: … the wait's cap") — still true as a statement
  about measurement (no run measured the wait's behaviour at its cap with this change); LIMITS is human-only, no edit
  proposed.
- `docs/pipeline.md:78` ("waited out (up to the wait's cap) instead of stopping the run") — still true.
- `pharn/floor/stage-agent-core.mjs:123,124,174,192,764` — `:124` edited; `:174` still true; `:192` edited (the cap now
  observed once, #410); `:123`, `:764` still true.
- `pharn/floor/stage-agent.mjs:83,86,216,217,243,679,695,696` — `:83` and `:695–696` edited; the rest still true.
- `pharn/floor/stage-agent.test.mjs:992–993` still true; `:1063–1071` edited (the cap case); `:1083` still true.
- `pharn/floor/stage-agent-core.test.mjs:706–732` — still true (`waitDecision` is unchanged).
- `pharn/pharn-contracts/cost-ledger.md:533` — edited.
- `.claude/commands/pharn-dev-ship.md:496`, `check-loop*.mjs`, `check-capability-catalog.mjs` and the other
  "cap" hits — a different cap (the loop's `--max-iter`), not this one.

## Files

- `pharn/floor/stage-agent-core.mjs` — `CAPPED_EXIT`, `CAPPED_LINE`, THE WAIT header row, residual line — product floor
- `pharn/floor/stage-agent.mjs` — `finishStage`'s capped path, `MARKER_CAPPED`, header exits/WAIT — product floor
- `pharn/floor/stage-agent-core.test.mjs` — parity test for `CAPPED_EXIT` / `CAPPED_LINE` — test (apparatus)
- `pharn/floor/stage-agent.test.mjs` — the cap cases: exit 6, no marker, stays open, a later result consumed — test
- `pharn/pharn-contracts/cost-ledger.md` — the at-the-cap billing sentence — product contract
- `.claude/commands/pharn-loop.md` — S9b row, item 3, mapping, test-stage exception — product command
- `.claude/commands/pharn-loop-close.md` — Step 7's still-running line names S9b — product command
- `.dev/floor/command-hygiene.test.mjs` — `STUCK_POINTS` S9b (19), wiring (5) pins, ceilings only if outgrown — apparatus
- `.dev/floor/stage-load-budget.test.mjs` — `STAGE_LOAD_CEILINGS` only if `pharn-loop` outgrows its row — apparatus
- `.dev/guides/floor-orchestration.md` — `stage-agent.mjs` section — apparatus
- `CHANGELOG.md` — one bullet at the end of `## [7.2.0]` `### Fixed` — repo meta

## Contracts satisfied

- `pharn/pharn-contracts/cost-ledger.md` — the stage bracket and `executions` rules are unchanged; only the sentence
  describing what the cap does to billing is corrected to the new behaviour (cite, do not restate: the unmeasured
  reason comes from `stage-executions-core.mjs`).
- `pharn/pharn-contracts/stage-exit.md` — untouched; `finish`'s `6` is deliberately outside its table, as `read`'s
  numbers are the only ones reused (the header says so).
- `pharn/pharn-contracts/loop-record.md` — untouched; a blocked stop's `blocked:` id is a free token.

## Evals to write (P1)

No capability (no `role:` file) is added or changed, so no `evals/` case. Tests instead:

- `stage-agent-core.test.mjs`: `CAPPED_EXIT` is 6, not in `READ_EXIT`, not `WAIT_EXIT`, not 1, not a `stage-exit`
  `EXIT_CODE` value; `CAPPED_LINE` is fixed text with no control character.
- `stage-agent.test.mjs` (spawned CLI, scratch dirs, a stage-start marker `FINISH_WAIT_CAP_MS + 60 s` old):
  - capped, no result → exit 6, stdout exactly `[CAPPED_LINE, MARKER_CAPPED]`, stderr exactly
    `stage-agent: read: wait-capped\n`, markers file unchanged (still one stage-start);
  - a second capped call → exit 6 again (never `wait-unanchored`: the stage is still open);
  - the issue's repro: after a capped call, the agent reports, and the next `finish` consumes it (`done`, exit 0, return
    marker written) — the stage can still be finished;
  - unchanged: a result already present past the cap is consumed (`done`, exit 0); `wait-unanchored` still exit 2 with
    a return marker; `finish` without `--budget-ms` on a stage past the cap → exit 2 `no-result`, marker written (the
    ship path), and stdout carries no `capped` line.
- `command-hygiene.test.mjs`: the S9b row and `blocked: stage-outlived-wait` spelling (per-row rules iterate
  `STUCK_POINTS`); wiring (5) pins for exit 6 → S9b, TaskStop before S9b, never resume, and no "after the wait's cap
  too".

## Guarantee audit (P0)

- "`finish` exits 6 with `CAPPED_LINE` and writes no return marker when the wait reaches its cap with no result" →
  floor: enum (closed exit code and closed line, the cap decision `waitDecision` tested), over an anchor that is
  unauthenticated `pharn/.run/` state (the existing TRUST BOUND).
- "A result reported after a capped call is consumed by a later `finish`" → floor (tested behaviour of the presence
  check before the decision); ADVISORY that anyone runs that later `finish` — `/pharn-loop` stops at S9b instead.
- "`/pharn-loop` stops at S9b on exit 6" → ADVISORY orchestration; the TEXT of the mapping is floor-pinned by regex
  (hygiene), never the run's behaviour.
- "When work resumes after the session ended, the orchestrator stops the agent and the run" → ADVISORY (the model's
  judgment that the session ended; fails safe — a stop).
- "TaskStop stops the agent" → ADVISORY and unmeasured (existing residual).
- "`/pharn-ship` is unaffected" → floor by construction: its finish lines carry no `--budget-ms` (pinned by
  `STAGE_AGENT_WIRING`), and without one `finishStage` never calls `waitForResult`.
- Struck: "a capped stage can be resumed safely", "S9b guarantees the half-written files are set aside" — neither is
  claimed.

## Trust audit (P2)

No new untrusted input. `finish` still prints only closed lines; the result file (another model's output) reaches
control flow only through `consumeResult`'s closed verdict, and `CAPPED_LINE` carries no byte of it. The resumed
agent's completion notice remains DATA (`pharn/THREAT-MODEL.md §5`, unchanged).

## Determinism audit (P5)

`/pharn-loop` branches on `finish`'s exit code (`6` → S9b) — a membership test. S9b's second trigger (the session
ended while an agent ran) is judgment, listed with S6/S7's judgment rows, and fails safe (a stop, never a resume).

## Decisions taken (override at GATE 1)

- Exit code `6` rather than exit `2` with a new `unusable` reason: a capped stage has no result to call unusable and
  stays open; a caller unaware of `6` reads it as a crash, which every caller maps to a stop.
- Row id `S9b`, `blocked: stage-outlived-wait` (the agent outlived the wait — whether because the session ended or it
  ran past the cap). The alternative the orchestrator named, `stage-outlived-session`, describes only the observed
  cause.
- S9b also covers "you find, on resuming, that the session ended while a stage agent ran" (judgment), so a resumed
  run stops without first waiting up to an hour for a dead agent.

## Re-anchor note (after build, before verify)

The branch base `607d82c2` carried 12 test failures from #407's commit (scratch-tree fixtures missing
`capability-files-core.mjs`; `REGRESSION.md` lists them). The orchestrator fixed them in `0b18864b` on
`fix/issues-407-411` and asked this worktree to fast-forward to it, with this increment's changes kept uncommitted.

- Before the fast-forward, `node pharn/floor/check-bash-reconcile.mjs --base . --require-baseline` exited 0:
  `"verdict": "CLEAN"`, 10 reconciled, no escapes (exempted: this feature's `REGRESSION.md` and
  `regression-report.json`).
- `git merge --ff-only 0b18864b` fast-forwarded `607d82c2..0b18864b` with no overlap.
- After it, the same check exited 1 (`ESCAPE`) with exactly four escapes, each `writes-scope (snapshot)`:
  `.dev/features/issues-407-411-small/PLAN.md`, `pharn/floor/lens-groups.test.mjs`,
  `pharn/floor/render-review-assignments.test.mjs`, `pharn/floor/validate.test.mjs` — exactly the list
  `git diff --name-only 607d82c2 0b18864b` prints.
- Reason for the re-anchor: the orchestrator chose a re-anchor; §2a merged covers only upstream commits (`0b18864b`
  is local, so its bytes are not classed `merged`). Build Step 0 was re-run (the `--from-plan` setter, then
  `reconcile-baseline.mjs --anchor --by pharn-dev-build`, in that order); the baseline was never hand-edited or
  deleted. Regress and verify were then re-run from the new base.

## Open questions (HALT)

- none
