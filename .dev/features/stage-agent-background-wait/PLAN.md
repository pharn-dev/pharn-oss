# PLAN — stage-agent-background-wait: `/pharn-loop` waits on disk for a stage agent launched in the background

- spec_content_hash: 2c84959cbca0b2dc51aaad90f90d40e574732c9c5c83c0bda7e1481ecb0db12e
- applied_lessons: [L24, L27, L36, L41, L54, L59, L66, L75]
- increment: `stage-agent.mjs finish` gains `--budget-ms <B>`: with it, `finish` waits inside node, bounded per call
  and capped by the floor from the stage's own stage-start marker, for the stage agent's `stage-result.json` before
  consuming it exactly as today, and exits `5` (`waiting`) when the call's budget runs out first; `/pharn-loop` pins
  `--budget-ms 570000` on its four finish lines, runs `finish` after every Agent call whatever the call returned, and
  omits `run_in_background` from its Agent call; `/pharn-ship` is unchanged.
- layer(s): product floor (`pharn/floor/stage-agent-core.mjs`, `stage-agent.mjs`), product command
  (`.claude/commands/pharn-loop.md`), product contract (`pharn/pharn-contracts/cost-ledger.md`, one sentence);
  apparatus (hygiene test, floor guide)
- constitution_refs: [P0, P2, P3, P5, P6, P7]
- version: SKILLS_VERSION 6.73.2 → 6.74.0 (minor: a new `finish` behaviour and exit code ship)

## The failure (P7 — observed 2026-10-25, read this run as DATA)

PHARN 6.73.2 (#391), Claude Code 2.1.310, interactive `claude --permission-mode auto`, sonnet medium.
`~/Projects/pharn-measure/run1-void-6.73.2-cli/transcripts/3b533399-7033-4191-8976-4a253579647b.jsonl`:

- the orchestrator's Agent `tool_use` at `2026-10-25T05:49:24.163Z` carried `"run_in_background":"false"` — a JSON
  **string**, though `.claude/commands/pharn-loop.md:484-485` names the JSON boolean and forbids the string;
- its `tool_result` (05:49:24.732Z) begins "Async agent launched successfully."; `toolUseResult` is
  `{"isAsync":true,"status":"async_launched",…}`;
- the loop then stopped S9 (`stage-refused`) by `## Running a stage` item 3. `NOTE.txt` beside it: the tool schema had
  the parameter, so #391's `--no-foreground-agent` did not apply, and the background spec agent was still running
  (~97k tokens) when the tab was closed.

The same string form happened in both 6.72.0 attempts (`.dev/measurements/loop-6.72-prep.md` §8, "Run 1, two
attempts"); a headless `claude -p` probe that sent the boolean got a foreground result (same section). Three
interactive attempts, three S9 stops at the first routed stage — so on these Claude Code versions an interactive
`/pharn-loop` with a routed stage cannot get past it.

## Discovery (read this run; branch cut from `origin/main` = `471a54bb`, SKILLS_VERSION 6.73.2)

1. **The loop's routed sequence** (`pharn-loop.md` `## Running a stage`, lines 448-528): item 1 start line; item 2 the
   Agent call, pinned with `` `run_in_background: false` (the JSON boolean `false`, never the string `"false"`) ``;
   item 3 "The finish line — only after an Agent call has returned the agent's COMPLETED result", and "a call that
   returns a background-launch notice instead is **S9**" (the `Stop` guard forbids ending the turn to wait). The four
   pinned finish lines: spec (`:580`), plan (`:606`), test (`:670`), build (`:729`); the quick part
   (`pharn-loop-quick.md:52,91`) reuses them "as written".
2. **`finish` today** (`pharn/floor/stage-agent.mjs` `finishStage`, `:599`): `consumeResult` once — a missing result is
   `unusable no-result` (exit 2) at once — then the `orchestrator` marker (deferred after a `question`). Flags = `read`'s
   (`FLAGS.finish`, `:205`). Exits 0 done · 2 unusable · 3 refused · 4 question (`READ_EXIT`, core `:343`).
3. **The containment walk** (`walkStateDirs`, `resultKind`, `:340-365`): per-component `lstat`, a symlink or
   non-directory refused, only an lstat ENOENT is absence (L54/L59).
4. **The result's freshness:** `start` (`decideStart`, `:558-561`) removes a leftover result before every Agent spawn
   (exit 0 only), and `validateResult` binds command/name/stage/iteration. So the only result a wait after `start` can
   find for this stage was written after this stage's start (L66 — see Applied lessons for what stays unbound).
5. **The anchor the cap needs exists:** `start` writes this stage's `stage-start` marker (`ts` ISO,
   `.pharn/cost/<name>/markers.jsonl`), and `stageIsOpen` (`:566`) already reads "is the run's latest marker this
   stage's own stage-start" through `latestMarker` (`mark-phase.mjs:336`), under the TRUST BOUND `mark-phase.mjs:107`
   states. No stage agent writes markers: its brief forbids `start`/`finish`/`stage-direct.mjs`, and only those and
   `mark-phase.mjs` call `tryMarkPhase`/`markPhase` (grep this run).
6. **The precedent for a bounded wait with "run me again":** `entry-gates.mjs --wait --budget-ms 570000` (blocks
   inside node, `POLL_MS` 250 via `Atomics.wait`, exit `5` = still running → "run the same line again",
   `pharn-loop.md:639-648`), and `stage-direct.mjs`'s `--budget-ms 570000` with "the Bash tool's timeout at 600000"
   (`pharn-loop.md:737-746`). Exit `5` is `continue` in `pharn/pharn-contracts/stage-exit.md` ("re-run").
7. **Ship's use of `finish`** (`pharn-ship-stages.md:52-70`, lines `:215,264,305,339,458`): it keeps
   `run_in_background: false`, waits for a background agent's completion notice (it may end its turn), then runs
   `finish`; a `question` (exit 4) is round-tripped and `finish` run again. Ship has no observed failure here.
8. **Grants:** `pharn-loop.md` `allowed-tools` holds the four finish grants exactly
   (`:80,83,87,91`, ending `--stage pharn-<s>)` / `--iteration *)`); `.dev/floor/command-hygiene.test.mjs`
   `loop-no-prompts` requires the Bash grants to equal the set the pinned lines derive.
9. **Command-text pins to update** (`.dev/floor/command-hygiene.test.mjs`): `STAGE_AGENT_WIRING` (`:4235-4258`) —
   the loop's `waitRule` `/a call that\s+returns a background-launch\s+notice instead is \*\*S9\*\*/`; test (5)
   (`:4501-4535`) asserts `` `run_in_background: false` `` and its JSON-boolean sentence for BOTH files. The
   finish-line wiring/order tests (2)/(4) read `SA_READ = /^node pharn\/floor\/stage-agent\.mjs finish (.*)$/` and
   `saFlags`, so an added `--budget-ms 570000` must be accepted there (checked at build).
10. **Byte ceilings:** `pharn-loop.md` is 61,644 B against `COMMAND_BYTE_CEILINGS` 65,024 (3,380 B headroom); its
    `STAGE_LOAD_CEILINGS` row is read at build. A raise, if needed, is a visible diff by the table's rule.
11. **Trusted docs:** no sentence in `LIMITS.md`, `THREAT-MODEL.md`, `pharn/ARCHITECTURE.md` or `pharn/CONSTITUTION.md`
    names the background residual. `THREAT-MODEL.md:189-194` (channel 4: "Only the exit code of
    `pharn/floor/stage-agent.mjs finish` and its closed first line are floor") stays true. **No human edit needed.**
12. **Measurement file name:** the brief cited `.dev/measurements/loop-wall-clock-2026-10-25.md`; the file on disk is
    `.dev/measurements/loop-wall-clock-2026-10-05.md` (the only `loop-wall-clock-*`). This plan cites the one on disk.

## Design

### 1. Where the wait lives — folded into `finish`, behind `--budget-ms` (DEVIATION from the human's `wait` picture)

The human pictured a new `stage-agent.mjs wait` subcommand that never consumes. This plan puts the same wait **inside
`finish`, enabled only by `--budget-ms`**, and asks the human to accept the deviation (Open question Q1). Reasons:

- **No model judgment (P5).** The loop runs `finish` after **every** Agent call, whatever it returned; the floor decides
  by file presence. A separate `wait` run only after a background-launch notice would branch on the model's reading
  of a tool result. An unconditional `wait` line avoids that but costs one orchestrator request per routed stage
  (≥ 4 per one-iteration run, +1 per extra iteration) — exactly the per-stage line 6.43.0 (orchestrator-direct-stage-
  calls) removed — plus four new pinned lines, four new grants, and a change to the start < brief < finish order pin.
  Folded in, the foreground path costs **zero** extra requests: the result is already there and `finish` consumes it
  on its first poll.
- **One owner of "consume".** `wait` would have to re-implement `finish`'s containment walk to report presence and
  stay in step with it; folded in, the presence check and the read share `walkStateDirs`/`resultKind`.
- **`/pharn-ship` behaves exactly as today:** its five finish lines carry no `--budget-ms`, and without the flag
  `finish` is byte-for-byte today's path (one `consumeResult`, no wait). A hygiene pin asserts ship's finish lines
  carry no `--budget-ms` (L27 — present where it applies, absent where it does not).
- **What the human asked to keep, kept:** the wait never validates or consumes anything — it only polls presence;
  consumption is the unchanged `consumeResult` (validation, removal, `READ_DEFECTS`); the cap and a crash are still S9
  with "the stage agent may still be running" in the summary; containment is THE RESULT FILE's.

**The trade, named (decision for the human — Q2).** Unconditional means a **foreground** agent that returned without
reporting (it never ran its `report` line) now costs a wait until the cap before S9, where today it is S9 at once. That
waste is bounded: the cap is measured from the stage's start, so a stage that already ran long waits less, and it lands
only on a run that stops S9 either way. The alternative that avoids it is a model-passed `--background` flag (the
orchestrator's reading of "Async agent launched", ADVISORY, the `--no-foreground-agent` precedent) — failing safe in
both directions (omitted on a background launch → today's S9; passed on a foreground return → the bounded wait). This
plan recommends the unconditional form: the observed failure is the background launch, and P5 prefers the membership
test the floor can make.

### 2. The wait, exactly (`finishStage` with `budgetMs`)

`finish --command <c> --name '<n>' --stage <s> [--iteration <N>] --budget-ms <B>`, `B` an integer `1..570000`
(grammar `^[1-9][0-9]{0,5}$` after the clean-scalar guard (L14), then `<= FINISH_BUDGET_MAX_MS = 570_000`; anything
else is a usage refusal: `unusable usage`, exit 2). Without `--budget-ms`: today's path, unchanged.

Each poll (every `POLL_MS = 250`, `Atomics.wait`, inside node — never a model poll):

1. `walkStateDirs` (lstat per component). **Refused** (a symlink, a non-directory, an lstat error other than ENOENT) →
   stop waiting and consume at once → `unusable unreadable` (`state-dir-refused`), today's code. A component that is
   **absent** (ENOENT) is "no result yet": `report` creates the components, `start` never does.
2. All components real directories → `resultKind` (lstat) of the result path. **Anything but absent** (a file, a
   symlink, another kind) → stop waiting and consume at once; `consumeResult` judges it exactly as today
   (`not-a-regular-file` for a link — never followed).
3. **Absent** → the pure decision `waitDecision` (core, below): keep polling, `waiting` (exit 5), or `capped`.

`waitDecision({anchorMs, nowMs, callStartMs, budgetMs, capMs})` — PURE, in `stage-agent-core.mjs`, tested alone:

- **No anchor** — the run's latest marker is not this stage's own `stage-start` (same stage, same iteration), or its
  `ts` does not parse (`tsMs`), or it lies in the future (`anchorMs > nowMs`) → `unanchored`: no wait; consume at once
  (today's `no-result`, exit 2), stderr `read: wait-unanchored`. The safe direction: a missing or forged anchor can
  only shorten the wait to today's.
- `nowMs - anchorMs >= capMs` → `capped`: consume once more (a result that landed this instant still counts), else
  `unusable no-result`, exit 2, stderr `read: wait-capped`. The return marker is written (the stage is over), as for
  today's no-result.
- `nowMs - callStartMs + POLL_MS > budgetMs` → `waiting`: exit **5**, stdout line 1 the closed `WAITING_LINE`, line 2
  `marker: deferred (waiting)` (`MARKER_WAITING`) — no return marker, because the stage is still open, so the next
  call's anchor is unchanged.
- otherwise `poll` (sleep `POLL_MS`, re-check).

The anchor is read once per call (`latestMarker`), the presence on every poll. The two new defect codes join
`READ_FILE_DEFECTS` (`wait-unanchored`, `wait-capped`), fixed text, so stderr still never carries a byte the result or
the marker holds (GATE-2 review A7).

### 3. Exit codes (`finish`)

| exit | line 1                                                | line 2                        | when                                                       |
| ---- | ----------------------------------------------------- | ----------------------------- | ---------------------------------------------------------- |
| 0    | `done` / `done gate:pass\|fail`                       | marker line                   | as today                                                   |
| 3    | `refused [S<n>]`                                      | marker line                   | as today                                                   |
| 4    | `question`                                            | `marker: deferred (question)` | as today (ship only; the loop's briefs never ask)          |
| 2    | `unusable <reason>`                                   | marker line (none on usage)   | as today, plus `wait-unanchored` / `wait-capped` on stderr |
| 5    | `waiting — no result yet; run this finish line again` | `marker: deferred (waiting)`  | **new**, only with `--budget-ms`                           |

`5` reuses `stage-exit.md`'s `continue` number and meaning (re-run the line); no contract change: `READ_EXIT` stays the
result-status map, and `WAIT_EXIT = 5` is its own constant. Anything else (1 included) is still a crash.

### 4. Bounds and the cap — from measurements (L24)

- **Per call: `--budget-ms 570000`, run with the Bash tool's timeout at 600000** — the pinned precedent
  (`stage-direct.mjs`, `entry-gates.mjs --wait`, discovery 6), 30 s under the tool's 600 000 ms maximum for node's
  startup and the final consume. A call the orchestrator runs without the timeout reaches the tool's 120 s default and
  is moved to the background, where it keeps running (`stage-exit.md`, "A Bash-tool timeout is not a kill"); the
  loop's existing "moved to the background is STILL RUNNING" paragraph (`pharn-loop.md:413-416`) is extended to name
  the finish line (wait for it; never start a second `finish` while it runs).
- **Cap: `FINISH_WAIT_CAP_MS = 3_600_000` (60 min) from this stage's own stage-start marker.** Measured
  (`.dev/measurements/loop-wall-clock-2026-10-05.md` §2 "By stage", [R·m]): the routed stages ran spec 211.1 s, plan
  658.3 s, grill 361.0 s, test 538.3 s, **build 1,541.4 s** — the longest — and §3/§4 put the build agent at 126
  requests over 1,526.6 s. 3,600 s is ~2.3× the slowest routed stage measured. Worst case per stage: ⌈3600 / 570⌉ = 7
  finish calls, each one orchestrator request. A constant, not configurable (P7: no second value has been needed).
- **The test knob is `--budget-ms` itself** (tests pass e.g. `--budget-ms 300`): bounded above by 570 000, and the
  call never waits past `capMs - (now - anchor)`, so no caller can lengthen a stage's wait past the cap. The cap is
  tested by a fixture marker whose `ts` is older than the cap — no environment variable, no hidden knob.

### 5. `/pharn-loop` text (`## Running a stage` and the finish lines)

- **Item 2, the Agent call:** drop `run_in_background: false` and its JSON-boolean sentence; say "**no
  `run_in_background`** — leave the parameter out (the tool's default is the foreground; ADVISORY, and not measured in
  a real loop)", beside "no `isolation`". The prompt rules are unchanged.
- **Item 3, the finish line:** "after **every** Agent call, whatever it returned — the agent's completed result or a
  background-launch notice": run the stage's finish line with the Bash tool's timeout at 600000. `5` → run the same
  line again; any other exit maps as `finish`'s mapping below says. A background-launch notice is no longer S9 by
  itself. A completion notice that arrives later for that agent changes nothing (its text is DATA — `THREAT-MODEL.md
§5` channel 4). **Never run `finish` for a stage that ran inline** (kept).
- **The orphan (ADVISORY, minimal — Q3):** after a background launch, on `finish` exit 2 (`wait-capped`, any
  `unusable`, or a crash), stop that stage agent with TaskStop if your tool list holds it (load it if deferred), then
  S9; the summary says the agent may still be running when it could not be stopped. Needs `"TaskStop"` in
  `allowed-tools` (Q3 decides).
- **The `--no-foreground-agent` paragraph:** behaviour unchanged (the human's decision: not widened, not removed). Its
  closing clause "which item 3 cannot wait for" becomes false; reword to "for which this command's wait has not been
  measured" (Q4).
- **`finish`'s mapping list:** add `5` (`waiting`) → the same finish line again; exit 2 → S9 as today.
- **The four pinned finish lines** gain `--budget-ms 570000`; the four `allowed-tools` grants likewise (derived set).
  The quick part reuses them "as written" — no change there.

### 6. Text sweep (L75 — every hit, with its disposition; grill re-runs these greps over the product surface)

`git grep -n 'run_in_background\|stage-agent-background\|background-launch'` (excluding `.dev/features`, `CHANGELOG.md`),
plus `0/2/3/4` and `read's 0 / 2 / 3 / 4`:

- `.claude/commands/pharn-loop.md:479-481` (`--no-foreground-agent` paragraph) — **edited** (the one false clause, Q4).
- `.claude/commands/pharn-loop.md:484-485` (Agent call `run_in_background: false`) — **edited** (omitted).
- `.claude/commands/pharn-loop.md:493` (background-launch notice is S9) — **edited** (the wait).
- `.claude/commands/pharn-ship-stages.md:53,59-60` — **still true** (ship unchanged).
- `.dev/floor/command-hygiene.test.mjs:4245,4256,4504-4507,4519-4526,5780-5792` — **edited** (pins; see Evals).
- `.dev/guides/floor-orchestration.md:464,481-486` — **edited** (the finish exit list and the wait).
- `pharn/floor/stage-agent-core.mjs:64-66` (`no-foreground-agent` row) — **still true** (behaviour unchanged).
- `pharn/floor/stage-agent-core.mjs:131-143` (residual `stage-agent-background`) — **edited** (below).
- `pharn/floor/stage-agent-core.mjs:295` (`INLINE_REMEDIES["no-foreground-agent"]`) — **still true**.
- `pharn/floor/stage-agent-core.test.mjs:187,189`, `stage-agent.test.mjs:766` — **still true**.
- `pharn/floor/stage-agent.mjs:17,34,48-50,211` — **edited** (usage, exit codes, START/FINISH); `:211` still true.
- `pharn/floor/route-token-core.mjs:47,61` — **still true**.
- `.dev/memory-bank/lessons-learned.md:2252` (L66) — **still true** (canon; cited, not edited).
- `.dev/measurements/loop-6.72-prep.md:360-388` — **still true** (a dated record).
- `pharn/pharn-contracts/cost-ledger.md:526` "as long as the stages run in the foreground one at a time" — **edited**,
  one sentence: a background stage agent `finish` waits on is still inside its stage's bracket; an agent left running
  past `wait-capped` bills its later rows outside it.
- `.claude/commands/pharn-loop-close.md:88`, `pharn-ship-close.md:174`, `pharn-verify.md:149`,
  `pharn/floor/stage-direct.mjs:57,202`, `pharn/pharn-contracts/stage-exit.md:295` — Bash-call backgrounding, **still
  true**, not this residual.

### 7. The residual, rewritten (`stage-agent-core.mjs` RESIDUALS `stage-agent-background`)

Keep the 6.72.0 observation; add the 6.73.2 one (2.1.310 CLI, string `"false"` with the parameter present, so the flag
did not apply; the agent ran on after the stop, ~97k tokens); then 6.74.0: the loop omits the parameter (ADVISORY,
unmeasured), and its `finish --budget-ms` waits on disk — FLOOR: the presence test, the exit codes, the cap from the
stage-start marker; ADVISORY: that the orchestrator runs `finish` after every Agent call, re-runs it on `5`, passes the
Bash timeout, and stops an orphan. Still named, not closed: an agent that never reports costs up to the cap; a cap hit
can leave the agent writing (TaskStop advisory); a forged or rewritten marker moves the cap (unauthenticated `.pharn/`
state, the `mark-phase.mjs` TRUST BOUND) — an earlier or future `ts` only shortens the wait, while a marker rewritten
to a fresh `ts` before each call lengthens it without bound (a Bash writer, LIMITS.md §6 — non-adversarial accounting);
the wait reads on presence, not on the writer's exit (L66). `/pharn-ship` unchanged: it waits for the completion
notice.

## Applied lessons

- L24 — the per-call budget and the cap are derived from the pinned 570 s/600 s precedent and the measured stage
  durations (`loop-wall-clock-2026-10-05.md` §2–§4), cited with numbers, not inherited from `entry-gates`; the cap's
  test is a membership (exit `2` + `wait-capped` vs exit `5`), never a stopwatch threshold.
- L27 — the flag's effect is pinned per branch: the loop's finish lines carry `--budget-ms` AND ship's carry none; the
  `wait-capped` / `wait-unanchored` codes are printed only on their own branch (a test each, absent on the others).
- L36 — the hygiene pin is a closure: every `stage-agent.mjs finish` line in the loop family carries exactly
  `--budget-ms 570000`, and no line in ship's family carries `--budget-ms`; and no `run_in_background` value anywhere
  in the loop's `## Running a stage`.
- L41 — one CLI test runs `finish` with no `--budget-ms` against an absent result and asserts today's immediate
  `unusable no-result` (exit 2), so the no-flag default path stays exercised.
- L54 — every poll's presence test is the existing per-component `lstat` walk; only an lstat ENOENT reads absent;
  `existsSync` is never used.
- L59 — fixtures cover the path kinds for each component and the result: a regular file, a link to a file, a link to a
  directory, a dangling link — each must stop the wait at once (refused/consumed), never read as "not yet".
- L66 — the wait reads on presence (the human's decision); what binds it to THIS agent is `start`'s removal of a
  leftover before the spawn plus `validateResult`'s command/name/stage/iteration binding; what stays unbound (an agent
  acting after its `report`, another session on the same `<name>`) is named in the residual, not claimed closed.
- L75 — Design §6 lists every sweep hit with a disposition, for grill to re-run.

## Files

- `pharn/floor/stage-agent-core.mjs` — `WAIT_EXIT`, `WAITING_LINE`, `waitDecision` (pure), the residual text, the
  header's RESULT/FLOOR-ADVISORY lines for the wait — layer product floor
- `pharn/floor/stage-agent.mjs` — `finish --budget-ms`, the poll loop, `FINISH_BUDGET_MAX_MS`, `FINISH_WAIT_CAP_MS`,
  `POLL_MS`, `MARKER_WAITING`, the two `READ_FILE_DEFECTS` codes, usage/exit header and a WAIT section with its
  measured bounds — layer product floor
- `pharn/floor/stage-agent-core.test.mjs` — `waitDecision` table tests — apparatus (test)
- `pharn/floor/stage-agent.test.mjs` — CLI wait tests — apparatus (test)
- `.claude/commands/pharn-loop.md` — `## Running a stage` items 2–3, the mapping, the background-Bash paragraph, the
  four finish lines and grants (and `TaskStop` per Q3) — layer product command
- `pharn/pharn-contracts/cost-ledger.md` — one sentence on a waited background stage agent — layer pharn-contracts
- `.dev/floor/command-hygiene.test.mjs` — the updated and new pins — apparatus
- `.dev/guides/floor-orchestration.md` — the `stage-agent.mjs` entry — apparatus
- `SKILLS_VERSION` — 6.74.0 — repo-meta
- `CHANGELOG.md` — the 6.74.0 entry — repo-meta
- `docs/capabilities/**`, `README.md` (generated region only) — regenerated by `npm run docs:generate` if they render a
  changed byte — generated
- `.dev/features/stage-agent-background-wait/*` — this increment's stage artifacts — apparatus

Not in scope: `pharn-ship-stages.md` and every ship file (unchanged by decision), `pharn-loop-quick.md` (reuses the
finish lines "as written"; its text stays true), the brief (`renderBrief` — its last-action rule is what the wait relies
on, unchanged), `--no-foreground-agent`'s code and remedy.

## Contracts satisfied

- `pharn/pharn-contracts/stage-exit.md` — `finish`'s `5` reuses `continue`'s number and its "re-run the line" meaning;
  the envelope is not used (the header's G-P3 note), so no contract change.
- `pharn/pharn-contracts/cost-ledger.md` — attribution unchanged in method; one sentence states the waited background
  case and the orphan's bound.
- The stage-agent protocol is `stage-agent-core.mjs`'s header (no new contract, P7) — extended there.

## Evals to write (P1) — tests; no capability is added, so no `evals/` pair

`stage-agent-core.test.mjs`:

- `waitDecision`: no/forged/future/unparseable anchor → `unanchored`; elapsed ≥ cap → `capped`; budget spent →
  `waiting`; otherwise `poll`; the per-call wait never extends past the cap (a budget larger than the cap's remainder
  ends at the cap); boundary rows at exactly `cap` and exactly `budget - POLL_MS`.

`stage-agent.test.mjs` (spawned CLI, temp dirs):

- result already present → consumed at once with `--budget-ms` (elapsed well under one poll), verdict and marker as
  today; the same for each of `done`, `done gate:pass`, `refused S9`.
- result absent, anchor fresh, `--budget-ms 300` → exit `5`, `WAITING_LINE`, `marker: deferred (waiting)`, no
  return marker appended; the next call after `report` wrote the result → exit 0 and the marker.
- result written by a `report` child DURING the wait (spawned after ~200 ms) → the same call returns exit 0.
- anchor older than the cap → exit 2 `unusable no-result`, stderr exactly `read: wait-capped`, return marker written.
- no stage-start marker / latest marker another stage / an iteration mismatch / a future `ts` → exit 2 at once,
  stderr `read: wait-unanchored` (and NOT `wait-capped` — L27).
- containment (L59 kinds): `.pharn`, `.pharn/pharn-loop`, `.pharn/pharn-loop/<n>` each as a link to a directory and as
  a dangling link → exit 2 `unusable unreadable` (`state-dir-refused`) at once; the result as a link to a file, a link
  to a directory and a dangling link → `unusable unreadable` (`not-a-regular-file`) at once, the link's target
  untouched.
- usage: `--budget-ms` 0, `-1`, `570001`, `1e3`, a control character, given twice, given with no value → `unusable
usage`, exit 2, nothing written.
- no `--budget-ms` with an absent result → today's immediate `unusable no-result`, exit 2 (L41).
- `FINISH_WAIT_CAP_MS` / `FINISH_BUDGET_MAX_MS` / `POLL_MS` exported and named by a test with their measured source.

`.dev/floor/command-hygiene.test.mjs`:

- STAGE_AGENT_WIRING: the loop's `waitRule` replaced by the finish-after-every-Agent-call rule; test (5) splits —
  ship keeps `` `run_in_background: false` `` and its JSON-boolean sentence; the loop's section names **no**
  `run_in_background` value (no `run_in_background:` followed by a value, no `"false"`) and names the omission; the
  loop names `5` → the same line again, and the Bash timeout 600000 for the finish line.
- closure (L36): every loop-family `stage-agent.mjs finish` line ends `--budget-ms 570000`; no ship-family finish line
  carries `--budget-ms`; the derived grants still equal `allowed-tools` (existing `loop-no-prompts`).
- the wiring/order parsers (`SA_READ`, `saFlags`) accept the new flag (adjusted at build if they reject it).

## Guarantee audit (P0)

- "`finish --budget-ms` consumes a present result at once and never waits past the cap" → floor: enum/regex (exit
  codes by membership, the budget grammar, the cap arithmetic over a parsed `ts`), tested.
- "the wait never follows a symlink" → floor: the existing lstat walk (tested per path kind).
- "the cap is 60 min from the stage's start" → floor over **unauthenticated** state: the marker can be forged; an
  earlier/future/absent `ts` only shortens the wait; a marker rewritten before each call lengthens it — named residual.
- "the loop runs `finish` after every Agent call / re-runs it on `5` / passes timeout 600000 / omits
  `run_in_background` / stops an orphan" → **advisory** (orchestration; the hygiene pins prove presence and order of the
  text, never that a run did it).
- "the Agent tool's default is the foreground" → **advisory, unmeasured** in a real loop (the `claude -p` probe sent the
  boolean, it did not omit the parameter).
- "the stage agent's `report` is its last action" → **advisory** (the brief's rule; the wait relies on it).
- "a waited-for background stage is billed to its stage" → advisory (the ledger's existing attribution method).
- **Struck:** "`/pharn-loop` now survives a background launch" as a measured fact — this increment cannot run an
  interactive loop; the follow-up below is the measurement.

## Trust audit (P2)

- The result file: DATA from another model, reached only through `consumeResult`'s closed line/exit — unchanged; the
  wait only lstat's it.
- The markers file: unauthenticated `.pharn/` state; it moves only the wait's length (above), never a verdict, a token
  or a consumed result; stderr names it only by the fixed `wait-unanchored`/`wait-capped` codes.
- A later completion notice for a background agent: its text is the agent's free text — `THREAT-MODEL.md §5` channel 4,
  in one more place; no branch reads it.

## Determinism audit (P5)

Every branch is a membership test: lstat kinds, the parsed integer budget, `ts` arithmetic against two constants, exit
codes. The one model decision left on this path (whether to pass `--budget-ms`) is removed: it is pinned on the line.

## Follow-ups (named, not built)

- `loop-background-wait-measure` — re-run the interactive `claude --permission-mode auto` `/pharn-loop` attempt
  (`~/Projects/pharn-measure`, Claude Code ≥ 2.1.310) on 6.74.0: does the Agent call now omit the parameter and run in
  the foreground, and when it does not, does `finish` wait the agent out?
- `ship-run-in-background-omit` — only if ship is ever observed sending the string form (P7: not observed).

## Open questions (HALT)

- **Q1 (deviation):** fold the wait into `finish --budget-ms` (this plan) instead of a separate `wait` subcommand?
- **Q2 (trade):** unconditional (`finish --budget-ms` after every Agent call; a foreground no-report waits to the cap)
  or a model-passed `--background` flag (no wait unless the model saw a background-launch notice)?
- **Q3 (orphan):** add the advisory TaskStop step and a `"TaskStop"` grant to `/pharn-loop`'s `allowed-tools`, or
  leave the orphan to the summary line only?
- **Q4 (wording):** reword `--no-foreground-agent`'s now-false clause "which item 3 cannot wait for" (behaviour kept)?
- **Q5 (numbers):** accept per call 570 000 ms (Bash timeout 600 000) and the cap 3 600 000 ms from the stage-start
  marker?
