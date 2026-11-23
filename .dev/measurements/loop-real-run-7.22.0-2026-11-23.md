# A real full `/pharn-loop` on pharn-app at 7.22.0 (2026-11-23)

**Status: measured.** One full (not `--quick`) `/pharn-loop` in the user project `~/Projects/pharn-app`, installed
at `skillsVersion` 7.22.0, ended **`STOP_GREEN` after one iteration**. That is **run 2**. It is **not a first-attempt
green**. Its description (intent v2) was written **after run 1 stopped S9** at the test stage on the first
description (intent v1), for two reasons:

- intent v1's third criterion ("the existing profile unit tests still pass unchanged") holds before the build as
  well as after it, so a test-first run cannot fail it first (Linear CORE-344);
- pharn-app's `main` at the base `8c896454` already fails `format:check` on `docs/product/ACTION-APP-CONTRACT.md`,
  which no loop over that tree can end green on.

Intent v2 moved the no-change criterion into the constraints and added "format that file" as its third criterion.
Before both runs, attempt 1 on intent v1 was killed mid-build by a host reboot. All three are recorded below. Run 2 is
the run that answers Linear CORE-310; run 1 and attempt 1 are context.

Run 2 in one line: 40 min 51 s of session, 13.30 M processed tokens, 55.0 k output tokens, `total_cost_usd` 5.86
(list price, Claude Code's own figure). Verify reused regress HEAD's `test` and `typecheck`. The entry gate cache did
not fire (it only stores red evidence). Every routed stage ran as a `pharn-stage` agent with its configured model and
effort. No stage used an MCP, WebFetch, WebSearch or Skill tool. **Every wall-clock figure here was taken under heavy
external load** (1-minute load average 14 to 80 during run 2, mostly other projects' vitest runs), and none is a
low-load baseline.

## Setup

- **Project:** `~/Projects/pharn-app` (`pharn-dev/pharn-app`), pharn CLI 0.21.1, `skillsVersion` 7.22.0,
  `gates.exclude: ["build", "e2e"]`, `testResults: {"test": "vitest-json"}`. `models.stages`: spec, plan, grill,
  ac-test and review on opus, everything else on sonnet, every stage at effort `high`.
- **Feature:** `profile-todo-cleanup`. It replaces a stale `TODO: Add organizationId parameter when multi-workspace
support is added` in `features/profile/services/get-profile.ts` with a one-line statement of the real rule (the
  profile is per person). Intent v2 also formats `docs/product/ACTION-APP-CONTRACT.md`. Both intents are in the
  bundles (`intent.text`, `intent.sha256`):
  - v1: 1003 bytes, sha256 `e1f51cdfed790b6f0efec30e886753f26db985b14a3caa7eb559184c96392ba0`;
  - v2: 1377 bytes, sha256 `86b70f4cb15e3c83b596f68f9eeac6e62e9bd7fa0507bfe10be4679733f3bc1b`.
- **Launch.** One line typed into a Terminal tab of the desktop app (`mcp__terminal__run_in_terminal`), cwd
  `~/Projects/pharn-app`:

  ```sh
  date > <run>/start.txt; claude -p --permission-mode auto --output-format json "/pharn-loop --accept-host-execution $(cat <intent>)" > <run>/final.json 2>&1; date > <run>/stop.txt
  ```

  This is a headless main-session run: the loop ran on the session's main thread, with no `--no-foreground-agent`.
  Client: Claude Code 2.1.328, `claude -p`. The project's `CLAUDE.md` and rules load because the cwd is under
  `~/Projects` (a cwd under `/private/tmp` loads neither; observed by CORE-311).

- **Watching.** Each run had its own new run directory. A script waited for that run's own `stop.txt`, and evidence
  was copied only after the `claude` process had exited (`.dev/memory-bank/lessons-learned.md` L66).
- **Machine load.** Sampled every 60 s into each run's `load.txt`, run 1 and run 2 only; attempt 1's samples were in
  the scratchpad the reboot wiped. Before each run the operator waited for a 1-minute load under 20, and other
  sessions then pushed it back up. Per-stage windows are in the run 2 table. The effect of load on any duration is
  **not quantified**: there is no low-load control run.
- **Tree state.** pharn-app carried uncommitted files that belong to neither PHARN nor this task: a modified
  `skills-lock.json`, plus untracked `.agents/`, `.codex/` and `.claude/skills/security-audit`. They were not
  touched. Regress read the start as dirty because of them (see "Fired or not").
- **`main` moved during attempt 1.** pharn-app's reflog shows `pull: Fast-forward` `be523aa8` → `8c896454` at
  09:25:07 CET. That pull was made by another session, not by the loop: no pharn-app transcript holds a `git pull`.
  It landed during attempt 1's entry `test` gate. Attempt 1's entry stamp still says `head: be523aa8`, records `test`
  as `mutated: true`, and lists the pulled file under `test`'s `gate_changes`. Runs 1 and 2 started on `8c896454`.

## The three runs

| run       | base       | intent | window (CET)        | stages reached                                       | ended                                                        |
| --------- | ---------- | ------ | ------------------- | ---------------------------------------------------- | ------------------------------------------------------------ |
| attempt 1 | `be523aa8` | v1     | 09:23:02 – ~10:14   | entry, spec, plan, grill, triage, test, build (part) | killed by the host reboot (no stop record)                   |
| run 1     | `8c896454` | v1     | 11:39:33 – 11:56:28 | entry, spec, plan, grill, triage, test               | `INCONCLUSIVE`, `blocked: stage-refused` (S9) at test        |
| run 2     | `8c896454` | v2     | 13:26:59 – 14:07:50 | all: entry through verify, one iteration             | `STOP_GREEN`, committed to `pharn-loop/profile-todo-cleanup` |

Source: each run's `start.txt`/`stop.txt`, `LOOP.md` and `markers.jsonl` [R·m]. Attempt 1's end is the reboot time
the operator gave; its last transcript line is 10:05:15.

- **Run 2's stop.** `LOOP.md`: `decision: STOP_GREEN`, `iterations: 1`, `cap: 3`. It quotes `check-loop.mjs` exit 0 and
  `check-loop-fresh.mjs` exit 0 (`FRESH`). Regress verdict `no-regressions`, verify `PASS`, `ac_gate` `test-first` `PASS`.
  The commit `c698928c` sits on the local branch `pharn-loop/profile-todo-cleanup`. Nothing was pushed or merged.
- **Run 1's stop.** `check-test-stage.mjs profile-todo-cleanup --require-test-first` exited 1 with `RED lock-red` and
  `no red_run is recorded`. The stage agent reported that AC-3 passed before the build. `check-loop.mjs` was not
  consulted, as for any blocked stop.
- **Attempt 1.** It got past the test stage on the same intent v1 that stopped run 1, because its test-stage model
  wrote each no-change test behind a precondition ("the source no longer contains the old TODO"). The two runs show the
  same criterion either continuing or stopping depending on how the test-stage model writes it (CORE-344).

## Run 2, per stage

Wall-clock is from a stage's `stage-start` marker to the next marker [R·m]. Tokens are summed over the context's
requests, deduplicated by message id, from the retained transcripts [R·m]. Processed means input + cache write +
cache read + output. Load is the 1-minute average over the samples inside the window [R·m].

| stage   | wall-clock | route (marker) | agent type    | requested model / effort | served model      | requests | processed tokens | output tokens | load (min–max)  |
| ------- | ---------- | -------------- | ------------- | ------------------------ | ----------------- | -------- | ---------------- | ------------- | --------------- |
| spec    | 106 s      | `agent:opus`   | `pharn-stage` | opus / high              | claude-opus-5-5   | 15       | 893,738          | 6,224         | 33–51           |
| plan    | 122 s      | `agent:opus`   | `pharn-stage` | opus / high              | claude-opus-5-5   | 20       | 1,370,423        | 8,877         | 45–51           |
| grill   | 331 s      | `agent:opus`   | `pharn-stage` | opus / high              | claude-opus-5-5   | 21       | 2,072,178        | 12,316        | 37–73           |
| triage  | 34 s       | `agent:sonnet` | `pharn-stage` | sonnet / high            | claude-sonnet-5-5 | 9        | 449,564          | 2,802         | 37 (one sample) |
| test    | 247 s      | `agent:opus`   | `pharn-stage` | opus / high              | claude-opus-5-5   | 22       | 1,642,402        | 8,001         | 14–80           |
| build   | 450 s      | `agent:sonnet` | `pharn-stage` | sonnet / high            | claude-sonnet-5-5 | 15       | 1,081,606        | 3,750         | 14–41           |
| regress | 856 s      | (direct)       | —             | —                        | —                 | —        | —                | —             | 18–69           |
| verify  | 43 s       | (direct)       | —             | —                        | —                 | —        | —                | —             | 20–36           |
| main    | 2,447 s    | —              | (session)     | sonnet / high (command)  | claude-sonnet-5-5 | 46       | 5,793,744        | 13,062        | 14–80           |

- **Totals.** 13,303,655 processed, 55,032 output [R·m]. Claude Code's `final.json` reports
  `total_cost_usd` 5.86, `duration_ms` 2,444,799 and `num_turns` 53 [R·m]. Per model: opus USD 3.73 and 35,418 output
  tokens, sonnet USD 2.12 and 19,614 output tokens (`modelUsage`).
- **Not under a stage marker.** Session start to `run-start`: 38 s. `run-start` to spec's start: 18 s. Between a
  stage's return and the next stage's start: 139 s in total, 83 s of it between triage and test, when the orchestrator
  waited for the entry gates. Verify's return to `run-stop` (the close-out): 42 s. `run-stop` to session exit: 27 s.
- **What the regress and verify rows are.** Regress and verify ran as direct scripts in the main context, so their
  model time is part of the main row.
- **Requested against served.** "Requested model / effort" is the Agent call's input. "Served model" is the model the
  transcript's requests name. They agree in every routed stage.

## Run 2, per gate (`duration_ms`)

From each gate-run stamp's `runs[].duration_ms` [R·m]. These are the run's own records, not re-timed.

| gate run             | test           | lint    | format:check   | typecheck      | other                                  |
| -------------------- | -------------- | ------- | -------------- | -------------- | -------------------------------------- |
| entry (`8c896454`)   | 451,316        | 181,383 | 57,620, exit 1 | 9,825          | —                                      |
| test stage (ac-test) | 1,100, exit 1  | —       | —              | —              | the red run the lock records           |
| build, targeted      | 2,188          | —       | —              | —              | —                                      |
| build, full          | 327,740        | 22,299  | 14,757         | 5,037          | —                                      |
| regress, base        | 410,037        | —       | —              | 25,386         | `npm ci` install for the base side ran |
| regress, HEAD        | 383,287        | —       | —              | 4,042          | —                                      |
| verify               | reused (0 run) | 22,893  | 13,552         | reused (0 run) | instruction-growth 513, reconcile 393  |

Entry ran its gates in the background while spec, plan, grill and triage ran. Its `format:check` red was reported as
`unattributed` (the feature directory changed during that gate), so it did not stop the run; run 2's own AC-3 fixed
the file.

## Fired or not (7.11–7.22)

Each line quotes the field that shows it.

- **Entry gate cache (CORE-86, `entry-gate-cache`): did not fire.** Every run printed
  `entry-gates: cached evidence — miss no-record`. The cache stores only red-at-entry evidence
  (`entry-gates.mjs`, gate-evidence-cache), and no earlier run had left a red record. So a green or `unattributed`
  entry cannot exercise it. All three runs ran their entry gates in full.
- **HEAD `test` reuse (CORE-89): fired.** In verify's stamp, `test` and `typecheck` carry `ran: false`,
  `reason: reused` and `reused: {stage: "regress", side: "head", stamp_sha256: "7d0fb371…"}`. `verify-report.json`
  has `gate_reuse.reused: [{id: "test", …}, {id: "typecheck", …}]`. That saved one `test` run, which regress HEAD timed
  at 383,287 ms.
- **Effort routing (CORE-111): fired, but cannot be told apart from a default here.** Every routed Agent call
  carried `effort: "high"` beside its `model` (for example
  `{"subagent_type": "pharn-stage", "model": "opus", "effort": "high", "description": "pharn stage pharn-spec"}`), and
  each agent's `meta.json` records `effort: "high"`. pharn-app configures every stage at `high`, so a routed value and
  a default would look the same. A project with mixed efforts is needed to observe a difference.
- **`pharn-stage` agent type (CORE-107): used for every routed stage.** All six routed stages (spec, plan, grill,
  triage, test, build) were launched with `subagent_type: "pharn-stage"`. Each is followed in the transcript by a
  `stage-agent.mjs finish --budget-ms` wait.
- **CORE-105 AC4: met by this run.** This was a main-session run without `--no-foreground-agent`. The six routed
  stages carry `agent:<alias>` routes in `markers.jsonl` (`agent:opus` or `agent:sonnet`), each agent's `meta.json` says
  `finished: true`, and its result returned before the next marker. Claude Code recorded the launches as
  `requestShape: "background"` in a headless client.
- **Entry-as-base evidence (6.49.0): not used.** `regression-report.json` has `base_evidence.entry.used: false` and
  `miss: "start-dirty"`, and `REGRESSION.md` says the base evidence was "produced by this invocation". Regress
  therefore ran the base side's `test` again (410,037 ms) after the entry had run it on the same commit. The dirty
  start is the foreign files listed under Setup. That attribution is advisory: no run with a clean start was made to
  compare.
- **Reuse that does not exist yet.** Regress HEAD re-ran `test` (383,287 ms) on the same tree the build's full gates
  had just tested (327,740 ms); nothing was written between the two runs (CORE-345).

## Tool use outside the stage tool list (for CORE-311)

There was no `tool_use` of any `mcp__*`, `WebFetch`, `WebSearch` or `Skill` tool in any context of any run: main
session, every stage agent, all three runs [R·m, a scan of `tool_use` names in the retained transcripts]. The tools
the main session used in run 2 were `Bash` 41, `Agent` 6, `Read` 3 and `Write` 2. The stage agents used `Bash`, `Read`,
`Write`, `Edit` and `SubagentHandback`. The scan cannot see a tool the harness refused before writing a `tool_use`.

## Run 1 and attempt 1, shorter

| stage  | run 1 wall-clock | run 1 processed / output | attempt 1 wall-clock | attempt 1 processed / output |
| ------ | ---------------- | ------------------------ | -------------------- | ---------------------------- |
| spec   | 102 s            | 1,107,698 / 6,493        | 83 s                 | 758,114 / 5,606              |
| plan   | 103 s            | 928,446 / 8,804          | 196 s                | 1,366,348 / 12,234           |
| grill  | 155 s            | 2,004,953 / 12,129       | 216 s                | 2,475,717 / 16,674           |
| triage | 43 s             | 501,237 / 2,797          | 41 s                 | 461,164 / 3,414              |
| test   | 320 s            | 1,423,751 / 8,466        | 1,871 s              | 1,740,322 / 10,783           |
| build  | —                | —                        | ~9 min, killed       | 412,856 / 1,431 (partial)    |
| main   | 1,013 s          | 5,259,393 / 11,808       | (killed)             | 4,385,356 / 8,689 (partial)  |
| total  | 16 min 55 s      | 11,225,478 / 50,497      | ~51 min              | 11,599,877 / 58,831          |

- **Entry gates.**
  - run 1: lint 102,733, format:check 34,465 (exit 1), test 418,961, typecheck 5,548.
  - attempt 1: lint 29,241, format:check 17,138 (exit 0 on `be523aa8`), test 396,555, typecheck 4,432.
- **Run 1's ac-test red run:** 1,887 ms (exit 1).
- **Run 1 cost:** `final.json` `total_cost_usd` 5.12. Attempt 1 has no `final.json`: its session was killed. Every
  routed stage in both runs used `pharn-stage` at its configured model and effort `high`.
- **Attempt 1's 31-minute test stage.** Its stage agent spent 343 s and 613 s in `check-ac-style.mjs --before` and
  `--after`, and 365 s in a `prettier --check` over three files, against run 2's 247 s for the whole stage. Load was 39
  to 65 in that window (the samples that survive: 22 at 09:27, 39 at 09:39, about 65 at 10:01). That the load caused
  the gap is advisory; there is no control.

## Defects and observations filed (Linear, under CORE-293)

- **CORE-343.** A crashed loop's open marker (`pharn/.run/pharn-loop/<name>/active.json`) is noticed by a loop on any
  other slug only at its build anchor (`epochOwnerOpen`), after spec through test have run, for up to 24 h. Found by
  reading the installed code after attempt 1's crash, not reproduced. Attempt 1's marker and cost directory were set
  aside to `pharn/.run/aborted-2026-11-23/`. Renaming inside `pharn/.run/pharn-loop/` would not have cleared it.
- **CORE-344.** A "nothing changes" criterion is approved by spec, plan, grill and triage, and then either passes
  the test stage or stops it, depending on how the test is written (attempt 1 against run 1).
- **CORE-345.** Regress HEAD re-runs the `test` that the build's full gates had just run on the same tree (383 s in
  run 2). Filed as a question, not as a defect claim.
- **Not filed here:** pharn-app `main` (`8c896454`, from its PR #384) fails `format:check` on
  `docs/product/ACTION-APP-CONTRACT.md`. It is a project fact, not a PHARN defect. Run 2's branch carries the fix.

## Hand-off figures

- **CORE-312:** verify's `test` 0 ms (reused) against regress HEAD's `test` 383,287 ms. The build's full `test` was
  327,740 ms and regress base's 410,037 ms. All were taken under the load above.
- **CORE-311:** reproduce run 2 from the same base `8c896454`, intent v2 (sha256 `86b70f4c…`, also in
  `evidence/run2.json` → `intent.text`) and the launch line above, in a new run directory. The path to the operator's
  `FEATURE.md` is in the CORE-310 hand-off.

## Evidence

Three bundles under `.dev/features/core-310-real-loop-record/evidence/`. Each is a JSON object with the run's intent,
its outcome, its member files (each with `bytes`, the original bytes' `sha256` and its content), the members it
looked for and did not find (`absent`), and stale members it dropped (`dropped_stale`):

| bundle          | bytes   | members | absent (looked for, not there)                                                                                            | dropped as stale                                                      |
| --------------- | ------- | ------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `attempt1.json` | 86,353  | 41      | `start.txt`, `stop.txt`, `final.json`, `load.txt` (wiped by the reboot); regress, verify and build stamps (never reached) | none                                                                  |
| `run1.json`     | 329,145 | 43      | `run-state/writes-scope.json`; build stamps (never reached)                                                               | regress base/HEAD and verify stamps (feature `core63-data-retention`) |
| `run2.json`     | 629,108 | 55      | `run-state/writes-scope.json`                                                                                             | none                                                                  |

- **Members:** the feature directory (SPEC, PLAN, GRILL, triage, AC-TESTS, lock, LOOP, RUN-REPORT, `cost.json`, and in
  run 2 BUILD, REGRESSION, VERIFY and both reports); the AC test files or the source diff; the loop's run-state
  directory and cost observations; the entry, test, build, regress and verify gate stamps of this feature; the PHARN
  records in the git dir; and `tokens.json` (the per-context token sums above).
- **Left out:** transcripts, gate stdout/stderr, `*.test-results.json` and the reconcile baseline. They are large or
  redundant and stay machine-local in `~/Projects/pharn-measure/core-310/<run>/`. No bundle is over 1 MB, so nothing
  else was trimmed.
- **Scrub, applied to every member before writing:**
  - the home directory became `~` and the user name `<user>`;
  - every email address became `<email>`. The bundled members held one: the app's own E2E fixture address, in plans
    and tests;
  - run 2's commit diff was generated without its author line.
- **Pattern scan of the written bundles:** 0 matches each for `/Users/<name>` paths, email addresses, the user name,
  Anthropic, OpenAI-style, GitHub, AWS and Slack key shapes, `PRIVATE KEY` headers, bearer tokens, and
  password/secret/token JSON assignments [R·m]. The scan reports only its own patterns; CI's gitleaks runs its own.
- **What remains:** session ids, agent ids and message ids, by decision. `isolation.json` lists which credential
  locations exist on the host (`cred:ssh-dir`, `cred:aws-credentials` and others): names, not values.

## How the figures were made

Read-only helpers in the session scratchpad, not committed (the CORE-112 and baseline precedent):

- `tokens.mjs` sums each transcript context's usage by message id and lists `tool_use` names.
- `gates.mjs` prints each gate-run stamp's runs.
- `collect.sh` copied each run's state and transcripts to `~/Projects/pharn-measure/core-310/<run>/` right after the
  session exited.
- `bundle.mjs` builds the bundles with one selection rule, and checks that each bundle holds exactly the members that
  rule selects (all three: complete).
- Wall-clock per stage comes from `markers.jsonl`, and load windows from `load.txt`.
- Labels follow `loop-wall-clock-2026-10-25.md`. Source `R` is these runs' stores; precision `m` is measured. No figure
  here is an estimate unless it says "~".

## What this record may claim (P0)

- The figures are what these runs' own stores and Claude Code's transcripts say. They are read, not re-timed or
  re-verified against an independent clock. Agreement between `LOOP.md`, `RUN-REPORT.md`, `cost.json` and the
  transcripts is agreement, not proof (L43).
- "Fired" means the named field shows the mechanism's effect in this run. It says nothing about other projects or
  loads.
- Every duration was taken under external load that varied minute by minute. None is a baseline, and no figure here
  supports a claim about how fast a loop runs on an idle machine.
- Attributions (load as the cause of attempt 1's slow test stage; the foreign files as the cause of `start-dirty`)
  are advisory: no run varied the attributed condition (L40).
- Run 2's green covers the gates that ran. `build` and `e2e` are excluded by the project's config, as its commit
  message says.
- Run 2 is one run, after two that did not end green, on a description revised between them. It is not evidence that
  a first attempt ends green.
