# Does an interactive `/pharn-loop` run its first stage agent in the foreground? (from 2026-10-26)

The residual `stage-agent-background` (`pharn/floor/stage-agent-core.mjs`): on 2026-10-25 an interactive `/pharn-loop`
in the Claude Code CLI launched its first stage agent in the background and stopped S9
(`loop-wall-clock-2026-10-25.md` §9). 6.74.0 added `stage-agent.mjs finish --budget-ms`, which waits on disk for a
backgrounded agent's result. This file holds what the 2026-10-25 transcript shows (§0), attempt 1 on 7.1.1 (§1: its
base, the wait data from its two Agent calls, how it stopped, three findings), one row per attempt (§2), and what
attempt 2 changes (§3).

**Sources.** `T` = `~/Projects/pharn-measure/run1-void-6.73.2-cli/transcripts/3b533399-7033-4191-8976-4a253579647b.jsonl`
(143 JSONL lines); `T:n` is its 1-based line `n`. `M` = that directory's
`3b533399-…/subagents/agent-a6aeaf05110a1afff.meta.json`. §0's values were read from those two files on 2026-10-26.
`A` = `~/Projects/pharn-measure/cli-1/transcripts/039a3c26-9292-4389-b350-726c319c0f2e.jsonl` (278 lines), attempt 1's
orchestrator; `S` and `P` = its spec and plan agents' transcripts in `039a3c26-…/subagents/`
(`agent-a4153b8b54aa384bd.jsonl`, 155 lines, and `agent-afe3d2c44890fd8ef.jsonl`, 174 lines); `R` = the copied
`pharn/.run/` (`cli-1/pharn-run/`). §1's values come from those files, collected on 2026-10-26 by the protocol's
script, and §1.1's from the starter worktree's git history, 7.1.1's entry check and its isolation check. Times are the
records' own `timestamp` fields (UTC). Free text from any of them is quoted as data.

## 0. The void 6.73.2 interactive attempt (2026-10-25), as its transcript shows it

**Session.** Claude Code `2.1.310` (`version` on all 89 versioned records), entrypoint `cli` (T:143), permission mode
`auto` (T:3), orchestrator model `claude-sonnet-5-5` (`message.model` of all 25 main-thread assistant records, e.g.
T:106). PHARN 6.73.2 (pharn-starter `20c85c05`).

### 0.1 The Agent tool as offered

T:28, an `api-request-shape` record at 05:48:58.255Z, lists the Agent tool's parameters as `description`, `prompt`,
`subagent_type`, `model`, `effort` and `isolation`, `required: [description, prompt]`. **There is no
`run_in_background`.** The tool's description in the same record says: "Subagents run in the background; you'll be
notified when one completes." T:43's `prompt_snapshot` attachment carries the same six parameters. All 12 `api-request`
records (T:31 to T:139) carry shape hash `a26adb59…`, the same as T:28's. What Claude Code's shape hash covers is not
documented, so the equal hashes suggest, without proving, that no other tool list was offered.

### 0.2 The Agent call as sent

T:106, 05:49:24.163Z, tool use `toolu_01AFMnDqgwWb8S9pcZgz3JQr`:

| parameter           | JSON type | value                                                            |
| ------------------- | --------- | ---------------------------------------------------------------- |
| `description`       | string    | `"pharn stage pharn-spec"`                                       |
| `subagent_type`     | string    | `"general-purpose"`                                              |
| `model`             | string    | `"opus"`                                                         |
| `run_in_background` | string    | `"false"` — a parameter the offered schema does not declare      |
| `prompt`            | string    | 1,550 characters: the pinned brief line, then the intent as DATA |

Not sent: `effort`, `isolation`.

### 0.3 What came back

T:107, 05:49:24.732Z (0.569 s after the call): a text result beginning "Async agent launched successfully.", with an
agent id and an output file path. No agent result. M records `requestShape: "background"`,
`requestNonInteractive: true`, `model: "opus"`. The copied subagent transcript has 101 records, the first at
05:49:24.661Z and the last at 05:50:04.033Z.

### 0.4 The stage-start marker against the calls that followed

| event                                                                      | timestamp     | where                   | after the marker |
| -------------------------------------------------------------------------- | ------------- | ----------------------- | ---------------- |
| `stage-agent.mjs start` called                                             | 05:49:19.173Z | T:101                   | −0.639 s         |
| marker 2 `stage-start pharn-spec`, route `agent:opus` (printed by `start`) | 05:49:19.812Z | T:102 (output of T:101) | 0                |
| Agent call                                                                 | 05:49:24.163Z | T:106                   | +4.351 s         |
| async-launch result                                                        | 05:49:24.732Z | T:107                   | +4.920 s         |
| next tool call: `entry-gates.mjs --abort` (with a Read of the close part)  | 05:49:32.766Z | T:113                   | +12.954 s        |
| final message (`blocked: stage-refused`, S9)                               | 05:49:48.979Z | T:141                   | +29.167 s        |

T:143 closes the turn: `turn_duration` 51,709 ms, `pendingBackgroundAgentCount: 1`. 6.73.2 had no `finish` line, and
no return marker was written: the transcript holds no `mark-phase.mjs --kind orchestrator` call.

### 0.5 What the transcript does not show, and one correction

- **The cause of the background launch.** The session sent one Agent call, with `run_in_background: "false"`, under a
  schema without that parameter and a description saying subagents run in the background. Nothing was varied, so the
  transcript cannot say whether the string, the undeclared parameter or the CLI's default made the launch background.
- **A correction to `run1-void-6.73.2-cli/NOTE.txt`.** It says the tool schema "has the parameter, so
  --no-foreground-agent did not apply". T:28 and T:43 show no such parameter. Under 6.73.2's own rule (an Agent tool
  with no `run_in_background` → `start --no-foreground-agent` → inline; the `/pharn-loop` text that session loaded,
  T:10, carries it), the orchestrator would have run the spec inline; T:101's start line carries no
  `--no-foreground-agent`. `loop-wall-clock-2026-10-25.md` §9 repeats the NOTE's reading ("in the interactive CLI the
  string form recurred"); that record is not edited here.
- **What it means for attempt 1.** 7.1.1 keeps the rule (`.claude/commands/pharn-loop.md`, the routed-stage steps,
  item 1). If the CLI still offers this schema, an orchestrator that follows it makes no Agent call at the spec stage,
  and `finish --budget-ms` is not exercised there. §1.2 records what happened.

## 1. Attempt 1 (2026-10-26)

### 1.1 The base

- **Worktree** `~/Projects/pharn-starter-6.72`, detached at `998a4d06`: pharn-starter `9c6343b7` (PHARN 6.72.0) plus
  `505e70ab` (PHARN 7.1.1, pharn-cli 0.14.1 `pharn update --ref main --yes --force` from pharn-oss `main` =
  `e4b1704899f5284608b98caefb7a7f79dff4a383`; `pharn.config.json` records `skillsVersion: 7.1.1` and that commit — the
  CLI takes no SHA, and `main`'s tip was this commit when it ran), `9b36cf01` (`gates.exclude` gains `test`) and
  `998a4d06` (`START.md`, `RUN-PROTOCOL-interactive.md`). Local only, never pushed.
- **`.claude/settings.json` as committed** (the human's choice at the prep increment's plan gate): the `Stop` record
  guard is not wired, as in the 6.73.2 attempt.
- **What differs from the 6.73.2 attempt** (so attempt 1 is not a one-variable comparison with §0): PHARN 6.73.2 →
  7.1.1; full mode → `--quick`; the `--accept-host-execution` flag, whose isolation check 6.73.2 did not have;
  `gates.exclude` `build`, `e2e` → also `test`. The same: the worktree, the intent, `.claude/settings.json`, an
  interactive `claude --permission-mode auto` session, and Claude Code 2.1.310 at preparation.
- **Entry gates**, timed once on `505e70ab` with 7.1.1's own entry check (`entry-gates.mjs --start --timeout-ms
540000`, gates in sequence, no model running; upper bounds from polling each second): `lint` 23.8 s, `format:check`
  19.1 s, `typecheck` 86.8 s (exit 0 each); `base:test` 540.9 s and `test` 540.7 s, both killed at 540 s (exit 143).
  `--wait` exited 6, `unmeasured: test` — S14b in a run. `test` was therefore excluded, which also drops `base:test`;
  the run's entry set was `lint`, `format:check`, `typecheck`.
- **Isolation pre-flight** (`check-run-isolation.mjs`): outcome `HOST` with six credential kinds present; exit 0 with
  `--accept-host-execution`, exit 2 without. The run's own witness says the same (A:188's output of
  `R/pharn-loop/merge-legal-into-company/isolation.json`).
- **The session**, from its transcript: Claude Code `2.1.310` on all 156 versioned records (e.g. A:113), entrypoint
  `cli`, permission mode `auto` (A:3, and on every `permission-mode` record), orchestrator `claude-sonnet-5-5` on all 46
  main-thread assistant records (e.g. A:121). The Agent tool as offered (A:26, an `api-request-shape` record at
  09:33:28.981Z) lists `description, prompt, subagent_type, model, effort, isolation`, no `run_in_background`, shape
  hash `a26adb59…` — the same list and hash as §0.1. `claude --version` at collection: 2.1.310.

### 1.2 The two Agent calls — the wait data

Neither start line carried `--no-foreground-agent` (A:116, A:145), so both stages were routed (`agent:opus`, markers 2
and 4). The plan's brief reads `mode: full` (P:18) because the plan start line carries no `--mode` (only the spec and
build start lines do, as pinned).

| what                                         | spec stage                                                                                     | plan stage                                                                       |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| stage-start marker `ts` (printed by `start`) | 09:34:14.234Z (A:117; marker 2, `R/cost/…/markers.jsonl`)                                      | 09:36:14.081Z (A:146; marker 4)                                                  |
| Agent call                                   | 09:34:23.602Z, A:121 (+9.368 s)                                                                | 09:36:16.237Z, A:161 (+2.156 s)                                                  |
| parameters sent, JSON type                   | `description`, `subagent_type`, `model: "opus"`, `prompt` (1,482 chars) — all strings          | the same four, `prompt` 163 chars — all strings                                  |
| `run_in_background` sent                     | no                                                                                             | no                                                                               |
| return kind                                  | background-launch notice: "Async agent launched successfully." (A:122, 0.800 s after the call) | the same (A:162, 0.623 s after the call)                                         |
| agent's own record                           | `requestShape: "background"`, `finished: true` (`S`'s `.meta.json`)                            | the same (`P`'s `.meta.json`)                                                    |
| `finish` run after it                        | yes, A:127, `--budget-ms 570000`, Bash `timeout` 600000                                        | yes, A:166, the same                                                             |
| `finish` call − marker `ts`                  | +17.593 s                                                                                      | +4.928 s                                                                         |
| agent's `report` call                        | 09:35:59.884Z, `--status done` (S:147)                                                         | 09:38:35.494Z, `--status refused --row S9` (P:166)                               |
| `finish` returned                            | 09:36:00.560Z (A:128): 88.733 s after its call, 0.676 s after the `report` call                | 09:38:36.330Z (A:167): 137.321 s after its call, 0.836 s after the `report` call |
| `finish` first line, exit                    | `done`, exit 0                                                                                 | `refused S9`, exit 3                                                             |
| `waiting` / `wait-unanchored` / `no-result`  | none printed                                                                                   | none printed                                                                     |
| return marker                                | marker 3 `orchestrator` 09:36:00.522Z                                                          | marker 5 `orchestrator` 09:38:36.308Z                                            |
| Claude Code's own completion notice (queued) | 09:36:11.644Z (A:141), 11.084 s after `finish` returned                                        | 09:38:46.585Z (A:204), 10.255 s after `finish` returned                          |

**Both calls went to the background, and `finish` waited both out.** Each `finish` stayed in one call (under the
570 s budget), found the result on disk under a second after the agent's `report` call, consumed it and wrote the
return marker, about ten seconds before Claude Code queued its own completion notice. This is the first measured
success of THE WAIT (6.74.0) in a real interactive loop. What it does not show: a stage longer than one budget (no
exit 5 and re-run occurred), and the cap (`FINISH_WAIT_CAP_MS`, 3,600,000 ms from the marker) was never approached.

**The marker against `finish`'s clock.** Both markers precede their `finish` calls (17.593 s, 4.928 s) and were
written by `start` on the same host, so neither anchor lay in the future and neither wait was cut short as
`unanchored`. The result each `finish` read was this run's own: its agent's `report` call sits in that agent's own
transcript (S:147, P:166) under a second before `finish` returned, and `start` removed any leftover before each spawn
(the `stage-agent-core.mjs` header, THE RESULT).

**What §1.2 shows about PHARN's code: nothing to fix in THE WAIT.** The three failure classes this record was to look
for did not occur: no anchor-clock skew (both anchors in the past, both waits found their result), no lost result
(both results found and consumed, each bound to its agent), and `finish` was not skipped (it ran after both calls,
with `--budget-ms`).

### 1.3 How the run stopped

- **S9 at the plan stage.** The plan agent's `check-ac-tests.mjs` printed `RED — level-excluded` for AC-1, AC-2 and
  AC-3 (P:144): each is mapped at `unit`, and `pharn.config.json` `gates.exclude` excluded every unit gate (`test`).
  `/pharn-plan` says such a RED is not the stage's to fix (HALT and report); the loop's stop table has no row for it,
  so the agent reported `refused --row S9` (P:166). The orchestrator stopped `blocked: stage-refused` (A:231). The
  cause is attempt 1's preparation (the `test` exclusion in `9b36cf01`), not PHARN.
- **The close-out.** The orchestrator aborted the entry runner (A:173; it had finished: `R/pharn-entry/result.json`
  `status: done`), read the close part and the loop-record contract, and ran the blocked stop's SPEC-revert setter in
  one compound call (A:225). The auto-mode classifier denied it (A:226, below). The orchestrator stopped and reported
  (A:231). At the human's request ("Run the three commands from option 2 yourself now", A:235) it reverted the SPEC to
  `Draft` with the Edit tool (A:252–257; no `check-spec.mjs` run), and `set-writes-scope.cjs --clear` (A:253, A:264) and
  `require-loop-record.cjs --close` (A:254, A:265) each exited 0 (A:272).
- **No `LOOP.md` exists for attempt 1.** Row 1's stop state comes from A:231 and `R` only. `SPEC.md` (now `Draft`),
  `PLAN.md` and `AC-TESTS.md` were left untracked in `pharn/features/merge-legal-into-company/` and are copied in
  `cli-1/feature/`.
- **Permission denials.** One in the orchestrator transcript, none in `S` or `P` (their `is_error` results are
  commands that exited 1: S:51, P:78, P:93). The denied call, as sent (A:225):

  ```text
  cd /Users/pgalarowicz/Projects/pharn-starter-6.72 && node .claude/hooks/set-writes-scope.cjs --from-frontmatter .claude/commands/pharn-loop.md --target pharn/features/merge-legal-into-company/SPEC.md; echo "exit $?"; node pharn/floor/reconcile-baseline.mjs --amend-scope; echo "exit $?"; sed -n 1,15p pharn/features/merge-legal-into-company/SPEC.md
  ```

  The classifier's text begins (A:226): "Permission for this action was denied by the Claude Code auto mode
  classifier. Reason: [Security Weaken]." The rest is its standard guidance (full text in `cli-1`).

### 1.4 Findings — proposed, not built

**(a) The plan stage has no stop row for an excluded AC level.** A `level-excluded` RED from `check-ac-tests.mjs` is
a configuration fact the stage cannot fix, and today it reaches the loop as S9 (`stage-refused`), the row for a stage
that refused for a reason of its own. Proposed: a row **S12b `blocked: ac-level-excluded`** beside S12
(`no-test-runner`, the test stage's row for a level with no runner "or only excluded ones"). Its condition is the
`level-excluded` kind; its remedy is "remove the level's gate from `gates.exclude`, or re-specify the criterion at
another level" — the RED's own remedy. To keep the branch a membership test (P5), the row should be decided from a
closed code the checker emits (an exit code or a `--verdict` token for this kind), never from the RED's printed text
(L6), and the plan brief's closed `LOOP_ROWS` would gain the row. Unbuilt here.

**(b) The classifier denied a pinned close-out line, as sent in a compound call.** What the transcript shows:

- The denied call was the pinned setter wrapped in a compound command (§1.3), not the pinned line alone.
- `pharn-loop.md`'s `allowed-tools` holds an exact grant for that line:
  `Bash(node .claude/hooks/set-writes-scope.cjs --from-frontmatter .claude/commands/pharn-loop.md --target pharn/features/*/SPEC.md)`.
- In the next turn, `--clear` and `--close`, each also behind `cd <worktree> &&`, were not denied (A:253, A:254). So
  the `cd` prefix by itself did not draw a denial on those two lines.
- Unanswerable from this transcript:
  - whether the bare pinned line would have matched the grant and skipped the classifier;
  - whether an `allowed-tools` grant is consulted at all for a call the classifier judges;
  - what in the call drew `[Security Weaken]` (only the tag is recorded).

The close-out lines exposed the same way are the close part's (`pharn-loop-close.md`):

- the SPEC-revert setter and its `--amend-scope` (lines 25–26);
- the record setter and its `--amend-scope` (lines 44–45);
- `--clear` (line 400);
- `--close` (line 410).

Each has its own exact grant. A run that gets further also runs one setter per stage and the build's `--from-plan` and
`--anchor`; attempt 1 reached none of those, so whether the classifier would judge them is not shown.

Whether the wording of a grant changes what the classifier decides is not shown either. So the question goes to
attempt 2 as a measurement: two allow rules in the worktree's
`.claude/settings.local.json` (§3), and the record of whether those calls are still denied. Two proposals depend on
that answer:

- If they pass, the close part could tell the orchestrator to run each pinned line as its own call, with no prefix or
  suffix, so an exact grant can match.
- If they are still denied, no grant wording helps, and the remedy is outside PHARN (an operator's classifier
  rules), to be named in `pharn/LIMITS.md` by a human.

**(c) 7.1.1's `--no-foreground-agent` rule was not applied, and item 2's "the tool's default is the foreground" is
contradicted by attempt 1's two calls.**

- The schema offered no `run_in_background` (A:26), yet neither start line carried the flag (A:116, A:145). The rule
  is ADVISORY (the model's reading of the schema), and here it was not followed. Without the flag, `start` exits 0
  and the pinned procedure routes the stage to an Agent call, which is how THE WAIT came to be exercised.
- Item 2 says to leave `run_in_background` out because "the tool's default is the foreground (ADVISORY, and
  unmeasured in a real loop)". Here it was left out, and both agents ran in the background (`requestShape:
"background"` in both `.meta.json` files).
- Item 1's reason for the rule, that item 3's wait "has not been measured" for such a tool, no longer holds for
  2.1.310's interactive CLI, where attempt 1 measured it twice (§1.2).
- Correcting either sentence is shipped prose about `run_in_background`, which this increment was asked not to
  write. It is the named follow-up **`loop-foreground-default-prose`**: a patch to `pharn-loop.md` items 1–2 and the
  `stage-agent-core.mjs` RESIDUALS entry, deciding whether `--no-foreground-agent` stays now that the wait is
  measured.
- The `TaskStop` grant is untouched; `taskstop-grant-scope` stays a named follow-up.

## 2. Attempts

Filled from each attempt's own transcript and `pharn/.run/` copy (`~/Projects/pharn-measure/cli-<n>/`). The Claude Code
version is the transcript's `version` field, never a `claude --version` read later.

| attempt                 | PHARN                    | Claude Code                           | orchestrator model                      | Agent params sent                                                                                                      | return kind                                   | finish first line + exit                           | marker ts − finish clock                                                                                                | stop state                                                                                                               |
| ----------------------- | ------------------------ | ------------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 1 (`cli-1`, 2026-10-26) | 7.1.1, `e4b17048` (§1.1) | 2.1.310 (156/156 records, e.g. A:113) | `claude-sonnet-5-5` (46/46, e.g. A:121) | spec A:121, plan A:161: `description`, `subagent_type`, `model: "opus"`, `prompt`, all strings; no `run_in_background` | background-launch notice, both (A:122, A:162) | spec `done` 0 (A:128); plan `refused S9` 3 (A:167) | marker before `finish` call by 17.593 s (A:117→A:127) and 4.928 s (A:146→A:166); `finish` waited 88.733 s and 137.321 s | `blocked: stage-refused` (S9) at plan, `level-excluded` (A:231, P:144); no `LOOP.md` (close-out human-driven, A:235–272) |

## 3. Attempt 2 — what it changes

Prepared after this record, in the same worktree. Its base facts (the install commit, the gate times, the commits) are
written into `~/Projects/pharn-starter-6.72/RUN-PROTOCOL-interactive.md` and copied into row 2 when it is collected
(`cli-2/`).

- **PHARN:** this record's branch carries no product change, so it is installed with `pharn update --ref main` (the
  CLI takes no branch) and checked byte for byte against the branch's files.
- **`test` stays in the entry set.** The project's `test` script is narrowed to the directories of attempt 1's three
  AC test files and the code they cover, so the gate fits 540 s; `gates.exclude` is back to `build`, `e2e`.
- **Two allow rules** in the worktree's `.claude/settings.local.json` (finding (b)):
  `Bash(node .claude/hooks/set-writes-scope.cjs *)` and `Bash(node pharn/floor/reconcile-baseline.mjs *)`. Each is a
  wildcard, so it pre-approves every argument form of those two scripts, not only the pinned lines. The
  `allowed-tools` grants in the installed commands are unchanged from attempt 1.
- **Attempt 3** runs only if attempt 2 makes no background Agent call. The protocol holds the condition and the exact
  local edit.
