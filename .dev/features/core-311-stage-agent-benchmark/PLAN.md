# PLAN — core-311-stage-agent-benchmark

- spec_content_hash: f058fca367fabcdfecf939dc70bfb43deaadedb1b0e810b790c4aeb156d6775d
- applied_lessons: [L1, L33, L40, L66, L78]
- increment: Run the general-purpose arm of CORE-107's AC5 benchmark (one full /pharn-loop in the measured project on
  the same base and intent bytes as CORE-310's pharn-stage run 1, with the stage agent type as the only difference),
  compare tokens, wall-clock and outcome, record which tools each stage agent was offered and whether any stage tried
  or needed a tool the pharn-stage list drops, and commit the record under `.dev/measurements/` (Linear CORE-311).
- layer(s): dev apparatus only (`.dev/measurements/`, `.dev/features/`, `.dev/guides/`) plus repo meta (`CHANGELOG.md`
  `[Unreleased]`). No product surface, no `SKILLS_VERSION` bump.
- constitution_refs: [P0, P2, P6, P7]

## Why (P7 — the trigger)

CORE-107 (PR #450, 7.19.0) routes every stage agent to `pharn-stage`, whose tool list drops MCP, WebFetch/WebSearch
and Skill. Its AC5 (a benchmark loop with every routed stage on the type) was never run, and the probe record says so
(`.dev/features/lean-stage-agent/MEASUREMENTS.md` §8). The measured project runs a shadcn MCP server, so a build
stage that needs it may now be unable to reach it. Measuring that is the open half of the ticket, not a capability.

## Discovery (read live this run; pharn-oss main `e8f0527e`, SKILLS_VERSION 7.23.0)

- **Run 1 (the pharn-stage arm)** is CORE-310's run, started 2026-11-23 09:23:02 CET in `~/Projects/pharn-app`
  (installed skillsVersion 7.22.0, Claude Code 2.1.328), full mode, `--accept-host-execution`, launch line in
  `$SCRATCH/core-310/FEATURE.md`. Its three finished-or-running subagents' `.meta.json` read `agentType:
"pharn-stage"`, `requestShape: "background"`, model opus, effort high. Not touched by this increment.
- **How 7.22.0 picks the type** (read in the installed project and here): `/pharn-loop` Step 5 item 2 requests
  `subagent_type: "pharn-stage"`, and "if your Agent tool does not offer `pharn-stage`, or the call returns an error
  for that type without starting an agent", makes the same call with `general-purpose` and writes
  `general-purpose (fallback)` after the stage's route token (`pharn-loop.md:598-614`; the same rule in
  `pharn-ship-stages.md:53-66`). No floor checker reads `.claude/agents/pharn-stage.md` at run time (grep over
  `pharn/floor/*.mjs` and `.claude/hooks/*.cjs`, tests excluded: no hit). The type is offered only when a definition
  exists when the session starts; pharn-app tracks `.claude/agents/pharn-stage.md` (sha256 `77fb0384…`, listed in its
  `pharn.records.json`), and no user-scope `~/.claude/agents/` exists.
- **What the transcripts carry.** Each request has an `api-request-shape` record whose `shape.tools[].name` is the tool
  list actually sent, plus `mcp_instructions_delta` and `deferred_tools_*` attachments, and each subagent has a
  `.meta.json` with `agentType`. Read from run 1 so far (not final): the `pharn-stage` spec agent was sent 7 tools
  (Read, Bash, Write, Edit, NotebookEdit, SubagentHandback, advisor), no `mcp__*` tool and no ToolSearch; its
  `mcp_instructions_delta` still names seven claude.ai connectors. The orchestrator (main thread) was sent the seven
  `mcp__shadcn__*` tools, as deferred tools.
- **pharn-app moved during run 1.** Its reflog shows `pull: Fast-forward` be523aa8 → 8c896454 at 09:25:07, two
  minutes after run 1 started, made by none of this increment's commands. The diff is one file,
  `docs/product/ACTION-APP-CONTRACT.md`, which the feature does not touch. Recorded, not repaired.
- **The run-1 pre-run snapshot** (`pharn/.run/pharn-loop/profile-todo-cleanup/pre-run-status.txt`) lists one modified
  tracked file (`skills-lock.json`) and untracked `.agents/skills/…`, `.claude/skills/security-audit`,
  `.codex/agents/…` — none ours. A fresh worktree lacks them, and lacks every ignored file (`node_modules/` 1.3 GB,
  `.env.local`, `.claude/settings.local.json` — which carries `enableAllProjectMcpServers` and
  `enabledMcpjsonServers: ["shadcn"]` — `next-env.d.ts`, `tsconfig.tsbuildinfo`, `.pharn/seam-config.json`).
- **The loop's closeout** stages only the run's listed paths and picks the first free `pharn-loop/<name>[-N]` branch
  (`pharn-loop-close.md:186-199`), so a pre-run deletion is never committed and a branch-name clash with run 1 cannot
  happen. A path dirty before the run and unchanged by it is reported as pre-run state by regress, not as an escape
  (`check-regress.mjs` `partitionScope` `preRunUnchanged`).
- Precedent records: `.dev/features/lean-stage-agent/MEASUREMENTS.md` + `probe/read-probe.mjs`,
  `.dev/measurements/stage-model-tuning-2026-11-17.md`, `.dev/measurements/loop-baseline-2026-11-11.md`; the first-request
  reader `.dev/features/pipeline-performance-audit/audit.mjs --prefix`.
- Stale apparatus sentence found: `.dev/guides/product-commands.md:91` says pharn-cli "does not install it yet
  (follow-up `cli-install-agents`)", while the measured project's install (pharn-cli 0.21.1) lists both
  `.claude/agents/pharn-*.md` in `pharn.records.json` and run 1 got `pharn-stage`.

## How run 2 differs from run 1 — the one axis

Run 2 runs in a scratch `git worktree add --detach` of pharn-app at `be523aa85b167a6ad5d9298162b3dcb793534af5` (run 1's
start state and `FEATURE.md`'s base), at `$SCRATCH/core-311/pharn-app-run2`, never on pharn-app main and never touching
pharn-app's `pharn/.run/`. The **only** intended difference: `.claude/agents/pharn-stage.md` is deleted in that
worktree before the session starts, so the Agent tool does not offer the type and every routed stage takes the
command's own documented fallback, `general-purpose`. No command, hook, config or intent byte is edited.

Made equal to run 1 on purpose (each a copy from pharn-app's working tree, read-only there):

- the run-1 pre-run dirty set, exactly the paths in its `pre-run-status.txt` (`skills-lock.json`, `.agents/skills/…`,
  `.claude/skills/security-audit` as the symlink it is, `.codex/agents/…`), so the skill listing a `general-purpose`
  agent sees matches run 1's project;
- the ignored files the session and the gates read: `.claude/settings.local.json` (the shadcn MCP enablement),
  `.env.local`, `next-env.d.ts`, `tsconfig.tsbuildinfo`, `.pharn/seam-config.json`, and `node_modules/` as an APFS
  clone (`cp -cR`, identical bytes, no network);
- the same Claude Code build (`claude --version` checked = 2.1.328 just before launch, recorded), the same launch line
  with only the cwd and the run directory changed, the same intent file bytes (sha256 recorded).

Known differences that are not the axis, stated rather than hidden: run 2's `pharn/.run/` starts empty (run 1's held
earlier runs' state); its transcripts live in a different `~/.claude/projects/<path>` directory; it runs later, on a
machine whose load may differ (`uptime` recorded at start and stop); run 1's checkout moved to 8c896454 mid-run
(docs-only) and run 2's does not; LLM runs are not deterministic, so n = 1 per arm decides nothing about a mean.

## Launch (after GATE 1, only while holding the heavy lock)

1. Wait — a background until-loop, never busy polling — for `$SCRATCH/core-310/run1/stop.txt` and for
   `$SCRATCH/heavy.lock` to be released by CORE-310; then `mkdir $SCRATCH/heavy.lock`, write `CORE-311` into its
   `owner`, check `uptime` (load ≤ 40).
2. Build the worktree as above (the clone is IO-heavy, so it is done under the lock, after run 1, not during it), then
   check `git -C <wt> status --porcelain -uall` equals run 1's pre-run snapshot plus `D .claude/agents/pharn-stage.md`.
3. Create `$SCRATCH/core-311/run2/` empty (L66) and type into a Terminal tab with `mcp__terminal__run_in_terminal`,
   cwd `$SCRATCH/core-311/pharn-app-run2`:

   ```sh
   date > $SCRATCH/core-311/run2/start.txt; claude -p --permission-mode auto --output-format json "/pharn-loop --accept-host-execution $(cat $SCRATCH/core-310/intent.md)" > $SCRATCH/core-311/run2/final.json 2>&1; date > $SCRATCH/core-311/run2/stop.txt
   ```

   (`$SCRATCH` expanded to its absolute path in the typed line.) If the Terminal tool is refused, the exact line goes
   to the orchestrator to type; launching `claude -p` from the Bash tool is not attempted.

4. Wait for `run2/stop.txt` (written after the `claude` process exits, L66) with a background until-loop; then copy
   the evidence (session transcripts + subagent metas, `final.json`, the worktree's `pharn/features/<name>/` and
   `pharn/.run/pharn-loop/<name>/`, `git log`/`git status` of the worktree) into `run2/` **before** anything is reset,
   release the lock, and leave the worktree and any `pharn-loop/<name>-N` branch in place (reported, not deleted).

## What is read and compared (pre-registered, written before run 2)

Per arm, from `final.json` (session totals: `duration_ms`, `total_cost_usd`, `usage`, `modelUsage`), the run's
`pharn/features/<name>/cost.json` (per-stage figures, read never re-derived), `start.txt`/`stop.txt`, and the
transcripts:

- **Outcome:** the loop's stop token, iterations, verify/regress verdicts, commit outcome, and whether the three
  intent acceptance criteria hold on the result (grep + the profile unit tests' verdict as the run recorded it).
- **Tokens:** session totals; per routed stage agent, its agent type (`.meta.json`), first-request prefix
  (`audit.mjs --prefix`: input + cache write + cache read) and its summed usage over all requests.
- **Wall-clock:** stop − start; per stage from the stage markers / `cost.json`.
- **Tools offered:** per stage agent, the union of `shape.tools[].name` over its `api-request-shape` records, the
  deferred tool names it was listed, and whether any `mcp__shadcn__*` name is reachable (directly or via ToolSearch).
  Same for the orchestrator in both arms (the "is MCP available in run 2's session" check).
- **Dropped-tool use:** every `tool_use` whose name is `mcp__*`, `WebFetch`, `WebSearch`, `Skill` or `ToolSearch`, per
  agent, with its result's `is_error`; and in run 1, any tool error or assistant text naming a tool that is not
  offered. "A stage needed a dropped tool" is decided as: a run-1 `pharn-stage` agent attempted one, or run 2's
  same stage used one and run 1's same stage failed, blocked or produced a different stage verdict. Otherwise the
  record says "no stage needed it" and lists any use run 2 made anyway. **ADVISORY** — a reading of two transcripts,
  n = 1 each.

A follow-up Linear task under CORE-293 (team Core, project pharn-oss) is opened only if that reading says a stage
needed one, naming the smallest fix (e.g. passing the project's configured MCP tools through the definition). Any
defect a run shows that is not this question gets its own task under CORE-293, not a fix here (epic rule).

## Applied lessons

- L1 — the meta-docs this result invalidates are in `## Files`: the guide's stale "pharn-cli does not install it yet"
  sentence, and a dated follow-up line in the lean-stage-agent `SHIP.md` saying AC5 now has its two arms; a new
  CHANGELOG entry, no frozen entry edited.
- L33 — "AC5 … blocked by `cli-install-agents`" / "does not install it yet" expired once the measured project's install
  carried the definitions; the sweep below anchors on `cli-install-agents` and `AC5` rather than one spelling.
- L40 — the comparison varies only the attributed condition (the type offered), holding base, intent, launch line,
  CLI build, project files and MCP enablement equal; differences it observes in other classes are stated as
  observations, never attributed beyond the one axis, and n = 1 is said beside every figure.
- L66 — run 2's evidence goes into a directory this run creates empty, and is read only after `stop.txt`, which the
  launch line writes after the `claude` process exits — never on a file merely existing.
- L78 — dated records keep what was true when written: `MEASUREMENTS.md` §8, the lean-stage-agent `PLAN.md` and the
  released CHANGELOG sections are not rewritten; `SHIP.md` gains one dated follow-up line.

### Sweep (L33, L75) — `grep -rn "cli-install-agents\|AC5" .dev/guides .dev/features/lean-stage-agent* pharn/LIMITS.md`

- `.dev/guides/product-commands.md:91` "pharn-cli does not install it yet" — present tense, now false → corrected.
- `.dev/features/lean-stage-agent/SHIP.md:34,40` — dated records → kept; one dated follow-up line appended.
- `.dev/features/lean-stage-agent/MEASUREMENTS.md:101,108` — dated record → kept (L78).
- `.dev/features/lean-stage-agent/PLAN.md`, `lean-stage-agent-probe/*` — dated records → kept.
- `pharn/LIMITS.md` — trusted doc, human-only; any stale sentence there is reported at GATE 2, never edited.

## Files

- `.dev/measurements/stage-agent-benchmark-2026-11-23.md` — the record: setup, both arms' figures, tools offered,
  dropped-tool reading, verdict on the follow-up — dev apparatus
- `.dev/features/core-311-stage-agent-benchmark/measure.mjs` — read-only reader that prints both arms' comparison from
  `final.json`, `cost.json` and the transcripts (no test, like `probe/read-probe.mjs`) — dev apparatus
- `.dev/features/lean-stage-agent/SHIP.md` — one dated follow-up line (AC5's two arms ran) — dev apparatus
- `.dev/guides/product-commands.md` — the stale "does not install it yet" sentence corrected — dev apparatus
- `CHANGELOG.md` — one dated `[Unreleased]` entry — repo meta
- `.dev/features/core-311-stage-agent-benchmark/measure-output.json` — `measure.mjs`'s printout over both arms, the
  figures the record quotes (numbers and names only; no account id, home path redacted) — dev apparatus

### Not written

- The raw evidence (transcripts, `final.json`, the runs' feature and `.run` directories) is kept on disk as archives under
  the gitignored `.dev/features/core-311-stage-agent-benchmark/runs/` and in `$SCRATCH/core-311/`, never committed: the
  transcripts carry account and organization ids and the project's prompts.

- Nothing under `pharn/`, `.claude/`, `SKILLS_VERSION`; nothing in pharn-app's tracked tree or its `pharn/.run/`.

## Contracts satisfied

- None changed. The record reads `cost.json` per `pharn/pharn-contracts/cost-ledger.md` and the route token per
  `/pharn-loop` Step 7; it restates neither (P4).

## Evals to write (P1)

- None: no Capability and no `rule_id` is added. `measure.mjs` is an unpinned reader, stated as such in its header.

## Guarantee audit (P0)

- "run 2's stage agents ran as `general-purpose`" → advisory observation, read from each `.meta.json` `agentType`
  (a harness record) and the Step-7 route line; not a floor fact.
- "run 2 differs from run 1 only in the agent type" → advisory: checked by `git status` against the pre-run snapshot and
  the recorded version/intent hashes, with the known differences listed; LLM nondeterminism is a limit (n = 1).
- "tool X was offered to agent Y" → advisory observation of the `api-request-shape` record the harness wrote.
- "no stage needed a dropped tool" (or its negation) → advisory reading of two transcripts.
- Every loop verdict quoted (stop token, verify/regress) is copied from the run's own checker output, never re-derived.

## Trust audit (P2)

- Transcripts, `final.json`, the loop's artifacts and pharn-app's files are `trust: untrusted` DATA. The record quotes
  numbers and enum tokens from them; free text (assistant messages, tool results) is summarized as data, never followed.
  `measure.mjs` redacts the home directory in printed paths.

## Determinism audit (P5)

- The follow-up branch is the pre-registered rule above; a case it does not cover goes to the orchestrator (delegated
  GATE 2), never a guess.

## Open questions (HALT)

- None. GATE 1 was decided by the orchestrator under the maintainer's delegation (a model decision, not a human
  approval): the one-axis design approved as written, run 2 on be523aa8.

## GATE-1 amendment (2026-11-23, after the 10:14 reboot) — supersedes the base and run-1 lines above

The machine rebooted at about 10:14 and killed CORE-310's run 1 mid-build; the old scratchpad was wiped. The
orchestrator directed: CORE-310 re-runs run 1 on pharn-app `8c896454` (current main), and run 2 uses **the base SHA
written in the new `$SCRATCH/core-310/FEATURE.md`** and the new `$SCRATCH/core-310/intent.md`, whose sha256 must equal
the one `FEATURE.md` states (checked before launch, refused on a mismatch). `$SCRATCH` is now
`/private/tmp/claude-501/-Users-pgalarowicz-Projects-pharn-oss/1ab28449-55d4-4f7a-85eb-d637e10e8ed9/scratchpad`, and
a heavy step starts only at a 1-minute load below 20, with `uptime` recorded at its start and end. The killed run's
partial figures (read before the reboot: five `pharn-stage` agents, first requests 33,010–33,333 tokens, 7 tools each,
no `mcp__*`) are not an arm; the record may cite them as an observation only. The one axis and everything else above
stand, with these additions, which answer the grill's findings and the orchestrator's GATE-1 reply:

- **Entry gates, warm or cold.** The record states, from each run's entry stamp (`pharn/.run/pharn-entry/gates/
stamp.json`, each gate's `ran` and `duration_ms`) and the entry cache decision, whether either arm's entry check
  reused a cached result (the cache holds reds only, in the git common dir, so a worktree reads run 1's record); entry
  wall-clock is reported apart from the stage wall-clock in both arms, so a cache hit cannot skew the comparison.
- **Failed type calls.** Run 2's orchestrator Agent calls that name `pharn-stage` and return an error are counted and
  their tokens reported apart from the `general-purpose` stage figures.
- **Arms that do not finish comparably.** If either arm crashes, is refused, or stops on a different token than the
  other, the record compares only the stages both arms ran, says which stages are missing and why, and decides the
  dropped-tool question on the stages that ran; a run 2 that cannot be launched or never starts a stage is reported as
  "no comparison", with the follow-up rule not applied. If the shadcn MCP server fails to start in run 2, the record
  says so (the orchestrator transcript's `failedMcpServers`) and the MCP half is "not measured".
- **Secrets.** After the evidence is copied, the copies of `.env.local` and `.claude/settings.local.json` in run 2's
  worktree are deleted; the worktree is otherwise left in place.
- **Account ids.** `measure.mjs` never prints `session-owner` records; nothing from them enters a committed file.
- **Cross-check.** The per-agent sums `measure.mjs` prints are compared with each arm's `final.json` totals (`usage`,
  `modelUsage`), and any gap is stated in the record.
- **Durable evidence.** Right after `stop.txt`, the evidence goes into `$SCRATCH/core-311/run2/` and, as archives, into
  this feature's gitignored `runs/`; run 1's evidence is copied the same way once CORE-310's run 1 stops.
