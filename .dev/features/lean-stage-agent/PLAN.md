# PLAN — lean-stage-agent

- spec_content_hash: f058fca367fabcdfecf939dc70bfb43deaadedb1b0e810b790c4aeb156d6775d # re-pinned after the human patch (bb0b7215); was d19c3ae5…
- applied_lessons: [L1, L33, L35, L36, L60, L68, L70]
- increment: Spawn the routed stage agents of `/pharn-loop` and `/pharn-ship` as a new PHARN subagent type, `pharn-stage` (eight tools, the project's instruction files kept), with `general-purpose` as the named and reported fallback (Linear CORE-107, SKILLS_VERSION 7.18.0 → 7.19.0).
- layer(s): the product `.claude` surface (`.claude/agents/`, `.claude/commands/`, `pharn/ARCHITECTURE.md §4`'s tree line names it); dev apparatus tests under `.dev/floor/`
- constitution_refs: [P0, P2, P4, P6, P7]

## Why (P7 — the measured trigger)

`.dev/measurements/loop-baseline-2026-11-11.md` §5 measured a `general-purpose` agent's first request at 66,624 tokens
(median, n = 19) with 11 tool schemas of 55,193 B, against `Explore`'s 6 tools of 8,977 B; §12 rates CORE-107 **go**
(about 11.6k tokens per stage-agent request, estimated bytes / 4, on agents that are 72% of the cost of runs started
inside an agent). The review-lens type's probe (`.dev/features/review-lens-grouping/MEASUREMENTS.md` §2) showed a
custom type's first request at 17.5% of `general-purpose`'s, but that type also omits `CLAUDE.md`, which a stage agent
cannot, so the gain here will be smaller and is measured by AC2's probe, not claimed.

## Discovery (read live this run, main 259f27dd, SKILLS_VERSION 7.18.0, MIN_CLI 0.14.0)

- `general-purpose` is pinned at exactly two Agent-call sites: `.claude/commands/pharn-loop.md:594` (item 2 of `## Running a stage`) and `.claude/commands/pharn-ship-stages.md:52` (its item 2), and by one hygiene assertion,
  `.dev/floor/command-hygiene.test.mjs:5146` (`STAGE_AGENT_WIRING (5)`).
- The stage brief (`pharn/floor/stage-agent-core.mjs` `renderBrief`) tells the agent to read the constitution and
  `.claude/commands/<stage>.md` with the Read tool and follow it, forbids the Agent tool (rule 4), requires every
  in-project write through the write tools (`WRITE_TOOL_RULE`), and ends with a Bash `report` line. A scan of the
  routed stage commands (`pharn-{spec,plan,grill,triage,supervise,test,build}*.md`) for other tool names finds only
  `AskUserQuestion` in `/pharn-spec` Step 4 — the human approval, which `/pharn-ship` runs inline (`interactive`) and
  `/pharn-loop` replaces with `--model-approve` (brief rule 3: ask no one). So the eight tools (Read, Glob, Grep, Bash,
  Write, Edit, MultiEdit, NotebookEdit) cover every step a routed stage runs.
- `.claude/agents/` holds one file, `pharn-review-lens.md`; `.dev/floor/review-lens-agent.test.mjs` closes the
  directory over it (`★ CLOSURE: .claude/agents/ holds exactly pharn-review-lens.md`) and pins its SHA-256.
- Both write hooks are agent-type-blind: `grep agent_type|agent_id .claude/hooks/*.cjs` (tests excluded) is empty, and
  `STAGE_AGENT_WIRING (7)` already proves identical verdicts for a payload with `agent_type: "general-purpose"`.
- `.dev/floor/stage-load-budget.test.mjs` counts a subagent definition as part of the stage that spawns it (the
  `pharn-review` row lists `.claude/agents/pharn-review-lens.md`, "each group's system prompt"); its L3 rule requires
  the path to appear in the family's text.
- Byte ceilings (`COMMAND_BYTE_CEILINGS`): `pharn-ship-stages.md` 32,973 / 33,280 B and `pharn-ship-close.md`
  30,806 / 31,232 B — too little headroom for the added sentences, so both rows are re-measured (measured + 10%,
  rounded up to 512) as a visible diff. `pharn-loop.md` 90,340 / 93,184 and `pharn-loop-close.md` 41,481 / 43,520 have
  room.
- The routed stage agents' route lines are written from `pharn-loop-close.md` (Step 7 summary, "each stage's route")
  and `pharn-ship-close.md` (`SHIP.md`, "each stage's route"): that is where "which type ran" is reported.
- A transcript reader exists: `.dev/features/pipeline-performance-audit/audit.mjs --prefix` (first-request usage per
  token class), used by the review-lens probe; subagent transcripts carry an `instructions` attachment (paths and
  contents of the loaded instruction files) and an `api-request-shape` row (system blocks and tool schemas).
- `pharn/ARCHITECTURE.md §4` names only `pharn-review-lens` (tree line 145, bullet lines 163–165); `pharn/LIMITS.md` §3g
  says "five stage agents in a one-iteration full loop", where a full loop routes six since 7.7.0 (spec, plan,
  grill, triage, test, build). Both are human-only: see "Human-only edits" below.
- Coordination: a sibling agent (CORE-109) reflows the stuck-point table in `pharn-loop.md` and lowers its ceiling row;
  this plan touches only item 2 of `## Running a stage` there and leaves the table alone.

## Applied lessons

- L1 — the meta-docs this increment invalidates are in `## Files`: the guide `.dev/guides/product-commands.md` ("One
  definition"), the CHANGELOG, and the two trusted-doc sentences go to the human patch.
- L33 — "One definition, `.claude/agents/pharn-review-lens.md`" (guide) and "such as `pharn-review-lens`"
  (ARCHITECTURE §4) expire when the second definition lands; both are rewritten in this increment, not left to drift.
- L35 — one copy of the task: the definition's body says only its role and that the brief line is the task; it restates
  no brief rule and no stage step, so the `general-purpose` fallback receives the same task text (the brief).
- L36 — the `.claude/agents/` closure is asserted both ways over the two names, and the definition's tools are a closed
  set compared as a sorted list, not per-member presence.
- L60 — every wiring and body pin in the new test gets its own in-memory negative control, and every slicing anchor is
  asserted found first.
- L68 — the trusted-doc patch lands before `/pharn-dev-build` Step 0 (the anchor), and this ordering is stated to the
  orchestrator at GATE 1; after it is applied and committed, the PLAN's `spec_content_hash` is re-pinned (the one
  post-approval PLAN edit), because the ARCHITECTURE edit changes the hash `/pharn-dev-build` compares.
- L70 — no mutant definition is ever written under `.claude/agents/` (a file there is a live subagent type of this
  repo's sessions); every control runs in memory.

## Files

- `.claude/agents/pharn-stage.md` — NEW. Frontmatter: `name: pharn-stage`, a one-line `description` ("Used only by
  /pharn-ship and /pharn-loop to run one routed PHARN pipeline stage from the brief line they pass. Not for any other
  task."), `tools: Read, Glob, Grep, Bash, Write, Edit, MultiEdit, NotebookEdit`; no `omitClaudeMd`, no `model` (the
  Agent call's `model` routes). Body after its H1: the role, and that the prompt's first line names the
  `stage-agent.mjs brief` line to run first and follow — the brief and the stage command it names are the whole task. No scope guard (P7: no observed misuse; the description scopes selection) — open question 3. — product
  `.claude` surface
- `.claude/commands/pharn-loop.md` — `## Running a stage` item 2 only: `subagent_type: "pharn-stage"` (the definition
  `.claude/agents/pharn-stage.md`, applied by Claude Code); if that type is not offered or the call is refused for it
  (no agent started), the same call once with `subagent_type: "general-purpose"` before the finish line, and
  `general-purpose (fallback)` on that stage's route line. Every other parameter unchanged. — product
- `.claude/commands/pharn-ship-stages.md` — the same change to its item 2. — product
- `.claude/commands/pharn-loop-close.md` — the "each stage's route" bullet adds `general-purpose (fallback)` after an
  `agent:<alias>` token whose call took the fallback; one claims sentence: the type and its tool list are applied by
  Claude Code, any `.claude/agents/*.md` named `pharn-stage` (project or user scope) sets the container, nothing
  detects either; "a routed stage ran with only the `pharn-stage` tools" is never a claim. — product
- `.claude/commands/pharn-ship-close.md` — the same two changes for `SHIP.md`'s route lines and its claims block. —
  product
- `.dev/floor/stage-agent-type.test.mjs` — NEW. Pins, each with an in-memory control (L60): ★ CLOSURE —
  `.claude/agents/` is exactly {`pharn-review-lens.md`, `pharn-stage.md`}, both ways, `pharn-` not `pharn-dev-`; ★
  BYTES — `pharn-stage.md`'s SHA-256 equals `PINNED_SHA256` (the committed bytes, which AC2's kit measures and checks);
  FRONTMATTER byte for byte and the closed eight-tool set, no `omitClaudeMd`; BODY under a ceiling, naming the brief
  line, restating no brief rule (`WRITE_TOOL_RULE`'s text, the `report` line) and no stage step; ★ WIRING — both item 2
  texts name the type, the path, the fallback, fallback-before-finish and the fallback note, the subagent type equals the
  definition's `name:`; both close parts' route bullet and claims sentence. — dev apparatus
- `.dev/floor/review-lens-agent.test.mjs` — the CLOSURE test keeps its title (pharn-ci's test-integrity reads a renamed
  test as removed) and judges the directory minus `pharn-stage.md`, whose closure the new test owns; header note. —
  dev apparatus
- `.dev/floor/command-hygiene.test.mjs` — `STAGE_AGENT_WIRING (5)`: also match `` `subagent_type: "pharn-stage"` `` and
  the fallback sentence (the `general-purpose` match stays, now the fallback's); `(7)`: add a payload whose agent type is
  `pharn-stage`, judged identically (AC3, deterministic); `COMMAND_BYTE_CEILINGS` rows for `pharn-ship-stages.md` and
  `pharn-ship-close.md` (and any other row the build measures over its ceiling) re-measured with a comment. — dev
  apparatus
- `.dev/floor/stage-load-budget.test.mjs` — the `pharn-loop` and `pharn-ship` rows gain `.claude/agents/pharn-stage.md`
  ("each routed stage agent's system prompt"); a ceiling re-measured only if L4 turns red. — dev apparatus
- `.dev/guides/product-commands.md` — the `.claude/agents/` section: two definitions, the stage type keeping the
  instruction files, its SHA bound to the probe kit (pending), the fallback rule covering both orchestrators. — dev
  apparatus
- `SKILLS_VERSION` — 7.18.0 → 7.19.0 (minor: a newly shipped agent definition). — repo meta
- `README.md` — the version badge only, 7.18.0 → 7.19.0 (`check:badge` binds it to `SKILLS_VERSION`). Added at build,
  after the first anchor: see "Build deviation" below. — repo meta
- `CHANGELOG.md` — a `## [7.19.0]` entry (CONTRIBUTING "CHANGELOG entries"): the type, the fallback, what is pending
  (AC2 probe, AC5 blocked by `cli-install-agents`), the human-applied trusted-doc edits. — repo meta

### Not in this increment's writes

- `pharn/ARCHITECTURE.md`, `pharn/LIMITS.md` — human-only (fix #2). The orchestrator's patch script
  `core-107/patch.py` (scratchpad) applies them; text under "Human-only edits".
- `pharn/floor/stage-agent-core.mjs` — unchanged: the brief already forbids the Agent tool and names the stage
  command; its residual `stage-agent-effort` is CORE-111's.
- The stuck-point table in `pharn-loop.md` — CORE-109's.
- The probe kit — scratch, at the orchestrator's scratchpad `core-107/kit/`, never in the repo.

## Human-only edits (L68 — apply BEFORE `/pharn-dev-build` Step 0, then commit, then re-pin)

`patch.py <repo-root>` asserts each anchor matches exactly once, replaces it, prints what changed:

1. `pharn/ARCHITECTURE.md` §4 tree line — the `.claude/agents/` row of the code block gains a
   comma after its `pharn-review-lens` entry, plus a continuation line aligned under it:
   `pharn-stage (the routed stage agents of /pharn-ship and /pharn-loop)`.
2. `pharn/ARCHITECTURE.md` §4 bullet — "definitions, such as `pharn-review-lens` (`/pharn-review`'s lens groups): a
   definition states a role and its fences, and the stage's prompt carries the task." → "definitions:
   `pharn-review-lens` (`/pharn-review`'s lens groups) and `pharn-stage` (the routed stage agents of `/pharn-ship` and
   `/pharn-loop`). A definition states a role and any fences, and the stage's prompt carries the task."
3. `pharn/LIMITS.md` §3g — "five stage agents in a one-iteration full loop, one more per further iteration." → "six
   stage agents in a one-iteration full loop (spec, plan, grill, triage, test and build), one more per further
   iteration, and more on a re-plan round or an escalation. Since 7.19.0 each is requested as the `pharn-stage`
   subagent type where the session offers it (eight tools, the project's instruction files kept), else as
   `general-purpose`; its first request against `general-purpose`'s is measured by CORE-107's probe, not by this
   sentence."

Order: GATE 1 approval → the user runs `python3 <scratchpad>/core-107/patch.py <worktree>` → commit the two docs as a
human-authored edit → this PLAN's `spec_content_hash` re-pinned to `node .dev/floor/hash-doc.mjs pharn/ARCHITECTURE.md`
→ `/pharn-dev-grill` → `/pharn-dev-build`.

## Build deviation (recorded, 2026-11-16)

The plan missed `README.md`: the version badge must equal `SKILLS_VERSION` (`check:badge`). Found during the build,
after the first anchor (epoch `2026-11-16T17:38:34.867Z`). Before widening, a reconcile preview
(`check-bash-reconcile.mjs --base . --require-baseline`) read `CLEAN`: 12 paths reconciled, no escapes, nothing exempted
or merged. Every one of the 12 is in this plan's `## Files`. The plan's `## Files` then gained the one line above,
and build Step 0 was run again (setter, then a new anchor). A path added after an anchor reads as
`plan-widened-after-anchor`, and verify would read that as a FAIL. Re-anchoring here hides nothing, because the
preview had just shown the old epoch clean. The model made this call under delegation; `SHIP.md` records it.

## Contracts satisfied

- None changed. `pharn/pharn-contracts/stage-exit.md` and the brief's result schema are untouched: the type changes the
  container, not the protocol (`stage-agent-core.mjs` header, cited).

## Evals to write (P1)

- No capability (no `role:` file) is added, so no `evals/` pair is owed. The behavioural checks are the tests above and
  the kit's three live observations.

## Acceptance criteria → how each is met

1. Closure equals the two files; each pinned SHA equals a probed file → `stage-agent-type.test.mjs` ★ CLOSURE and ★
   BYTES; `pharn-review-lens.md`'s pin is unchanged (its probed file). `pharn-stage.md`'s pin is the committed bytes;
   "equals a probed file" is MET when the kit's reader confirms the probe tree's SHA equals `PINNED_SHA256` — pending
   with AC2.
2. First request at a stated fraction, same instruction files → the kit (scratchpad `core-107/kit/`): a scratch
   `git worktree add --detach` of the built branch, `prompt.md`, the exact `claude -p "$(cat …/prompt.md)"
--permission-mode acceptEdits --model opus` line, and `read-probe.mjs`, which reuses `audit.mjs --prefix` for each
   subagent's first-request usage, compares the two transcripts' `instructions` attachments (paths and content hashes)
   and tool-schema counts, and prints the fraction. PENDING: a fresh session is needed (a definition is discovered only
   by a session started after it exists), and `claude -p` from this agent's Bash is refused.
3. Out-of-scope Write inside the type denied → deterministic: `STAGE_AGENT_WIRING (7)` with the agent type
   `pharn-stage` (the hooks read neither field, so the deny applies regardless of type) — MET at build; live: the kit's
   third step writes `pharn/floor/stage-agent-probe/probe.json` inside `pharn-stage` (no scope → fail-closed set) and
   the reader checks the tool result names the writes-scope guard and the file does not exist — pending with AC2.
4. Both commands name the fallback and report it → item 2 in both commands + the route bullet in both close parts,
   pinned by ★ WIRING. MET at build.
5. Benchmark loop with every routed stage on the type → PENDING, blocked by `cli-install-agents` (pharn-app's install has
   no `.claude/agents/`, so every stage there takes the fallback). Not faked.

## Guarantee audit (P0)

- "`.claude/agents/` holds exactly the two definitions, and `pharn-stage.md` is the pinned bytes" → floor: enum-regex
  (set equality) + content-hash, over committed text, in a dev test.
- "an out-of-scope Write by a `pharn-stage` agent is denied" → floor: hook (fix #7), for the Write/Edit/MultiEdit/
  NotebookEdit surface; agent-type-blindness shown by `(7)`. A Bash write bypasses it (`LIMITS.md §6`).
- "a routed stage runs with only the eight tools / keeps the instruction files" → advisory: Claude Code applies the
  definition; nothing here observes a run's tool list. Struck as a claim in both close parts.
- "the orchestrator takes the fallback when the type is missing, and reports it" → advisory: orchestration prose,
  pinned as text only.
- "the type's first request is smaller" → advisory until the probe is recorded; never claimed from the bytes estimate.
- "the type is the container" → advisory: any `.claude/agents/*.md` named `pharn-stage` (project or user scope) answers
  to the name; stated in the claims sentence.

## Trust audit (P2)

- No new input is ingested. The definition's body is trusted product text that becomes the stage agent's system prompt;
  it adds no fence and drops none (the brief's rule 5 and each stage command's own trust rules govern its reads,
  unchanged). The agent's final text still returns into the orchestrator's context — the existing
  `THREAT-MODEL.md §5` residual, unchanged.

## Determinism audit (P5)

- The type choice is the orchestrator reading its own Agent tool's offered types (ADVISORY, failing in the safe
  direction: a missing type takes `general-purpose`, the 7.18.0 behaviour). Control flow after the call is unchanged
  (`finish`'s exit code).

## GATE 1 — resolved (2026-11-16)

Approved as written: a model decision by the batch orchestrator, made under the user's delegation ("You make all
decisions"), not a human approval. The four questions, answered:

1. Patch timing: (a) before build. The user applies the trusted-doc patch, it is committed as a human edit (L68),
   and `spec_content_hash` is re-pinned before `/pharn-dev-grill`. The orchestrator changed the LIMITS §3g ending
   to: "else as `general-purpose`. How much smaller its first request is than `general-purpose`'s is not measured in
   this document." (the trusted docs cite no Linear ids).
2. AC2: report the measured fraction, with no threshold.
3. No scope guard in the definition's body.
4. The claims sentence goes in both close parts; the byte-ceiling headroom is watched.
