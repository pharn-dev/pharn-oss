# The `pharn-stage` benchmark: one loop per agent type, same feature and base (2026-11-23)

**Status: measured, n = 1 per arm.** CORE-107 (PR #450, 7.19.0) routes every stage agent to the `pharn-stage` type,
whose tool list drops MCP, WebFetch/WebSearch and Skill. Its AC5, a benchmark loop comparison, was never run (Linear
CORE-311). This record runs it: one full `/pharn-loop` with `pharn-stage` and one with `general-purpose`, on the same
measured-project base and the same intent bytes.

- **No stage needed a dropped tool.** No stage agent in either arm called an MCP tool, WebFetch, WebSearch, Skill or
  ToolSearch, and no `pharn-stage` agent tried to reach a tool it lacked. The `general-purpose` agents could reach the
  project's shadcn MCP server: ToolSearch was in their tool list and the seven `mcp__shadcn__*` tools were in their
  deferred list. They never used it, the build stage included. The bound: the feature is a one-line doc-comment
  change, so it gives a build no reason to want a UI-component server (§6).
- **First request: `pharn-stage` 33,011 tokens, `general-purpose` 60,207**, with the same four project instruction
  files and the same memory index in both. So `pharn-stage` is 54.8% of `general-purpose`, a 45.2% smaller first request.
  The CORE-107 probe measured 44.6% in a one-line probe session on 2.1.323.
- **Over the five stages both arms ran** (spec, plan, grill, triage, test), the `general-purpose` arm read 1.79× the
  cache tokens, wrote 1.47× and output 1.39×, and its stage time was 1.20× (864 s against 722 s). That is not the type's
  effect alone. The arms wrote different SPECs (three criteria against four) and did different work in them.
- **Outcome differed, and not because of the type.** The `pharn-stage` arm stopped at the test stage (`INCONCLUSIVE`,
  S9: a "nothing changes" criterion cannot fail before the build, CORE-344). The `general-purpose` arm built the
  change, then stopped `STOP_TERMINAL` at verify. Two reasons: the benchmark's own deletion of the agent definition
  read as a reconcile escape (a defect, CORE-346), and a pinned AC test failed typecheck after the build, which could
  not edit it (CORE-347).
- **Method finding:** a `claude -p` session whose checkout lies under `/private/tmp` loaded **none** of pharn-app's
  project instruction files (`CLAUDE.md`, `.claude/rules/*.md`); the same checkout under `~/Projects/` loaded all four.
  The first attempt at the second arm ran there and is void (§3).

## 1. Setup

| Item               | Run 1 — `pharn-stage`                                                                                          | Run 2 — `general-purpose` (attempt 2)                   |
| ------------------ | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Run by             | CORE-310 (its run 1, the re-run after the reboot)                                                              | this task                                               |
| Checkout           | `~/Projects/pharn-app` (main)                                                                                  | detached worktree `~/Projects/pharn-measure/core-311/…` |
| Base SHA           | `8c896454c7ba7761b95625dc2062a5f4c9a5a253`                                                                     | the same                                                |
| Installed PHARN    | skillsVersion 7.22.0, pharn-cli 0.21.1                                                                         | the same files                                          |
| Intent             | `intent.md`, 1,003 B, sha256 `e1f51cdf…96392ba0`                                                               | the same file, sha256 checked before launch             |
| Launch             | `claude -p --permission-mode auto --output-format json "/pharn-loop --accept-host-execution $(cat intent.md)"` | the same line, cwd and run directory changed            |
| Claude Code        | 2.1.328                                                                                                        | 2.1.328                                                 |
| Start → stop (CET) | 11:39:33 → 11:56:28                                                                                            | 14:14:48 → 14:54:21                                     |
| 1-minute load      | 9–70 over the run                                                                                              | 18–113 over the run (other projects' test runs)         |
| Agent definitions  | `.claude/agents/pharn-stage.md` present                                                                        | **deleted before the session started — the one axis**   |

Made equal on purpose in run 2's worktree:

- **The dirty set.** Every path in run 1's pre-run snapshot, copied from pharn-app's working tree: `skills-lock.json`
  and the untracked `.agents/skills/…`, `.claude/skills/security-audit` and `.codex/agents/…`. Run 2's
  `git status --porcelain -uall` equalled run 1's snapshot plus `D .claude/agents/pharn-stage.md`.
- **The local files the session and gates read.** `.claude/settings.local.json` (it enables the shadcn MCP server),
  `.env.local`, `next-env.d.ts`, `tsconfig.tsbuildinfo` and `.pharn/seam-config.json`. `node_modules/` was an APFS
  clone. The two secret-bearing copies were deleted once the evidence was taken.
- **What the session loaded.** Both orchestrators loaded the same five instruction records: the project `CLAUDE.md`,
  three `.claude/rules/*.md` and the same auto-memory index. Their first requests were 104,319 and 104,555 tokens.
  Run 2's session listed `general-purpose` and no `pharn-stage`. Its shadcn server connected, with seven tools, the
  same seven run 1's orchestrator had.

Known differences that are not the axis: run 2 ran later and under heavier load; its `pharn/.run/` started empty;
its transcripts sit in a different project directory; both arms started at the same base, but they wrote their own
SPECs and plans. Entry gates ran cold in both arms (§4).

## 2. How the type was selected

`/pharn-loop` Step 5 item 2 requests `subagent_type: "pharn-stage"`. If the Agent tool does not offer that type, or
the call errors without starting an agent, the loop makes the same call with `general-purpose` and writes
`general-purpose (fallback)` after the stage's route token. Nothing in the floor reads the definition at run time.
Claude Code offers a type only when its definition exists when the session starts. Deleting the file in run 2's
worktree before launch therefore made every stage take the documented fallback. No command, hook, config or intent
byte changed.

What happened: run 2's orchestrator made **one** `pharn-stage` call (the spec stage), got an error, and fell back. It
then requested `general-purpose` directly for the other five stages. Every `.meta.json` reads
`agentType: "general-purpose"`, and the loop's summary marks every route `general-purpose (fallback)`. Run 1's five
agents read `agentType: "pharn-stage"`.

## 3. The void first attempt, and the method finding

The first attempt at run 2 (12:15–12:39) ran from a detached worktree under the session scratchpad,
`/private/tmp/claude-501/…`. Its orchestrator and all seven stage agents loaded **one** instruction record, the
auto-memory index. They loaded no project `CLAUDE.md` and no `.claude/rules/*.md`. A one-line `claude -p` probe
then ran from a worktree of the same commit under `~/Projects/pharn-measure/`. That session loaded all four project
files and the memory index. A comparison where one arm lacks the project's conventions is not a one-axis
comparison, so the attempt is void, and a second attempt ran from `~/Projects/`. Its entry `test` gate also hit the
540,000 ms timeout under load 50–84, so it stopped at S14b before the test stage.

**For anyone measuring with a scratch checkout:** on Claude Code 2.1.328 a checkout under `/private/tmp` does not
load its project instruction files. Read each session's `instructions` attachment before trusting the run. The
CORE-107 probe (2026-11-16, 2.1.323) did get the project `CLAUDE.md` in its scratch checkout. Whether the version, the
path or something else changed is not established here.

What the void attempt still shows about tools holds without the instruction files: its seven `general-purpose`
agents had the same 10 tools and 525 deferred tools, and none called a dropped tool. Its figures are in
`measure-output.json` under `run2-general-purpose-attempt1-void` and are not compared.

## 4. Tokens and time

Per stage agent, from each transcript's assistant `usage` (one count per message id). `first` = input + cache write +
cache read of the agent's first request. Wall time is stage-start marker to the orchestrator's return marker
(`cost.json` `markers`).

| Stage  | Arm | Model  | Requests |  First | Cache write | Cache read | Output | Stage time |
| ------ | --- | ------ | -------: | -----: | ----------: | ---------: | -----: | ---------: |
| spec   | ps  | opus   |       19 | 33,350 |      66,839 |  1,034,328 |  6,493 |      102 s |
| spec   | gp  | opus   |       16 | 60,562 |      98,235 |  1,326,814 |  6,795 |      107 s |
| plan   | ps  | opus   |       15 | 33,011 |      70,646 |    848,966 |  8,804 |      103 s |
| plan   | gp  | opus   |       21 | 60,207 |     116,907 |  2,085,488 | 14,863 |      195 s |
| grill  | ps  | opus   |       19 | 33,011 |     149,937 |  1,842,849 | 12,129 |      155 s |
| grill  | gp  | opus   |       23 | 60,207 |     210,928 |  3,628,168 | 17,195 |      218 s |
| triage | ps  | sonnet |       10 | 33,017 |      56,279 |    442,139 |  2,797 |       43 s |
| triage | gp  | sonnet |        8 | 60,213 |      89,329 |    545,247 |  3,435 |       40 s |
| test   | ps  | opus   |       19 | 33,010 |      93,992 |  1,321,253 |  8,466 |      319 s |
| test   | gp  | opus   |       22 | 60,206 |     128,874 |  2,213,124 | 11,482 |      304 s |
| build  | gp  | sonnet |       16 | 60,361 |     120,508 |  1,531,227 |  4,681 |      338 s |

(`ps` = `pharn-stage`, run 1; `gp` = `general-purpose`, run 2. Run 1 has no build row: it stopped at test.)

| Sum over the five shared stages | `pharn-stage` | `general-purpose` | gp / ps |
| ------------------------------- | ------------: | ----------------: | ------: |
| requests                        |            82 |                90 |    1.10 |
| first requests                  |       165,399 |           301,395 |    1.82 |
| cache write                     |       437,693 |           644,273 |    1.47 |
| cache read                      |     5,489,535 |         9,798,841 |    1.79 |
| cache read per request          |        66,945 |           108,876 |    1.63 |
| output                          |        38,689 |            53,770 |    1.39 |
| stage time                      |         722 s |             864 s |    1.20 |

**What can be attributed.** The first request is a context the stage's work has not touched yet. On the same
instruction files it is 27,196 tokens larger for `general-purpose`, for every stage agent alike: spec 27,212; the
other four exactly 27,196. That difference is the container, the one thing varied. Everything after the first request
also depends on what the agent did. Run 2 wrote four criteria where run 1 wrote three, its plan agent took 21
requests to run 1's 15, and its grill raised six findings. The sums above are what each arm spent; the share the
type caused is not separable at n = 1 (L40).

**Whole runs (not comparable: they stopped at different points).** Run 1: 1,011 s, USD 5.12 (Claude Code's
list-price figure, `final.json`), stopped after test. Run 2: 2,367 s, USD 8.02, ran build, regress (891 s, its base
and head `test` gates took 506 s and 243 s under load) and verify. Up to the end of the test stage the two runs took
902 s and 920 s.

**Entry gates were cold in both arms**, so no cache hit skews the comparison. Each ran all four gates fresh: a runner
of 569 s in run 1 and 573 s in run 2, both green (`cost.json` `entry`). The entry cache holds reds only, and no
red record existed. Run 1's orchestrator waited 122 s for the entry result before the test stage. Run 2's entry
had finished by then (43 ms wait). That difference is in the whole-run times, not in the stage times above.

**Cross-check.** For every arm, the per-agent sums plus the orchestrator equal `final.json` `modelUsage` exactly, per
model and per token class (cache read: run 1 opus 5,047,396, sonnet 5,529,552; run 2 opus 9,253,594, sonnet
9,277,642). `final.json` `usage` covers the orchestrator only. `cost.json` totals are smaller because its window
starts at the run-start marker.

## 5. Tools offered, and tools used

From each request's `api-request-shape` record (the tool list the harness sent) and the `deferred_tools_delta`
attachments:

| Agent                     | Tools sent                                                                                                | Deferred list                         | shadcn reachable        |
| ------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------- | ----------------------- |
| `pharn-stage` (all 5)     | 7: Bash, Edit, NotebookEdit, Read, SubagentHandback, Write, advisor                                       | none                                  | no                      |
| `general-purpose` (all 6) | 10: Agent, Bash, DeferredToolPlaceholder, Edit, Read, Skill, SubagentHandback, ToolSearch, Write, advisor | 525 names, 7 of them `mcp__shadcn__*` | yes, through ToolSearch |
| orchestrator, both runs   | 13, ToolSearch and Skill among them                                                                       | 7 `mcp__shadcn__*`, WebSearch         | yes                     |

- **Used:** no stage agent in either arm, nor either orchestrator, made a `tool_use` named `mcp__*`, WebFetch,
  WebSearch, Skill or ToolSearch. No `general-purpose` agent called the Agent tool, which the brief forbids.
- **Tried and failed:** none. Run 1's only stage-agent tool error was an `ls` of a directory not yet created. The
  `pharn-stage` build agent from CORE-310's killed first attempt (be523aa8, 10:05 CET) shows the same: 7 tools sent, one
  Edit, no tool error, no mention of MCP.
- **Glob, Grep and MultiEdit**, named in the definition, are not sent to either type by this Claude Code build. The
  2026-11-16 probe saw the same.
- **Sent but unusable:** every agent of both types received the `mcp_instructions_delta` attachment for seven of the
  user's claude.ai connector servers. `pharn-stage` agents have no MCP tool to use them with. Observed, not sized.

**Verdict on the follow-up rule** (fixed in the plan before run 2): a stage needed a dropped tool if a `pharn-stage`
agent attempted one, or if run 2's same stage used one where run 1's failed. Neither happened, so **no stage needed
it**, and no follow-up for the tool list is opened.

## 6. Bounds

- **n = 1 per arm.** LLM runs are not deterministic; nothing here estimates a mean or a spread.
- **The feature cannot exercise the shadcn server.** It replaces one doc-comment line. A build that adds or changes UI
  components is the case the ticket's risk names. This benchmark did not run one, so "no stage needed it" holds for
  this feature only. The matching risk is unchanged: a `pharn-stage` build has no route to the project's MCP servers.
- **The arms diverged at the spec stage** (three criteria against four), so every figure after the first request mixes
  the type with different work.
- **Load differed** (run 2 up to 113 on the 1-minute average, from other projects' test runs), which inflates run 2's
  gate times (regress, entry) more than its model times.
- **The orchestrator chose the type**, as the loop instructs; the record shows what was requested (`.meta.json`) and
  what was sent (`api-request-shape`), not why Claude Code built each list as it did.

## 7. Defects the runs showed (each its own task under CORE-293)

- **CORE-346:** reconcile reports a tracked file deleted before the build anchor as an escape, though nothing
  changed it in the window. Run 2's verify FAIL on `.claude/agents/pharn-stage.md` came from this, not from a write.
- **CORE-347:** a pinned AC test that fails typecheck is caught only after the build, which cannot edit it. Run 2's
  `typecheck` regression came from this.
- Run 1's stop is CORE-344, already open.

## 8. Re-running it

`.dev/features/core-311-stage-agent-benchmark/measure.mjs` prints every figure above from a session directory and its
`final.json`:

```sh
node .dev/features/core-311-stage-agent-benchmark/measure.mjs --arm <label> <session-dir> <final.json> [--arm …]
```

Its printout over the three sessions is committed beside it as `measure-output.json` (numbers and tool names only;
no account id, no path). The raw evidence is archived locally under the feature's gitignored `runs/` and is not
committed: transcripts, `final.json`, both runs' `pharn/features/` and `pharn/.run/` directories, and the
git-dir state. To repeat the comparison: make a detached worktree of the base **under your home directory**, copy
the measured checkout's dirty set and local files, delete `.claude/agents/pharn-stage.md` there, launch the same
line, and check each session's `instructions` attachment before reading anything else.
