# CORE-113 spike record — a script-driven quick loop, one headless session per stage

- **Written by:** the `loop-driver-spike` increment (plan, grill and ship records beside this file). Dev apparatus only;
  no driver ships.
- **Runs:** 2026-11-17, on the maintainer's machine, from a terminal, with Claude Code 2.1.323.
  - Driven run `driver-1` (01:25:46Z → 03:30:14Z).
  - Two `/pharn-loop --quick` comparison runs: `loop-1` (03:31:37Z → 03:35:23Z) and `loop-2` (03:36:32Z → 03:40:03Z).
  - Run one after another, never in parallel.
- **Benchmark:** `lg3-remove-files` (`.dev/measurements/loop-baseline-2026-11-11.md` §11), base
  `7e48564d71c510b223a2d56459e938c3d45f66d9`. The measure base is commit `92492333ff1ed92f062e35e6dbd97c7af028259d` in
  a scratch no-hardlinks clone of the project with its remote removed. It holds:
  - PHARN updated to 7.19.0 by `pharn update`;
  - `gates.timeoutMs: 1800000`;
  - `.claude/agents/pharn-stage.md` (SHA-256 `77fb0384…`, the pinned bytes);
  - the PreToolUse and Stop hook entries copied byte for byte from PHARN-OSS 7.19.0's `.claude/settings.json`.
- **Shared intent:** the `## Intent` and `## Scope` sections of the project's own lg3 SPEC, SHA-256
  `1eb6af196c91a7763690fb72905aad76e29191ade9b7c1cf0cfedb6ecaa53dc3`. The text stays out of PHARN-OSS
  (`kit/intent.md`).
- **Kit and driver:** `kit/` and `driver/` beside this file.
  - Figures: `driver/measure.mjs`, and for the comparison runs a per-context read of the session transcript. Both use
    the ledger's own reader (`pharn/floor/transcript-core.mjs` `sessionRequests`).
  - Weighting: the baseline's formula, in units of one input token:
    `input + 1.25·cw5m + 2·cw1h + 0.1·cr + 5·out`.
  - No price is applied. A USD figure is the CLI's own `total_cost_usd`, labelled as such.
- **Labels:** `R·m` is measured from these runs' outputs; `S` is read in this repository; `O` is an earlier record,
  cited.

## 1. The answer

**No-go**: do not build the driver now. The evidence it rests on is in §7.

- **The driver works.** One node process sequenced a whole quick loop, every pinned floor line in order, with ten
  headless sessions. It reached a `check-loop.mjs` decision (`STOP_CAP`), wrote a `LOOP.md` that the closeout's
  record check and decision check both passed, and closed the run. No spike gate failed (§2). Two carry
  qualifications: the served model (G1) matched for every routed stage, but effort was not observable and the inline
  grill session was served its frontmatter model rather than the one the driver requested; and the question round
  trip (G4) passed for its transport only [R·m].
- **The orchestrator's share after Epics 1 and 2 was measured only up to the spec stage.** Both comparison runs
  stopped there, at S6c (`not-quick`), so no whole-run share exists.
  - Up to that stop the headless orchestrator was **58.6%** (`loop-1`) and **65.7%** (`loop-2`) of each run's weighted
    units [R·m].
  - Those figures cover entry plus one spec stage. They are **not** a whole-run share, and they are **not** comparable
    with the baseline's 27.7% pooled / 30.2% per-run median, which is whole runs started inside an agent.

## 2. The five spike gates (all from `driver-1`)

| gate                           | verdict                                                     | evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------ | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G1 served model matches config | **passed** for the routed stages; effort **not measurable** | `stage-agent.mjs start` printed `agent:fable` for spec and plan, `agent:opus` for test, `agent:sonnet` for each build. Every request of those sessions was served by `claude-fable-5-2` (17, 93), `claude-opus-5-5` (47) and `claude-sonnet-5-5` (223, 13, 14). `--effort high` was passed to every session (`check-model-config.mjs resolve`). No stream, transcript or result records a served effort. **Finding:** the inline quick grill (`claude -p "/pharn-grill <name> --quick"`) was requested on the config's `loop` alias (`sonnet`) and served `claude-opus-5-5` on all 6 requests. `/pharn-grill`'s frontmatter `model:` replaced the request for its turn (`check-model-config.mjs` TURN SCOPE). That matches the config's `grill: opus`, not the driver's request [R·m]. |
| G2 hooks fire                  | **passed**                                                  | The deny probe (a `--agent pharn-stage` session, the run marker open, no scope set) issued one `Write` to `<tree>/loop-driver-probe.txt`. Its tool result was `is_error: true`, beginning `PreToolUse:Write hook error: PHARN floor — write blocked (writes-scope guard, fix #7)`, with `Active scope : (none set — fail-closed default-safe-set active)`. The CLI listed it in `permission_denials` (1). The driver's `test -e loop-driver-probe.txt` exited 1 [R·m].                                                                                                                                                                                                                                                                                                                 |
| G3 a stage completes           | **passed**                                                  | All 10 sessions exited 0. Every routed `finish` exited 0 (spec `done`; plan `done`; test read by `check-test-stage.mjs` as `READY test-first`; builds `done gate:fail` ×3), and each wrote its return marker [R·m].                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| G4 a question round-trips      | **passed — the transport only**                             | A plain session asked one question (DATA: "Which feature or behavior should the round-trip probe confirm the loop-driver can relay an answer for?"). `claude -p --resume <same id>` relayed the operator's word. The resumed session's result carries the same `session_id`, one transcript holds both turns, and the session wrote `blue-otter` to `pharn/.run/loop-driver/lg3-remove-files/answer.txt` (`grep -qxF` exit 0). **Bound:** the answer was typed on the run command before the question existed. This measures that a resumed session keeps its context and acts on a relayed answer, never a person reading the question [R·m].                                                                                                                                         |
| G5 no permission is bypassed   | **passed**                                                  | The driver logs every session argv. All 10 carry `--permission-mode auto`, and none carries `--dangerously-skip-permissions`, `--allow-dangerously-skip-permissions`, `bypassPermissions` or `--allowedTools`. Every session's init event reports `permissionMode: auto`. The only permission denial in any session is the deny probe's hook denial [R·m]. That the log is the argv the processes received is agreement, never proof (L43).                                                                                                                                                                                                                                                                                                                                            |

## 3. The acceptance criteria

1. **The five gates:** §2.
2. **Every branch the driver takes is an exit-code membership test.**
   - `driver/loop-driver.test.mjs` (in `npm test`, through its `.dev/**/*.test.mjs` glob) checks the following:
     - every step's actions are members of the closed vocabulary (`ACTION_RE`), and every exit key is an integer;
     - every `goto` resolves, and every stop row is a `pharn/floor/loop-record-core.mjs` `BLOCKED_IDS` member;
     - with comments, strings, template text and regex literals stripped, no conditional token appears in
       `driver-core.mjs` outside its interpreter region, nor anywhere in `loop-driver.mjs`;
     - the closed tokens the loop reads (a `finish` row, the spec kind, `stage_to_rerun`, `reason_code`,
       `terminal_cause`) become exit codes in `token-exit.mjs` first.
   - Bound: a static scan of two files. The interpreter's own conditionals are of six named kinds (its header): the exit-code lookup, its own bounds, argument validation, record assembly at a stop, dispatch on a step's static shape, and error handling.
   - In `driver-1` the run took 84 steps, and every transition is in `summary.json` `trail` as `[step, exit, action]`
     [R·m].
3. **The driven `LOOP.md` passes `check-loop-record.mjs`.**
   - `loop-closeout.mjs` exited 3 (`not committed: STOP_CAP`, the expected outcome of a non-green stop), with
     `record_check: GREEN`, `decision_check: GREEN`, `ledger: emitted`, `ledger_check: GREEN` and `released: true`
     [R·m].
   - The renderer is also tested against the product checker for a green, a cap and a blocked stop (plumbing only, L4).
4. **The hooks deny an out-of-scope write inside a driven stage:** §2, G2.
5. **What the cost ledger cannot attribute across several sessions:** §5.
6. **Go or no-go, with the share beside it:** §1 and §7.

## 4. Cost and minutes

### The driven run (`driver-1`, `STOP_CAP` after 3 iterations; probes excluded)

| stage            | sessions | requests | weighted units | CLI USD | wall minutes |
| ---------------- | -------: | -------: | -------------: | ------: | -----------: |
| spec             |        1 |       17 |        407,474 |    2.49 |          2.5 |
| plan             |        1 |       93 |      4,011,510 |   15.66 |         16.3 |
| grill (inline)   |        1 |        6 |        213,124 |    0.76 |          0.6 |
| test             |        1 |       47 |      1,242,930 |    3.65 |         10.6 |
| build ×3         |        3 |      250 |     12,784,913 |   15.63 |         74.0 |
| verify ×3 (node) |        — |        — |              — |       — |         20.0 |
| **total**        |    **7** |  **413** | **18,659,951** |   38.19 |    **124.5** |

- **Build** was 12.23 M weighted units, then 0.27 M, then 0.28 M. Its wall minutes were 59.1, 7.6 and 7.3.
- **Verify** took 7.1, 6.5 and 6.4 minutes. Its gates ran in `stage-direct.mjs`, so no model was involved.
- **The driver's own steps took under 0.1 minute in all**: entry 0.04, close 0.01, the stop read and the entry-gate
  read under 0.01 each. It made no model request: an orchestrator that is a script carries no context [R·m].
- **Probes:** 3 sessions and 0.81 USD by the CLI. The resumed question probe shares one transcript, so its two rows
  double-count. Both are excluded above [R·m].
- **First requests:** a `--agent pharn-stage` session's first request was 38.6k–40.4k tokens of processed context. A
  plain session (the inline grill, the question probe) was 73k–84k: it loads the operator's MCP servers, 513 tools
  against `pharn-stage`'s 5 offered [R·m]. The CLI also reported a small `claude-haiku-5-5` side request per session
  (about 3.6k input tokens in the spec session), which the transcripts do not hold and the table leaves out [R·m].

### The comparison runs (`/pharn-loop --quick`, one headless main session each)

| run      | wall  | CLI USD | context                                | requests | weighted units | share up to the stop | first / median processed context |
| -------- | ----- | ------: | -------------------------------------- | -------: | -------------: | -------------------: | -------------------------------- |
| `loop-1` | 226 s |    3.07 | orchestrator (`claude-sonnet-5-5`)     |       17 |        529,105 |            **58.6%** | 111.6k / 121.9k                  |
|          |       |         | spec agent (`claude-fable-5-2`, 2.3 m) |       16 |        374,263 |                41.4% | 34.3k / 82.9k                    |
| `loop-2` | 211 s |    2.28 | orchestrator (`claude-sonnet-5-5`)     |       16 |        484,694 |            **65.7%** | 111.6k / 121.9k                  |
|          |       |         | spec agent (`claude-fable-5-2`, 2.2 m) |       14 |        252,519 |                34.3% | 34.3k / 73.0k                    |

- **How each run ended:** each stopped at S6c. Its routed spec agent reported `refused S6c` (`not-quick`), counting
  seven or more outcomes for a three-criteria limit.
- **What was not written:** no feature directory, so no `cost.json` and no `LOOP.md`. These figures come from the
  session transcripts, not from a ledger.
- **Entry:** the entry gates started and were aborted unmeasured. Entry context was 121,198 tokens in `loop-2`,
  within the 320,000 budget [R·m].
- **The entry timeout was not shortened.** The entry line passed the pinned `--timeout-ms 540000`, and both runners
  applied `"timeout_ms": 1800000` from `gates.timeoutMs` (`pharn/.run/pharn-entry/runner.json`). That is 7.16.0's
  rule, not a defect [R·m].

### The comparison itself

Under §11's rule, two runs are comparable per stage only when they reach the same verdicts. Here the spec stage
accepted in one run and refused in the others, and no later stage ran on the comparison side. **So no stage is
compared, and no whole-run cost or minutes comparison exists.** The spec rows above are reported side by side, not
compared.

## 5. What the cost ledger cannot attribute across several sessions (AC5)

`driver-1`'s closeout emitted `cost.json` (schema `pharn-cost-ledger/2`) with these properties [R·m]:

- `coverage: unavailable`, note `no session id available (CLAUDE_CODE_SESSION_ID unset)`;
- `sessions: []`, **0 requests**, `membership.session: null`, `membership.context: null`;
- 22 markers, all `session_id: null`, and the six route tokens `agent:fable` ×2, `agent:opus`, `agent:sonnet` ×3 and
  `inline:floor-only`;
- `executions` (stage-start-to-return minutes) still derived from the markers.

So, of a driven run, the ledger keeps **when** each stage ran and **which route** it took, and it attributes **no
token**. The reasons:

- **Its membership rule reads one selected session** (`pharn/pharn-contracts/cost-ledger.md` "The selected session
  only", now line 408; the ticket cites 394). A driven run has N.
- **Every marker the driver writes carries no session id.** A process started from a terminal has no
  `CLAUDE_CODE_SESSION_ID`.
- **Run-window binding has nothing to bind.** It needs the marker lines in the selected session's own tool results
  (`run-window/2`), and no driven session ran those lines.

The per-session figures in §4 exist only because the driver logged each session's id and `measure.mjs` read each
transcript. That is agreement between the driver's log and the transcripts, never a ledger (L43).

## 6. Findings for the decision

- **The benchmark cannot end green as written, by either route.**
  - In all three iterations verify failed on `test` alone, while the AC gate passed (AC-1, AC-2 and AC-3 `passed`) and
    every scope check exited 0.
  - The red was two cases of the project's own `__tests__/workspace-docs-sync.test.ts`:
    - AC-5: code spans in `CLAUDE.md` and `.claude/rules/**` name deleted files;
    - AC-8: `.claude/rules/database.md` does not name `0049_drop_files.sql`.
  - Both need edits to `CLAUDE.md` / `.claude/rules/**`, which the intent puts out of scope ("agents cannot write
    them"), or an edit to that test, which the plan left alone. So builds 2 and 3 changed no code, and `check-loop.mjs`
    stopped `STOP_CAP` at 3 of 3 by its own tables.
  - This is a loop result, not a driver artifact. A `/pharn-loop` run on the same plan meets the same tables [R·m].
- **The SPEC varies by run on the same intent bytes.**
  - `driver-1`'s spec session wrote and model-approved a three-criteria quick SPEC (AC-1 integration, AC-2 and AC-3
    unit).
  - Both comparison runs' spec agents refused it as `not-quick`.
  - All three ran on `claude-fable-5-2` as `pharn-stage`, so the outcomes are 1 of 1 accepted against 2 of 2 refused
    [R·m]. That is model variance in the quick-fit judgment (S6c is a judgment row, `pharn-loop.md` Step 2), and it
    alone decided whether a run reached its build.
- **Preflight, kept as evidence of load.**
  - The first timed gates run on the measure base ran while other sessions ran their own test suites, at a load
    average of about 345 on 8 cores: `test` exited 1 after 39.8 minutes, with 27 failures and 26 timeouts
    (`preflight-1-loaded/`).
  - The second, on a quiet machine, was all green: `lint` 0.4, `format:check` 0.2, `typecheck` 0.1 and `test` 6.2
    minutes [R·m].
  - Machine load alone turned a green suite red, which is why the runs went one after another.
- **The comparison base's settings had to be amended.** The base's `.claude/settings.json` (from 7e48564d) wired both
  PreToolUse guards by relative path and had no Stop hook, and `pharn update` never edits that file. The maintainer
  copied the PreToolUse and Stop entries from PHARN-OSS 7.19.0 so the comparison loop's Stop guard is as shipped;
  `setup.sh` now does the same.
  - **Bound:** a project updated with `pharn update` today keeps its older settings, and a real install also lacks
    `pharn-stage.md` (pharn-cli `cli-install-agents`). The measure base is therefore "7.19.0 as shipped from this
    repository", not "a real install today".

## 7. Go or no-go (AC6)

**The orchestrator's measured share after Epics 1 and 2:**

- **58.6%** (`loop-1`) and **65.7%** (`loop-2`) of weighted units in two headless main-session `/pharn-loop --quick`
  runs on 7.19.0, each measured from the run's start to its S6c stop at the spec stage (entry plus one stage) [R·m].
- These are **not** whole-run shares, and **not** comparable with the baseline's 27.7% pooled / 30.2% per-run median,
  which are whole runs on 7.1.4 / 7.3.0 started inside an agent.
- What is comparable is per request. The headless orchestrator's processed context was 111.6k on its first request
  and a median of 121.9k. The baseline's in-agent orchestrator had a median of 231k, on 7.1.4 / 7.3.0 [R·m; O].

**Decision: no-go.** It is a model decision, made under the GATE-2 delegation, and it rests on four things:

1. **The epic's start condition is not met.** CORE-19 starts only if, after Epics 1 and 2, the orchestrator still takes
   a share above the baseline's threshold. That share needs a whole post-change run. Both comparison runs stopped at
   the spec stage, and the benchmark cannot reach a green stop by either route (§6). Starting a redesign on a share
   not measured would be the guess P6 forbids.
2. **The driver's saving is bounded to the orchestrator's requests, and none of those figures support a large
   whole-run saving.**
   - In the one complete driven run the stages carried the cost, the build alone 68.5% of it (12.78 M of 18.66 M
     weighted units).
   - The driver itself made no model request.
   - After Epics 1 and 2 the orchestrator carries about half the per-request context the baseline measured.
   - What a whole `/pharn-loop` run's orchestrator would add on 7.19.0 is not measured, and this record does not
     estimate it.
3. **A real driver has known costs, each named in §8:**
   - the four trusted docs and the threat model change (human edits);
   - the Stop guard is inert for every driven session;
   - the cost ledger attributes no token of a driven run;
   - the run's handoff synthesis is lost (the driver's `## Handoff` is fixed template text);
   - every write the driver makes itself is outside both write guards.
4. **Nothing found blocks reopening.** No spike gate failed: the route is feasible and measured. So a later go costs a rerun, not a redesign of the spike.

**What would reopen it:**

- **A whole post-change run.** A `/pharn-loop` run (quick or full) on 7.19.0 or later, on a benchmark that can reach a
  green stop, whose `cost.json` puts the orchestrator's share at or above the baseline's 27.7% pooled. `lg3-remove-files`
  is not such a benchmark (§6), and it can also refuse at S6c.
- **A ledger that can see a driven run.** A ledger that attributes several sessions to one run, so that a driven run
  and a `/pharn-loop` run can be compared whole.

## 8. What a real driver would contradict (for a human; nothing here is edited)

- **`pharn/ARCHITECTURE.md` §2 and the root `CLAUDE.md` architecture section.** These describe three tooling pieces,
  with the commands invoking the floor and zero runtime dependencies. A driver is a fourth piece that invokes the
  model.
- **`pharn/THREAT-MODEL.md` §2, §4 item 8c and §5 item 4.** A driver starts model sessions with tools approved in
  advance on its command line (`--permission-mode`, `--agent`), so the grants move from command frontmatter to CLI
  flags.
- **`pharn/LIMITS.md` §8 and §3g.**
  - §8: the declared model is not the executed one. A driver can route effort (`--effort`), which the Agent tool
    cannot, but a slash-command session still runs on its frontmatter model (§2, G1 finding).
  - §3g: the orchestrator's re-sends are what a driver removes, and a fresh context per stage remains.
- **The Stop guard** (`.claude/hooks/require-loop-record.cjs`, "INERT when … the marker's session … is null"). A
  marker opened by a process with no session holds no session's turn. Only the driver's own control flow reaches the
  record step.
- **`pharn/pharn-contracts/cost-ledger.md` "The selected session only"** (line 408): §5.
- **`pharn/floor/check-entry-context.mjs`.** It measures the context running the command, and a driver has none (in
  `driver-1` it ran and the run went on).
- **The driver's own writes** (the slug candidate, the SPEC revert, `LOOP.md`) are node file writes that no PreToolUse
  hook judges. `/pharn-loop` makes the SPEC revert and the record through the Edit and Write tools under a set scope.
  Reconcile treats both files as pipeline artifacts.

## 9. Bounds of this record

- **Sample size:** one driven run and two comparison runs, on one machine and one benchmark. Nothing is claimed to
  reproduce.
- **Effort:** not observable in any output.
- **Weighting:** the baseline's weights; no price is applied.
- **Comparison data:** the comparison figures come from transcripts, because those runs wrote no ledger. The driven
  run's figures come from transcripts plus the driver's own logs.
- **What the driver was tested against:** it was walked in tests with scripted exit codes. `driver-1` was its first
  live execution and its only one.

## What this record may claim (P0)

- **Floor.** The floor facts come from the product checkers on the driven run's files and from the hook:
  - `check-loop-record.mjs` and `check-loop-decision.mjs` GREEN, inside `loop-closeout.mjs`;
  - `check-cost-ledger.mjs` GREEN, which certifies internal consistency only;
  - the write guard's deny.

  The driver's closure and conditional pins are an apparatus test.

- **Measured:** every count, token class, weighted sum, minute, model id, exit code and quoted tool result above, read
  from these runs' outputs.
- **Advisory:**
  - the no-go and its reasons;
  - the reading of the S6c refusals as model variance;
  - the statement that `/pharn-loop` would meet the same `STOP_CAP` on that plan.
- **Struck:**
  - "the driver saves N per run";
  - "the orchestrator's whole-run share after Epics 1 and 2 is N";
  - "the comparison runs are comparable to the driven run past the spec stage".
