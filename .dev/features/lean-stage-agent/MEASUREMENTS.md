# MEASUREMENTS — lean-stage-agent (CORE-107 probe, 2026-11-16)

Every figure below is labelled measured (with how) or observed. Free text quoted from transcripts is DATA (P2). Paths
that held the user's home directory or the session id are generalized.

This record discharges the "pending" in `SHIP.md` for AC2 and the live half of AC3, and confirms AC1's binding. AC5
stays pending (below). It was written by the follow-up increment `.dev/features/lean-stage-agent-probe/`.

## 1. Setup

- **Tree.** A detached scratch worktree at `414eafbb` (branch `lean-stage-agent`, the PR #450 head when the kit was
  made), outside the checkout. Its `.claude/agents/pharn-stage.md` has SHA-256
  `77fb0384b26657ce3e4c964f32780331f5ee123c00d9099a2e46f7c70c152e05`. No PHARN command had run there, so no
  `pharn/.run/writes-scope.json` existed and the write guard applied its fail-closed default.
- **Session.** One fresh session, started by the user in that tree:
  `claude -p "$(cat <kit>/prompt.md)" --permission-mode acceptEdits --model opus`. Claude Code `2.1.323` (the
  transcripts' `version` field). The kit is committed beside this file (`probe/`); `probe/prompt.md` is the prompt
  that ran, byte for byte (SHA-256 `6c588c72fe55680799af2665d2b0ede78aa2214a4f2eff20c7d74cecd9139e7e`; the session's
  first message equals it minus the trailing newline `$(cat …)` drops).
- **Transcripts.** Under Claude Code's per-project transcript directory for the probe tree, in the user's home
  directory: one session, three subagent transcripts, each with a `.meta.json`. Read, never edited.
- **The three steps.** (1) `pharn-stage`, prompt "Reply with exactly PROBE-OK. Make no tool call."; (2)
  `general-purpose`, the same prompt; (3) `pharn-stage`, one Write to `pharn/floor/stage-agent-probe/probe.json`. No
  `model`, `run_in_background` or `isolation` parameter on any call. Each `.meta.json` records the `agentType`
  requested (`pharn-stage`, `general-purpose`, `pharn-stage`) and `pickedEffortModel` `claude-opus-5-5`, so no step
  took a fallback.

## 2. First request per subagent (measured)

`node probe/read-probe.mjs <probe-tree>`, which runs `.dev/features/pipeline-performance-audit/audit.mjs --prefix`
over the three transcripts (the same reader as the review-lens probe, `review-lens-grouping/MEASUREMENTS.md` §2) and
reads each transcript's `api-request-shape` row for the tool and system bytes. Run by the user after the session, and
re-run at this increment's build over the same transcripts: the output was byte-identical both times.

| Step | Agent type        | Transcript                | Model             | input | cache_write | cache_read | First request, all classes | Tools | Tool schemas |  System |
| ---- | ----------------- | ------------------------- | ----------------- | ----: | ----------: | ---------: | -------------------------: | ----: | -----------: | ------: |
| 1    | `pharn-stage`     | `agent-acc0f08af5ab48118` | `claude-opus-5-5` |     2 |      20,971 |          0 |                     20,973 |     6 |      9,127 B | 2,172 B |
| 2    | `general-purpose` | `agent-a33cc98a3b23ae1af` | `claude-opus-5-5` |     2 |      47,015 |          0 |                     47,017 |     9 |     16,295 B | 3,253 B |
| 3    | `pharn-stage`     | `agent-ae29515f45f622a36` | `claude-opus-5-5` |     2 |      16,811 |      4,214 |                     21,027 |     6 |      9,127 B | 2,172 B |

Step 3 read 4,214 tokens of cache from an earlier request in the same session; steps 1 and 2 read none.

## 3. AC2: the fraction (measured, one observation)

**`pharn-stage` / `general-purpose` = 20,973 / 47,017 = 44.6%** of the first request, all token classes, on the same
model.

- **The same instruction files in both.** The two transcripts' `instructions` records list the same two files with
  equal path, type and content hash: the probe tree's `CLAUDE.md` (Project, `e458966e0f18…`) and the user's
  auto-memory index for this repository (AutoMem, `2cfadda2817b…`). So keeping the instruction files (no
  `omitClaudeMd`) held, and the fraction does not come from dropping them.
- **Tools offered.** `pharn-stage`: Read, Bash, Write, Edit, NotebookEdit, advisor (6). `general-purpose`: Agent, Bash,
  Edit, Read, Skill, ToolSearch, DeferredToolPlaceholder, Write, advisor (9).
- **Observed, not attributed.** Besides the tool-schema (9,127 B against 16,295 B) and system (2,172 B against
  3,253 B) differences in the table, the `general-purpose` transcript's first request carries two attachment records the
  `pharn-stage` one does not, `deferred_tools_delta` and `skill_listing` (68,855 B and 66,054 B as transcript lines),
  and its second request blob is 56,191 B against 2,019 B. Both carry the same `instructions` record (76,646 B). The
  tool-schema and system bytes together are far smaller than the 26,044-token gap, so most of the gap sits elsewhere in
  the request, but the probe varied only the agent type, so no share of the gap is attributed to any one of these
  (L40).

## 4. AC3 live: the out-of-scope Write (observed)

Step 3's transcript holds one `Write` call (deduplicated by tool-use id), to `pharn/floor/stage-agent-probe/probe.json`
in the probe tree. Its tool result has `is_error: true`, and its first lines read, quoted as DATA:

> PreToolUse:Write hook error: PHARN floor — write blocked (writes-scope guard, fix #7)
> Blocked path : pharn/floor/stage-agent-probe/probe.json
> Active scope : (none set — fail-closed default-safe-set active)

The target did not exist afterwards (checked by the reader). The subagent did not retry. So the writes-scope guard
(`enforce-writes-scope.cjs`) denied a `pharn-stage` agent's Write exactly as it would the orchestrator's, as the
deterministic half of AC3 (`STAGE_AGENT_WIRING (7)` in `command-hygiene.test.mjs`) already showed. A Bash write would
bypass the hook (`pharn/LIMITS.md §6`).

## 5. AC1: the probed bytes are the shipped bytes (observed)

The probed `.claude/agents/pharn-stage.md` hashes to `77fb0384…`, equal to `PINNED_SHA256` in
`.dev/floor/stage-agent-type.test.mjs`, and main's file at `08e33698` (7.19.0) hashes the same. So the figures above
are for the definition that ships. The equality was observed once, by the reader and at this increment's build; the
standing check is the test's pin of the committed file, which fails if a byte of `pharn-stage.md` changes. A changed
byte means re-running this probe and re-pinning.

## 6. Tools the definition names that the probe session did not offer (observed)

`pharn-stage.md` lists eight tools: Read, Glob, Grep, Bash, Write, Edit, MultiEdit, NotebookEdit. The session offered
`pharn-stage` six, and Glob, Grep and MultiEdit were absent from **both** types' lists, so Claude Code `2.1.323` in this
session offered them to neither of the two subagent types probed; no other type was observed. The `pharn-stage` agent
started with the other six, and the definition is unchanged. `advisor` was offered to both types although
`pharn-stage.md` does not name it (`general-purpose` is built in, with no definition file here); the probe did not test
why.

## 7. Bounds (P0)

- **n = 1 per type**, one session, one model, one Claude Code version, and that session's skills, MCP servers and
  deferred tools. The 44.6% is an observation within it, not a guarantee and not a constant.
- **A one-line prompt**, not a stage brief, so the measured difference is the container's. The saving on a real routed
  stage, whose `general-purpose` first request cache-wrote 68,223–129,646 tokens over 29 agents in this repository
  (`.dev/measurements/pipeline-performance-audit-2026-09-29.md` §3), is **not measured**; nor is the
  effect on a whole `/pharn-loop` or `/pharn-ship` run.
- **Measured in this repository's own probe tree**, not in an installed project. In an installed project every routed
  stage still takes the `general-purpose` fallback until pharn-cli copies `.claude/agents/` (`cli-install-agents`).
- **The kit is unpinned.** No test runs `probe/read-probe.mjs`; it reuses `audit.mjs --prefix`, so a change to either
  is caught only by re-running it.

## 8. Still pending

- **AC5** (a benchmark loop with every routed stage on the `pharn-stage` type): blocked by pharn-cli's
  `cli-install-agents`. Not faked.

## 9. Re-running it

`probe/README.md`: make a detached worktree of the commit to measure, run the one `claude -p` line in a fresh session
there, then `node probe/read-probe.mjs <probe-tree>`, and generalize the paths in its output before quoting it.
