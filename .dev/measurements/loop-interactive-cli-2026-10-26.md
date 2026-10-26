# Does an interactive `/pharn-loop` run its first stage agent in the foreground? (from 2026-10-26)

The residual `stage-agent-background` (`pharn/floor/stage-agent-core.mjs`): on 2026-10-25 an interactive `/pharn-loop`
in the Claude Code CLI launched its first stage agent in the background and stopped S9
(`loop-wall-clock-2026-10-25.md` §9). 6.74.0 added `stage-agent.mjs finish --budget-ms`, which waits on disk for a
backgrounded agent's result. This file holds what the 2026-10-25 transcript shows (§0), attempt 1 on 7.1.1 (§1: its
base, the wait data from its two Agent calls, how it stopped, three findings), one row per attempt and what changed
between them (§2), what attempt 2 changes (§3), attempt 2 as its collection shows it (§4), the verdict (§5), the
absolute cost of that one `--quick` loop (§6), and attempt 2's findings (§7). Attempt 3 was not needed (§4.4).

**Sources.** `T` = `~/Projects/pharn-measure/run1-void-6.73.2-cli/transcripts/3b533399-7033-4191-8976-4a253579647b.jsonl`
(143 JSONL lines); `T:n` is its 1-based line `n`. `M` = that directory's
`3b533399-…/subagents/agent-a6aeaf05110a1afff.meta.json`. §0's values were read from those two files on 2026-10-26.
`A` = `~/Projects/pharn-measure/cli-1/transcripts/039a3c26-9292-4389-b350-726c319c0f2e.jsonl` (278 lines), attempt 1's
orchestrator; `S` and `P` = its spec and plan agents' transcripts in `039a3c26-…/subagents/`
(`agent-a4153b8b54aa384bd.jsonl`, 155 lines, and `agent-afe3d2c44890fd8ef.jsonl`, 174 lines); `R` = the copied
`pharn/.run/` (`cli-1/pharn-run/`). §1's values come from those files, collected on 2026-10-26 by the protocol's
script, and §1.1's from the starter worktree's git history, 7.1.1's entry check and its isolation check. `B` =
`~/Projects/pharn-measure/cli-2/transcripts/50eead02-3ca2-4e2e-ade7-37d8306eb2de.jsonl` (412 lines), attempt 2's
orchestrator; `Bs`, `Bp`, `Bt`, `Bb` = its spec, plan, test and build agents' transcripts in `50eead02-…/subagents/`
(`agent-ace9744d254fed558.jsonl`, `agent-a5ec103dd16b53f19.jsonl`, `agent-aa91261aad04911b6.jsonl`,
`agent-aa86cb007c8c7c401.jsonl`); `F` = `cli-2/session-facts.json` (485 lines, written by `run-facts.mjs`); `C` =
`cli-2/feature/cost.json`. §4–§7's values were read from those files on 2026-10-26, every `F` value re-checked against
the `B` line it names. Times are the records' own `timestamp` fields (UTC). Free text from any of them is quoted as
data.

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

| attempt                 | PHARN                                                                        | Claude Code                           | orchestrator model                      | Agent params sent                                                                                                                                                             | return kind                                                     | finish first line + exit                                                                              | marker ts − finish clock                                                                                                      | stop state                                                                                                                                                     |
| ----------------------- | ---------------------------------------------------------------------------- | ------------------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 (`cli-1`, 2026-10-26) | 7.1.1, `e4b17048` (§1.1)                                                     | 2.1.310 (156/156 records, e.g. A:113) | `claude-sonnet-5-5` (46/46, e.g. A:121) | spec A:121, plan A:161: `description`, `subagent_type`, `model: "opus"`, `prompt`, all strings; no `run_in_background`                                                        | background-launch notice, both (A:122, A:162)                   | spec `done` 0 (A:128); plan `refused S9` 3 (A:167)                                                    | marker before `finish` call by 17.593 s (A:117→A:127) and 4.928 s (A:146→A:166); `finish` waited 88.733 s and 137.321 s       | `blocked: stage-refused` (S9) at plan, `level-excluded` (A:231, P:144); no `LOOP.md` (close-out human-driven, A:235–272)                                       |
| 2 (`cli-2`, 2026-10-26) | 7.1.1, `e4b17048`; installed bytes equal `e9ba9806`'s product surface (§4.1) | 2.1.310 (226/226 records, F:4–6)      | `claude-sonnet-5-5` (72/72, F:100–102)  | spec B:125, plan B:152, test B:249, build B:277: `description`, `subagent_type`, `model` (`"opus"` ×3, `"sonnet"`), `prompt`, all strings; no `run_in_background` (F:121–242) | background-launch notice, all four (B:126, B:153, B:250, B:278) | spec `done` 0 (B:137); plan `done` 0 (B:165); test `done` 0 (B:255); build `done gate:pass` 0 (B:294) | marker before `finish` call by 8.697, 6.528, 7.221 and 6.718 s; `finish` waited 92.281, 126.141, 249.944 and 114.737 s (§4.2) | `STOP_GREEN_QUICK`, iteration 1 of 3 (B:340); `LOOP.md` written; committed `f87dd005` on `pharn-loop/merge-legal-into-company` (B:406, `cli-2/head-after.txt`) |

### What changed between attempts

| attempt | preparation                                                                                                                                                                                                                                                      | what it did                                                                                                                                                                 |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1       | `gates.exclude` gained `test` (its suite ran past 540 s at prep); no `settings.local.json`                                                                                                                                                                       | every criterion was `unit`-level, so the plan agent's AC check printed `level-excluded` and the run stopped S9 at plan (§1.3); the SPEC-revert setter was denied            |
| 2       | `test` back in the entry set, its script narrowed to the directories of attempt 1's three AC test files and the code they cover (`0f319b1a`); two wildcard allow rules for the setter and `reconcile-baseline.mjs` in `.claude/settings.local.json` (`7b26eded`) | spec, plan, grill, test, build and verify ran (`--quick` skips regress's base comparison), the stop was `STOP_GREEN_QUICK` after one iteration, and no call was denied (§4) |

The same in both: PHARN 7.1.1's product bytes, the worktree base `9c6343b7`, the intent, the flags `--quick
--accept-host-execution`, an interactive `claude --permission-mode auto` session, Claude Code 2.1.310, and the
`allowed-tools` grants in the installed commands, the `TaskStop` grant included.

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

## 4. Attempt 2 (2026-10-26)

### 4.1 The base

- **Worktree** `~/Projects/pharn-starter-6.72`, detached at `18c6e5ec`: pharn-starter `9c6343b7` plus `ee1458c3`
  (PHARN 7.1.1: pharn-cli 0.14.1 `pharn update --ref main --yes --force`, `main` = `e4b17048`; `pharn.config.json`
  records `skillsVersion: 7.1.1` and that commit), `0f319b1a` (the narrowed `test` script), `7b26eded` (the two allow
  rules) and `18c6e5ec` (`START.md`, `RUN-PROTOCOL-interactive.md`). Local only, never pushed. The CLI takes no
  branch, so the install was checked by bytes: all 584 installed PHARN files under `pharn/` and
  `.claude/{commands,hooks,agents}` equal this record's branch at `e9ba9806` (0 differ), which changes no product
  byte (the protocol's "The install").
- **Entry gates at preparation** (7.1.1's entry check on the prepared tree, gates in sequence, nothing else running):
  `lint` 14.0 s, `format:check` 14.0 s, `base:test` 528.5 s (green, evidence only), `test` 3.0 s (26 tests),
  `typecheck` 23.0 s; total 582.5 s, `status: green` (the protocol's "The entry gates").
- **The session:** Claude Code `2.1.310` on all 226 versioned records (F:4–6), entrypoint `cli` (F:7–9), permission
  mode `auto` on every `permission-mode` record (F:10–99), orchestrator `claude-sonnet-5-5` on all 72 main-thread
  assistant records (F:100–102). The Agent tool as offered (B:26, F:103–120): `description, prompt, subagent_type,
model, effort, isolation`, no `run_in_background`, shape hash `a26adb59…` — the list and hash of §0.1 and §1.1.
  `claude --version` at collection: 2.1.310. Isolation witness `HOST`, host execution accepted (B:372).

### 4.2 The four Agent calls — the wait data

No start line carried `--no-foreground-agent` (B:119, B:147, B:244, B:270), so every stage the policy routes was
routed: spec, plan and test `agent:opus`, build `agent:sonnet` (markers 2, 4, 8, 10). Grill and verify ran inline.

| what                                        | spec                                                                            | plan                                      | test                                      | build                                               |
| ------------------------------------------- | ------------------------------------------------------------------------------- | ----------------------------------------- | ----------------------------------------- | --------------------------------------------------- |
| stage-start marker `ts`                     | 11:20:53.273Z (B:121, marker 2)                                                 | 11:22:41.573Z (B:148, marker 4)           | 11:30:45.138Z (B:245, marker 8)           | 11:35:15.261Z (B:271, marker 10)                    |
| Agent call (after the marker)               | 11:20:58.433Z, B:125 (+5.160 s)                                                 | 11:22:44.545Z, B:152 (+2.972 s)           | 11:30:48.967Z, B:249 (+3.829 s)           | 11:35:18.110Z, B:277 (+2.849 s)                     |
| parameters sent, JSON type                  | `description`, `subagent_type`, `model: "opus"`, `prompt` — all strings         | the same                                  | the same                                  | the same, `model: "sonnet"`                         |
| `run_in_background` sent                    | no                                                                              | no                                        | no                                        | no                                                  |
| return kind                                 | "Async agent launched successfully." (B:126, 0.675 s)                           | the same (B:153, 0.708 s)                 | the same (B:250, 0.731 s)                 | the same (B:278, 0.666 s)                           |
| agent's own record                          | `requestShape: "background"`, `finished: true` (`Bs`'s `.meta.json`)            | the same (`Bp`)                           | the same (`Bt`)                           | the same (`Bb`)                                     |
| `finish` run after it                       | B:131, `--budget-ms 570000`, Bash `timeout` 600000                              | B:159, the same                           | B:254, the same                           | B:293, the same, `--iteration 1`                    |
| `finish` call − marker `ts`                 | +8.697 s                                                                        | +6.528 s                                  | +7.221 s                                  | +6.718 s                                            |
| agent's `report` call                       | 11:22:32.788Z, `--status done` (Bs:131)                                         | 11:24:52.945Z, `--status done` (Bp:141)   | 11:35:01.376Z, `--status done` (Bt:237)   | 11:37:15.914Z, `--status done --gate pass` (Bb:150) |
| `finish` returned                           | 11:22:34.251Z (B:137): 92.281 s after its call, 1.463 s after the `report` call | 11:24:54.242Z (B:165): 126.141 s, 1.297 s | 11:35:02.303Z (B:255): 249.944 s, 0.927 s | 11:37:16.716Z (B:294): 114.737 s, 0.802 s           |
| `finish` first line, exit                   | `done`, 0                                                                       | `done`, 0                                 | `done`, 0                                 | `done gate:pass`, 0                                 |
| `waiting` / `wait-unanchored` / `no-result` | none printed                                                                    | none printed                              | none printed                              | none printed                                        |
| return marker                               | marker 3 `orchestrator` 11:22:33.785Z                                           | marker 5, 11:24:54.036Z                   | marker 9, 11:35:02.277Z                   | marker 11, 11:37:16.692Z                            |
| Claude Code's completion notice (queued)    | 11:22:46.183Z (B:157), 11.932 s after `finish` returned                         | 11:25:06.406Z (B:180), 12.164 s           | 11:35:16.722Z (B:275), 14.419 s           | 11:37:24.090Z (B:305), 7.374 s                      |

**All four calls went to the background, and `finish` waited each one out.** Each `finish` stayed in one call (no
exit 5, no re-run), found its agent's result on disk 0.8–1.5 s after that agent's `report` call, and wrote the return
marker 7–14 s before Claude Code queued its own notice. Every marker preceded its `finish` call (6.5–8.7 s), written
by `start` on the same host, so no wait read `unanchored`. Each result is bound to its own agent by that agent's
`report` line in its own transcript, and `start` removed any leftover before each spawn. The longest wait was the test
stage's 249.9 s; the 570 s per-call budget and the cap (`FINISH_WAIT_CAP_MS`) were not approached. `TaskStop` was never called (it appears only in the session's tool listings,
B:28, B:37), so whether it reaches a background agent is still unmeasured.

### 4.3 How the run stopped

- **Entry gates** (`entry-gates.mjs --wait`, B:237–238, 11:25:37.740Z → 11:30:36.203Z, 298.463 s by C's
  `entry_events`): `status: green`, exit 0, `unmeasured: []`, `red: []`, excluded `build`, `e2e`. `base:test` exit 143,
  `timed_out: true`; the other four exit 0. Finding (a) is about this (§7).
- **Grill** inline (marker 6 → 7, 11:25:05.669Z → 11:25:32.930Z). **Verify** inline through `stage-direct.mjs`
  (B:312 exit 5 `continue` at 11:38:02Z, `--resume` B:328 exit 0 at 11:38:13Z): `PASS`, six gates all exit 0
  (`format:check`, `instruction-growth`, `lint`, `reconcile`, `test`, `typecheck`; `cli-2/feature/verify-report.json`),
  `build` and `e2e` excluded. Freshness `FRESH` (B:334–335).
- **The stop:** `check-loop.mjs` → `STOP_GREEN_QUICK`, iteration 1, cap 3, verify `PASS`, no regression verdict read
  (B:339–340). The closeout (B:395–396): the record check and the decision re-derivation GREEN, marker 14 `run-stop`
  11:39:06.148Z, the cost ledger rendered. The final message (B:406) names the branch and the commit; at collection
  `branches-after.txt` lists `pharn-loop/merge-legal-into-company` and `head-after.txt` is
  `f87dd005a08b099df0dc02b606911072b02ebcfb`, whose parent is the run's base `18c6e5ec`. No question was asked.
- **Permission denials: none.** `F:482` is `"denials": []`, and a grep of all five transcripts for the classifier's
  denial text finds none. Finding (b) is about this (§7).

### 4.4 Attempt 3: not needed

The protocol's condition (read from `F` only): attempt 3 runs only if no Agent call returned an async-launch notice.
All four did (`F` `agent_calls[].return.async_launch: true`, F:148, F:178, F:208, F:238), so attempt 3 did not run and
the installed `pharn-loop.md` was never edited.

## 5. The verdict: RESOLVED (measured), on one run

**On Claude Code 2.1.310 the interactive CLI launched every stage agent in the background with no
`run_in_background` sent — six Agent calls in two attempts (§1.2, §4.2) — and `finish --budget-ms` waited each one
out. One run completed: attempt 2, PHARN 7.1.1, `/pharn-loop --quick`, four stage agents, `STOP_GREEN_QUICK`.** So
the residual `stage-agent-background` is HANDLED by THE WAIT, not gone: the harness still launches in the background,
and PHARN now waits. A harness that changes the default again changes nothing in PHARN, because `finish` runs after
every Agent call whichever way it was launched. Headless `claude -p --permission-mode auto` is the other measured
path: its stage agents ran in the foreground (PHARN 6.73.2, the JSON boolean `false` sent;
`loop-wall-clock-2026-10-25.md` §9), and neither of its two runs completed a loop (both stopped at the entry check).

What one run does not show: a stage longer than one 570 s budget (exit 5 and a re-run), the cap, whether `TaskStop`
reaches a background agent, another Claude Code version, or a full (not `--quick`) loop. The 7.1.1 rule that sends a
stage inline when the Agent tool lists no `run_in_background` (`--no-foreground-agent`) was applied in none of the six
routed start lines; whether it stays is the follow-up `loop-foreground-default-prose`.

**Follow-ups of `stage-agent-background-wait`** (`.dev/features/stage-agent-background-wait/SHIP.md`, unchanged):

- `loop-background-wait-measure` — **closed by measurement** (§1.2, §4.2), except its "does TaskStop reach it", which
  neither attempt exercised and which goes with `taskstop-grant-scope`.
- `taskstop-grant-scope` — **remains.**
- `anchor-clock-skew` — **remains, not observed:** all six markers preceded their `finish` call by 4.9–17.6 s on one
  host. That shows the skew did not occur here, not that it cannot.

## 6. Absolute cost of one `--quick` loop

The 2026-10-05 labels (`loop-wall-clock-2026-10-05.md`, "Labels"): source `R` = this real run (attempt 2), `S` =
static files; precision `m` = measured, `e` = an estimate from measured numbers, with its formula. Token classes are
kept separate, and nothing is priced. Every figure is from C unless another source is named. C is a **floor** on the
run's spend, not the total: coverage `partial`, 8 session requests outside the run excluded, the request that opened
the window and any other session's requests not in it (C's `coverage_note`). Not comparable with the 2026-10-05 or
2026-10-25 runs (other PHARN versions, full mode, other entry sets); no deltas are given.

- **Outcome:** `STOP_GREEN_QUICK`, iteration 1 of 3, committed to a local branch [R·m].
- **Requests:** 104, deduplicated on `requestId` [R·m].
- **Run window:** 1,098.056 s (18.3 min), marker 1 `run-start` 11:20:48.092Z → marker 14 `run-stop` 11:39:06.148Z
  (C's `membership`) [R·m]. The session's first record was 45.5 s before marker 1 and its last 12.9 s after marker 14
  (F:483–484), outside the window.
- **Processed context tokens: 11,190,436** [R·m, the sum of the four classes]:

  | class            | tokens     |
  | ---------------- | ---------- |
  | input (uncached) | 208        |
  | cache write, 5 m | 411,635    |
  | cache write, 1 h | 60,478     |
  | cache read       | 10,718,115 |

- **Output tokens: 49,873**, of which `output_thinking` 9,081 is a part, not an extra class [R·m].
- **By model** [R·m]: `claude-opus-5-5` 61 requests, 5,994,546 processed, 35,502 output; `claude-sonnet-5-5` 43
  requests, 5,195,890 processed, 14,371 output.
- **Per context, and the model each was served** (C's `requests[].agent_id` and `.model`) [R·m]:

  | context              | served              | requests | processed | output |
  | -------------------- | ------------------- | -------- | --------- | ------ |
  | orchestrator         | `claude-sonnet-5-5` | 28       | 3,814,813 | 7,904  |
  | spec agent           | `claude-opus-5-5`   | 17       | 1,524,799 | 6,537  |
  | plan agent           | `claude-opus-5-5`   | 17       | 1,600,430 | 9,145  |
  | test agent           | `claude-opus-5-5`   | 27       | 2,869,317 | 19,820 |
  | build agent (iter 1) | `claude-sonnet-5-5` | 15       | 1,381,077 | 6,467  |

  Each agent was served the model its route requested. C's per-stage buckets differ by one request per agent: the
  ledger attributes a request to the latest marker at or before it, and each agent's last request came after `finish`
  had written the return marker, so it lands in the next bucket (for example the test agent's 11:35:15.709Z request
  in `pharn-build`).

- **Per-stage wall clock**, stage-start marker → return marker (C's `executions`) [R·m]: spec 100.5 s, plan 132.5 s,
  grill 27.3 s (inline), test 257.1 s, build 121.4 s, verify 48.7 s (inline); 687.5 s in all. The entry `--wait` call
  took 298.5 s, between grill and test. The remaining 112.1 s is the orchestrator's own turns, routing and the stop
  procedure [R·e, 1,098.1 − 687.5 − 298.5].
- **Gates:** at entry `lint`, `format:check`, `test`, `typecheck` exit 0, `base:test` killed at its 540 s timeout
  (exit 143, evidence only); at verify six gates exit 0 (6 required, 6 executed, 0 reused; C's `work`). Excluded
  throughout: `build` and `e2e` (`pharn.config.json` `gates.exclude`). Regress's base comparison does not run under
  `--quick`; its scope check does [R·m].

## 7. Attempt 2's findings — proposed, not built

**(a) The entry check reported `base:test` killed at its timeout, exited 0 and listed nothing unmeasured, and the loop
went on. That is the 6.75.0 rule working as written, not a gap in it.** CHANGELOG [6.75.0] says "The `base:test`
slot is never listed", and `entry-gates-core.mjs` `entryVerdict` filters it out of `unmeasured`
(`unmeasuredRuns(stamp).filter((u) => u.id !== ENTRY_BASE_TEST_ID)`): the slot is evidence for regress, never a gate
the run stops on, and a timed-out slot is already refused as reusable base evidence. What attempt 2 does show is a
cost:

- `entry-gates.mjs --start` takes no mode, so a `--quick` run schedules the slot although `--quick` skips regress's
  base comparison, its only reader.
- The runner runs the gates in sequence with the slot third: `test` started at 11:30:28.302Z and took 1.85 s
  (`cli-2/pharn-run/pharn-entry/gates/3-test.*`), so the slot occupied about 540 s of the runner's 582.7 s [R·e,
  582.7 − the other gates' time]. At preparation the same slot passed in 528.5 s with nothing else running; here it
  ran beside the spec, plan and grill stages and was killed at 540 s [R·m, the two figures; the cause of the difference
  is not measured].
- The orchestrator's `--wait` call lasted 298.5 s, 27% of the run window [R·m]. Without the slot the runner would
  have ended well before grill did [R·e: the four attributable gates took about 42.7 s here (582.7 − 540) and 54 s at
  preparation], so most of that wait was spent on evidence nothing read.

Proposed: `/pharn-loop --quick` and `/pharn-ship --quick` start the entry runner without the `base:test` slot (a
flag on `--start`, recorded in the stamp, so an offer from such a run is visibly slot-less), and a full run puts the
slot after the attributable gates so they are measured first. Trigger (P7): this run.

**(b) With the two allow rules present, no pinned line was denied.** 14 Bash calls ran the writes-scope setter or
`reconcile-baseline.mjs`: 3 in the orchestrator (B:210, B:224, B:366) and 11 in the four stage agents (`Bs:50`,
`Bs:124`, `Bp:39`, `Bp:116`, `Bp:134`, `Bt:43`, `Bt:199`, `Bt:236`, `Bb:45`, `Bb:130`, `Bb:143`). They include the
build's `--from-plan` with `--anchor` (Bb:45) and the record setter with `--amend-scope` in one compound call
(B:366), the pinned pair whose compound form was denied in attempt 1. None was denied (`F:482`; the grep of all five
transcripts). For the grant-list finding (§1.4(b)) this answers only one branch:

- "Still denied, so no grant wording helps": did not happen.
- It does not show that the commands' own exact `allowed-tools` grants would have sufficed: the rules present were
  the operator's wildcards in `settings.local.json`, which pre-approve every argument form of the two scripts.
- It is consistent with an allow rule deciding a call before the classifier sees it, and does not prove it: no call
  ran without the rules in attempt 2, and attempt 1's denied call had another shape (a `cd` prefix and a `sed`).

Proposed: name those two operator allow rules, with their breadth, as an option in the `/pharn-loop` docs (a human
decision, since it widens what runs unprompted); and measure the exact grants alone (no `settings.local.json`) before
rewording any grant or telling the orchestrator to send each pinned line as its own call.

**(c) The plan-stage stop for an excluded AC level** is recorded as §1.4(a) (proposed S12b
`blocked: ac-level-excluded`). Attempt 2 did not reach it: `test` was in the entry set. Nothing new to record.
