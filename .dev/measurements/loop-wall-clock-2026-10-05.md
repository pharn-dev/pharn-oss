# Where a 92-minute `/pharn-loop` run spent its time, in a user project (2026-10-05)

A measurement record for the 2026-10-05 batch ("make `/pharn-loop` fast"). It covers three real `/pharn-loop` runs in
the user project `pharn-starter`, all on PHARN **6.35.0**:

- `billing-plan-catalog`, 2026-10-05, **91.75 minutes**, the run this record is mostly about;
- `workspace-wording-ui`, 2026-09-30, 33 minutes;
- `locales-en-pl-only`, 2026-09-30, `--quick`, 27.5 minutes.

All three ended `INCONCLUSIVE`. Later PRs in the batch cite this file.

- **Written by:** the `build-writes-through-tools` increment (batch item 9). Plan, grill and the investigation are in
  `.dev/features/build-writes-through-tools/`.
- **Changes:** nothing in pharn-starter. Every figure was read on 2026-10-05, read-only.

## How the figures were made

Every figure comes from one read-only helper. It prints one JSON document and writes nothing:

```text
node .dev/features/build-writes-through-tools/measure.mjs \
  --starter ~/Projects/pharn-starter \
  --projects ~/.claude/projects/<pharn-starter's project key> \
  --feature billing-plan-catalog --other workspace-wording-ui --other locales-en-pl-only
```

The helper's header defines each section, and each table below names the section it comes from. A figure taken by
hand is marked as such and says where it was read.

**The inputs are machine-local and perishable.**

- **Ledgers.** `pharn/features/<name>/cost.json` (schema `pharn-cost-ledger/2`, membership `run-window/2`, with the
  6.35.0 `executions` and `work` keys).
- **Claude Code transcripts.** The orchestrator's session file and its `subagents/agent-*.jsonl`. These exist only
  for the 92-minute run. The two 2026-09-30 runs' transcripts are **absent** on disk, so their figures come from
  their ledgers alone.
- **`.pharn/` logs and stamps.** Only `.pharn/pharn-verify/gates/` still belongs to the 92-minute run (see section
  5).

A re-run later may not reproduce these figures, and none is claimed reproducible.

### Labels (the audit's convention, `pipeline-performance-audit-2026-09-29.md`)

Each figure carries a source and a precision, never one mixed label.

- **Source:**
  - `R` — the real user runs above. It is the first post-optimization workload measured: the 2026-09-29 audit had
    none.
  - `S` — static: files in pharn-starter as they are on 2026-10-05, after the runs.
- **Precision:**
  - `m` — measured;
  - `e` — an estimate derived from measured numbers, with its formula.
- Token classes are kept separate, and no figure is priced.

## 1. The answer, in one paragraph

The 92-minute run splits like this:

- about **55 minutes in five model-driven stage agents**;
- **19 minutes waiting for the human**;
- **12 minutes in `/pharn-regress`**;
- **4 minutes in `/pharn-verify`**;
- **1.4 minutes of orchestrator time between stages** [R·m].

Inside the stage agents:

- model requests take about 38.6 minutes of the 55 [R·m];
- the requests are many and short: 289 requests, median 3.3–4.9 s of model time each [R·m];
- every fresh agent first writes a prefix of about 302k tokens to the cache [R·m];
- about half that prefix is the project's own instruction files, 634,379 B attached to every agent [R·m, the token
  share R·e].

The build agent spent 7.8 minutes blocked on the project's own test suites [R·m].

It also wrote the user's code through 49 shell commands and no Edit call [R·m]. So the writes-scope guard checked
none of those writes (section 7).

All three runs stopped on conditions present before the run began (section 9). Two corrections to the batch's own
evidence are in section 8.

## 2. The 92-minute run, by bucket

The run window runs from the run-start marker (08:38:43.043Z) to the run-stop marker (10:10:28.140Z), 5,505.1 s.
Helper section `buckets`:

- the window is partitioned by the ledger's markers;
- each `AskUserQuestion` wait is subtracted from the marker interval it falls in.

All `[R·m]`.

| bucket                                                    |           s |       min |
| --------------------------------------------------------- | ----------: | --------: |
| human wait (two `AskUserQuestion`s: 1,121.0 s and 24.8 s) |     1,145.8 |      19.1 |
| routed stage agents (spec, plan, grill, test, build)      |     3,310.1 |      55.2 |
| `/pharn-regress` (both runs, waits excluded)              |       714.4 |      11.9 |
| `/pharn-verify` (wait excluded)                           |       249.1 |       4.2 |
| orchestrator between a stage's return and the next start  |        85.7 |       1.4 |
| **total**                                                 | **5,505.1** | **91.75** |

### By stage (helper `stages`: marker to next marker, the ledger's `stage-start-to-return/1` method)

| stage                | route          | start (Z) | elapsed s | note                                                               |
| -------------------- | -------------- | --------- | --------: | ------------------------------------------------------------------ |
| spec                 | `agent:opus`   | 08:38:50  |     211.1 |                                                                    |
| plan                 | `agent:opus`   | 08:42:28  |     658.3 |                                                                    |
| grill                | `agent:opus`   | 08:53:32  |     361.0 |                                                                    |
| test                 | `agent:opus`   | 08:59:48  |     538.3 |                                                                    |
| build (iteration 1)  | `agent:sonnet` | 09:08:54  |   1,541.4 |                                                                    |
| regress, run 1       | inline         | 09:34:40  |   1,166.1 | refused `scope-escaped` in 1.1 s, then the human wait, then a `mv` |
| regress, run 2       | inline         | 09:54:06  |     669.3 | verdict `regressions`                                              |
| verify               | inline         | 10:05:23  |     273.9 | stopped after its first gate; includes a 24.8 s wait               |
| orchestrator, 8 gaps | —              | —         |      85.7 | each 4.6–31.0 s                                                    |

## 3. Requests, latency and prefix size, per context

Helper `contexts`, from `cost.json`'s rows. Token figures are the ledger's. Gaps are between consecutive request
timestamps in one context. All `[R·m]`.

| context                 | served model (requests)   | requests |  span s | gap median / mean s | first-request prefix (cache write + read) | largest context | output |
| ----------------------- | ------------------------- | -------: | ------: | ------------------: | ----------------------------------------- | --------------: | -----: |
| orchestrator (main)     | `claude-opus-5-5` (52)    |       52 | 5,502.5 |         4.9 / 107.9 | 434,842 (753 + 434,087)                   |         501,349 | 21,341 |
| spec agent `a8b13c52…`  | `claude-opus-5-5` (22)    |       22 |   182.8 |           4.8 / 8.7 | 304,974 (304,972 + 0)                     |         359,319 |  6,192 |
| plan agent `a8c71c89…`  | `claude-opus-5-5` (55)    |       55 |   646.1 |          5.9 / 12.0 | 302,208 (265,983 + 36,223)                |         467,783 | 11,431 |
| grill agent `ad4ac1d5…` | `claude-opus-5-5` (41)    |       41 |   347.9 |           5.2 / 8.7 | 302,208 (265,983 + 36,223)                |         425,373 |  6,326 |
| test agent `a8d29159…`  | `claude-opus-5-5` (45)    |       45 |   526.1 |          6.9 / 12.0 | 302,207 (265,982 + 36,223)                |         435,782 | 31,169 |
| build agent `acb4f6f8…` | `claude-sonnet-5-5` (126) |      126 | 1,526.6 |          5.0 / 12.2 | 302,869 (302,867 + 0)                     |         660,456 | 11,565 |

- **289 stage-agent requests** (22 + 55 + 41 + 45 + 126) [R·m].
- **The first request of every stage agent carries about 302k tokens** (302,207–304,974). Most of that is a cache
  write, because a fresh agent shares no cache with its parent beyond a ~36k-token reusable part, seen in three of
  the five [R·m].
- **The project's instruction files are a large part of that prefix.** The harness attached the same 16 files to
  every stage agent, 634,379 B in total (helper `instructions`) [R·m]:
  - `CLAUDE.md`, 418,456 B;
  - 14 `.claude/rules/*.md`, 213,290 B;
  - `MEMORY.md`, 2,633 B.

  At 4 bytes per token that is about 159k tokens, roughly half the prefix [R·e, 634,379 / 4]. The bytes-per-token
  ratio is an estimate, never a measurement (`LIMITS.md §1c`).

- **The orchestrator was served opus** in every one of its 52 requests [R·m]. Its first request carried 434,842
  tokens, and its context grew to 501,349.

**The two 2026-09-30 runs (ledger only).** All `[R·m]`:

| run, context                        | served model |          requests | gap median / mean s | first-request prefix | largest context |
| ----------------------------------- | ------------ | ----------------: | ------------------: | -------------------: | --------------: |
| workspace-wording-ui, main          | sonnet       |                33 |          3.4 / 61.7 |              325,304 |         373,225 |
| — spec / plan / grill / test agents | opus         | 25 / 37 / 33 / 40 |   4.7–6.1 / 7.4–8.7 |      288,505–289,269 | 331,915–374,891 |
| — build agent                       | sonnet       |                54 |          5.9 / 14.6 |              288,698 |         443,567 |
| locales-en-pl-only, main            | opus         |                32 |          5.3 / 53.1 |              408,969 |         443,765 |
| — spec / plan / test agents         | opus         |      13 / 30 / 20 |   3.8–4.7 / 4.8–7.0 |      288,489–288,542 | 317,432–354,051 |
| — build agent                       | sonnet       |                56 |          5.5 / 11.6 |              288,601 |         383,335 |

## 4. Model time and tool time inside each context (92-minute run)

Helper `timing`, from the transcripts. Requests are grouped by `requestId`.

- **Model time** of a request runs from the last user or tool-result entry before its first line to its last line.
  It is the request's whole latency: queueing, prefix processing and generation.
- **The time after a request**, up to the next request's input, is attributed to the tools that request called.

All `[R·m]`.

| context      | requests | model time: total s (median / mean / p90 per request) | after-request time by tool, s                                    |
| ------------ | -------: | ----------------------------------------------------- | ---------------------------------------------------------------- |
| orchestrator |       52 | 227.7 (3.1 / 4.4 / 6.0)                               | Agent 3,254.1 · AskUserQuestion 1,145.9 · Bash 874.3 · other 2.5 |
| spec agent   |       22 | 169.2 (3.6 / 7.7 / 22.7)                              | Bash 14.1 · writes 2.2                                           |
| plan agent   |       55 | 603.7 (4.9 / 11.0 / 25.7)                             | Bash 43.0 · writes 2.6                                           |
| grill agent  |       41 | 317.8 (4.0 / 7.8 / 22.0)                              | Bash 33.2 · Read/Write 0.9                                       |
| test agent   |       45 | 447.5 (4.3 / 9.9 / 28.5)                              | Bash 77.4 · Write 2.6 · Edit 2.4                                 |
| build agent  |      126 | 775.9 (3.3 / 6.2 / 12.2)                              | Bash 751.7 · Read/Write 1.7                                      |

- **Model time across the five stage agents is 2,314.1 s (38.6 min)** of their 3,310.1 s [R·m]. Tools take about
  930 s; the rest is spawning and the orchestrator's route/read lines [R·e, the remainder].
- **The build agent's Bash time includes 7.8 min blocked on the project's own suites** (helper `long_bash`). Three
  calls [R·m]:
  - 116.5 s waiting on a backgrounded full `vitest run`;
  - 96.3 s waiting on a backgrounded `test:db`;
  - 256.1 s for `npm run test` then `npm run test:db`, run back to back.

## 5. Gates: what still belongs to this run, and what does not

Helper `gates` and `scripts`.

- **`.pharn/pharn-regress/` does NOT belong to the 92-minute run.** Its `head/` and `base-gates/` stamps record
  feature `billing-remove-seats` at head `5780e2d1`, with mtimes from 11:03 to 11:14Z [R·m]. That is a later regress
  run, after this run's stop at 10:10Z, and it overwrote this run's regress logs. The per-gate durations those
  files show belong to that run, not to this one.
- **This run's regress, measured from its five `stage-regress.mjs` calls** [R·m], each with a 540 s timeout and a
  570 s budget:

  | call (Z) | seconds | exit                           |
  | -------- | ------: | ------------------------------ |
  | 09:34:45 |     1.1 | `refused`, `scope-escaped`     |
  | 09:54:05 |   134.3 | `continue`, phase `drain-head` |
  | 09:56:21 |   188.0 | `continue`, phase `install`    |
  | 09:59:32 |   146.2 | `continue`, phase `drain-base` |
  | 10:02:00 |   192.1 | `done`, verdict `regressions`  |

  Around those calls:

  - The base-commit `npm ci` took **17.1 s** (the ledger's `work` row, `install.ms` 17,128) [R·m].
  - The head and base sides each ran 3 gates (`test`, `typecheck`, `build`), none reused (`work`, BASE `fresh`,
    miss `no-record`) [R·m].
  - **The per-gate split of the four calls is an inference, not a measurement** [R·e]. A call starts its first slow
    step unconditionally, and a second only while elapsed + 540 s ≤ 570 s, i.e. within its first 30 s. The exits
    above are consistent with:
    - call 2: the head `test`;
    - call 3: head `typecheck` + `build`;
    - call 4: the worktree, the install and the base `test`;
    - call 5: base `typecheck` + `build`.
  - So the run paid **4 orchestrator round trips** for one regress. The verdict: `typecheck` regressed (exit 0 at
    base, 1 at head) and `build` was red at both [R·m].

- **This run's verify** [R·m]:
  - one `stage-verify.mjs` call, 164.2 s, exit `continue` at phase `drain`;
  - its gate state still on disk names this feature and head `42d419cd`. It ran 1 of its 6 required gates (`test`,
    exit 0), and its `completeness` capture is `1`;
  - **`test` took about 156 s**: from `completeness.json`'s mtime 10:05:33.666Z to `0-test.out`'s 10:08:09.479Z
    [R·e, an mtime difference];
  - `e2e`, `build`, `typecheck`, `lint`, `format:check` and `reconcile` never ran.

## 6. Hooks

Helper `hooks`: the harness's own `durationMs` per hook run, inside the run window. All `[R·m]`.

- **The project's PostToolUse hook ran 47 times**, once per Write or Edit across all six contexts.
  - Each run took 88–183 ms; together, 4,957 ms.
  - Its command is `npm run tsc`, and the project has no `tsc` script [S·m]. So every run exited 1 ("Missing
    script"), non-blocking.
- **In the test agent:** 36 runs, 88–153 ms each, 3,483 ms in total.

## 7. How the build agent wrote files

Helper `writes`, over the transcript's tool calls. The shell-write test is a heuristic over the command TEXT:

- `open(…, 'w')` in a `python3` heredoc;
- `sed -i`;
- `cat > <path>`;
- `prettier --write`.

Each call's targets are listed in the helper's output for audit. All `[R·m]`.

**Tool use and write mechanism, per agent:**

| agent | tool calls                            | Bash calls that wrote project files                                    |
| ----- | ------------------------------------- | ---------------------------------------------------------------------- |
| build | Bash 126 · Read 4 · Write 2 · Edit 0  | **49**: see the mechanism list below                                   |
| spec  | Bash 20 · Write 2 · Edit 1            | 0                                                                      |
| plan  | Bash 54 · Write 2 · Edit 1            | 0 (its one shell write is a scratch file under the session scratchpad) |
| grill | Bash 38 · Read 3 · Write 1            | 0                                                                      |
| test  | Bash 35 · Read 3 · Write 18 · Edit 18 | 0                                                                      |

The build agent's 49 shell writes, by mechanism:

- 44 `python3` scripts, ten of them also running `prettier --write`;
- 2 `cat >` heredocs, one with a `sed -i`;
- 1 `sed -i` alone;
- 2 `prettier --write` alone.

**Where those writes went, against the scope in force at each write.** The scope comes from the agent's own setter
calls: `--from-plan` printed 93 entries at 09:09:07Z; `--target` gave `BUILD.md` at 09:33:58Z.

- **78 targets were inside the scope.**
- **1 was a pinned AC test,** `features/files/services/__tests__/billing-plan-catalog-upload-no-limit.test.ts`:
  - the agent ran `npx prettier --write features/files app/api/files` at 09:18:10Z, a formatter over two
    directories, and it reformatted the file;
  - the agent's own `check-test-stage.mjs` printed `RED lock-red` 16 s later;
  - a `python3` script then tried formatting reversals until the file's sha256 matched the lock (09:19:37Z);
  - `check-test-stage.mjs` read `READY` at 09:19:41Z.
- **5 targets were directory or glob arguments to `prettier --write`.** These are the reach the rule in this
  increment removes.
- **2 calls named no literal target.** One writes `/tmp/changed.txt`; the other formats that list through
  `xargs -0`.

**What preceded the first shell write (09:09:59Z).**

- **No Write, Edit or MultiEdit call.** The agent's first Write came at 09:26:21Z and was allowed.
- **The harness's `auto_mode` attachment** (`bashFirst: true`, `bashFirstSteer: "relaxed"`) arrived at
  09:09:00.830Z, rendered as a system reminder. It offers `sed`, heredocs and short scripts for mechanical edits
  instead of Read/Edit/Write, and leaves the choice to the model.
- **Varying the condition:** all five stage agents received the identical attachment, and only the `sonnet` build
  wrote through the shell. So the attachment is not established as the cause. It is the only instruction in the
  agent's context that offered the shell.

## 8. Corrections to the batch brief's evidence (2026-10-05)

Recorded exactly as found, because later PRs cite this file.

1. **Finding 5 is refuted.** The brief said "the test agent paid ~5 min to the project's PostToolUse `npm run tsc`
   hook (9–29 s per Write/Edit)". The hook's own durations total **3.5 s** for that agent (section 6) [R·m].
   - The 9–29 s comes from parallel tool calls. Request `…VQ1tAt` issued 8 Writes. Its input arrived at
     09:03:14.784Z, its tool_use lines were written from 09:03:24.852Z to 09:04:06.589Z as each block finished
     streaming, and all 8 results landed between 09:04:06.762Z and 09:04:07.639Z [R·m].
   - That request's output was 7,261 tokens (ledger) [R·m]. So "tool_use line → tool_result" for its first Write
     measures the model writing the other seven files, not the hook.
   - The test agent made four more requests with 3–10 tool calls each (helper `timing.parallel`).
2. **The regress gate durations in the brief belong to a different run.** "test 2:10, typecheck 0:07, build 3:00;
   npm ci 0:21" are what `.pharn/pharn-regress/` holds now, and that directory belongs to `billing-remove-seats`
   (section 5).
   - The 92-minute run's own regress figures are the four script calls: 134.3 / 188.0 / 146.2 / 192.1 s;
   - its install: 17.1 s;
   - its verify `test` gate: about 2:36.
3. **`CLAUDE.md` was 418,456 B at run time**, not 426 KB: the instructions attachment [R·m]. It is 418,301 B now
   [S·m]. The 14 rules files were 213,290 B at run time [R·m] and are 220,310 B now [S·m].
4. **"41 `python3` one-liners and 27 `sed` calls" does not reproduce.**
   - 45 build Bash calls mention `python3`, and 44 of them write.
   - 54 mention `sed`, but only 2 are `sed -i`; the other 52 are `sed -n` reads [R·m].
   - The total that matters is 49 shell writes and 0 Edits.

## 9. Why each run stopped (the three runs' blocked causes)

From each `LOOP.md` frontmatter (helper `run.loop`, `others.*.loop`) and its body, quoted as DATA. All `[R·m]`.

| run                  |   min | mode  | decision · blocked                    | stopped in | what blocked it                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| -------------------- | ----: | ----- | ------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| billing-plan-catalog | 91.75 | full  | `INCONCLUSIVE` · `unlisted-ask` (S10) | verify     | First, regress refused `scope-escaped`: 4 untracked files of an earlier, abandoned run under `pharn/features/billing-plans-entitlements/`, present before the run. Then a `typecheck` regression: a stale `@sentry/core@10.75.0` in `node_modules` at head, while the base ran on a fresh `npm ci`. `build` was red at both. Last, verify discovers an `e2e` gate the user does not allow locally, and an explicit `--gates` list would make the AC gate read `test-infra-changed`. |
| workspace-wording-ui | 32.99 | full  | `INCONCLUSIVE` · `stage-refused` (S9) | regress    | `scope-escaped`: the user's own uncommitted edit of `shared/components/settings-layout/settings-layout.tsx`, present before the run (it is in the loop's pre-run snapshot). Standing reds outside the plan would also have kept verify red: 2 unit tests and the Sentry `typecheck`.                                                                                                                                                                                                |
| locales-en-pl-only   | 27.49 | quick | `INCONCLUSIVE` · `unlisted-ask` (S10) | verify     | Verify `FAIL`. `test` was red on a file outside the plan that fails at base too, and `typecheck` + `build` were red on the Sentry types, present at base. The user said mid-run not to run `e2e`.                                                                                                                                                                                                                                                                                   |

Each cause existed before the run started:

- a dirty or untracked tree outside the plan (2 of 3 runs);
- gates red at the base commit (3 of 3);
- a discovered gate the user will not run, with no way to exclude it (2 of 3).

## 10. Observations about pharn-starter only (not PHARN changes)

These describe the user's project. This batch changes pharn-oss alone.

- **The project's `CLAUDE.md` is 418 KB**, and it is attached to every stage agent and to the orchestrator's session
  [R·m].
- **`.claude/rules/` holds 14 files** [S·m]:
  - 8 carry `description:` + `globs:` frontmatter;
  - 6 carry none;
  - none carries a `paths:` key.

  All 14 were attached to every stage agent's context [R·m]. The batch brief notes that Claude Code does not read
  `globs:`. This record observes only that no rule file was left out.

- **The PostToolUse hook `npm run tsc` names a script the project does not have** [S·m]. It costs about 0.1 s per
  write and type-checks nothing (section 6).

## Bounds of this record

- **One run in depth.** The two 2026-09-30 runs have ledgers but no transcripts, so sections 4, 6 and 7 cover the
  92-minute run only.
- **Model time is latency, not generation.** It includes harness queueing and prefix processing.
- **Shell writes are classified from command text.** No command was re-executed, and an unusual write form could be
  missed. Every extracted target is listed in the helper's output for audit.
- **Per-gate regress durations for the 92-minute run are inferred** (section 5), because its logs were overwritten.
