# PLAN — cost-ledger-run-scope

- spec_content_hash: d831d30d399a37dc403080072763d13383de6f6f31875e7e8cb4eadeb642f4f4
- applied_lessons: [L1, L2, L4, L6, L29, L34, L35, L36, L37, L42, L43, L52, L55, L58, L60, L62, L63, L64]
- increment: a cost ledger counts only its own run's requests — the context that ran the run and the agents that context spawned during it — never a concurrent run's in the same session; when that cannot be read from the transcript, the ledger says membership is unknown
- layer(s): pharn-contracts (`cost-ledger.md`); the product floor (`pharn/floor/`)
- constitution_refs: [P0, P2, P3, P5, P6, P7]
- skills_version: 6.28.2 → 6.29.0 (minor, the 6.9.0 precedent for a membership-rule change)
- model: this batch runs on Opus by the maintainer's instruction for the batch; recorded here, not as a `pharn.config.json` route

## The finding, verified against live state (P6)

Finding H3 (quoted to this run as DATA) says three pharn-starter ledgers share most of their rows because three
runs ran at once in one session. Verified this run:

- **The mechanism is real.** `pharn/floor/transcript-core.mjs` `sessionRequests()` reads `<sessionId>.jsonl` and
  everything under `<sessionId>/`, subagents included. `pharn/floor/run-window-core.mjs` admits a request by session,
  markers and time only. A subagent's Bash sees the PARENT's session id (measured below), so every marker a run
  writes from inside an agent is bound to the parent session, and every concurrent context's request inside the
  window is a member.
- **The three named ledgers** (`invite-dialog-team-scope`, `logger-redaction-gaps`, `org-http-surface`) are
  `/pharn-loop` ledgers (skills 6.12.1, so every stage ran inline in its loop agent). Each holds rows of the SAME three
  agents plus 39/44/44 main-thread rows; 357/381/411 of their 370/407/411 rows appear in another of the three.
- **Their transcript is gone.** Session `bb54cf03…` has only a `desktop-released.json` whose `reason` is `delete`
  (2026-09-25T19:35:52Z). They cannot be re-derived, and this plan does not claim to. Two other contaminated
  sets whose transcripts still exist are re-derived below instead.
- **The finding's scope counts differ slightly from mine, and mine are stated:** over all 64 ledgers in that
  project, 24,787 rows, 14,769 unique request ids, 6,696 ids in more than one ledger. That count includes `/1`
  session-scoped ledgers of one main-thread session, a different (already labelled) defect.
- **This session is an instance too:** its orchestrator runs three `/pharn-dev-ship` agents at once, each a
  depth-1 background agent of one session.

## Measurements (read-only, this run; the record is `.dev/measurements/cost-ledger-run-scope-2026-09-27.md`)

1. **What a marker written inside a subagent can record.** The Bash environment of this subagent holds 30
   Claude-related variable names and no agent id. `CLAUDE_CODE_SESSION_ID` equals the PARENT session's id.
   `CLAUDE_CODE_CHILD_SESSION=1`, `CLAUDE_PID` and `AI_AGENT` carry no identity that could tell sibling agents
   apart. **So a marker cannot record its own context.** The binding has to be read from the transcript
   afterwards.
2. **Transcript layout.**
   - Main thread: `<sessionId>.jsonl`.
   - Agent-tool agents: `<sessionId>/subagents/agent-<id>.jsonl` beside `agent-<id>.meta.json`. The meta
     carries `toolUseId`, `spawnDepth` and, from depth 2, `parentAgentId`. Nested agents are filed FLAT in the
     same directory.
   - Workflow-tool agents: `<sessionId>/subagents/workflows/wf_<id>/agent-<id>.jsonl`, with a meta that carries
     `workflowPhase` and no `toolUseId`, plus a `journal.jsonl`. The parent's Workflow tool result names the run
     id.
3. **Record fields, machine-wide (94,225 usage-bearing records, every transcript on this machine).**
   - Agent files: 32,147 records, all `isSidechain: true` with `agentId` equal to the file id.
   - Workflow-agent files: 11,488 records, the same shape.
   - Main files: 50,590 records, all `isSidechain: false` with no `agentId`.
   - Anomalies: none.
4. **Parent links (56 sessions that have a main file and subagents; 383 agent files).**
   - `meta.toolUseId` → the unique OTHER context whose transcript holds a `tool_use` block with that id:
     382/383. Of those, 377 parents are the main thread, and all 5 spawnDepth-2 agents link to an agent.
   - Agreement with the meta's own `parentAgentId`/`spawnDepth`: 382/382.
   - One agent has no meta file.
   - The self-exclusion matters: a fork's own file opens with a copy of its spawning `tool_use` (20 forks).
   - The parent's `toolUseResult.agentId` is NOT a usable link: three nested agents have no such record.
5. **Where a Bash result lives.**
   - In an agent transcript, the tool_result block's `content` is the only copy of the command's output (no
     `toolUseResult`).
   - The main thread carries both forms.
6. **mark-phase's printed line has one format since 6.5.2:**
   `marker <seq>: <kind>[ <stage>][ iter=<n>] <ts>`. Three suffixes (adopted pending start, mode, route) each
   print only when that marker field is present.
7. **Timing.** A second full pass over a 57 MB / 79 MB session adds 2.1 s / 5.1 s to 2.5 s / 3.4 s. So the build
   reads the context evidence in the SAME pass as the requests.

### The re-derivation over real transcripts (prototype, the recorded markers of each committed ledger)

| session    | ledger                    | rows now (committed, re-derived) | rows under the rule | context bound to                     |
| ---------- | ------------------------- | -------------------------------- | ------------------- | ------------------------------------ |
| `3c47cb74` | billing-go-live-hardening | 464 (4 contexts)                 | 233                 | the agent described "Loop D billing" |
| `3c47cb74` | invitation-accept-rules   | 365 (4 contexts)                 | 201                 | the agent described "Loop B1 …"      |
| `3c47cb74` | reauth-per-session        | 369 (4 contexts)                 | 190                 | the agent described "Loop A1 …"      |
| `3c47cb74` | svg-preview-sandbox       | 284 (2 contexts)                 | 133                 | the agent described "Loop C1 …"      |
| `f34b7a70` | org-concurrency-gaps      | 261 (3 contexts)                 | 128                 | its loop agent                       |
| `f34b7a70` | org-email-visibility      | 200 (2 contexts)                 | 101                 | its loop agent                       |
| `f34b7a70` | custom-roles              | 405 (loop + 2 nested grillers)   | 405                 | its loop agent; nested kept          |
| `f34b7a70` | team-management           | 341 (loop + 1 nested griller)    | 341                 | its loop agent; nested kept          |
| `f34b7a70` | org-activity-log          | 123 (loop + 3 main)              | 120                 | its loop agent                       |
| `f34b7a70` | team-ownership-transfer   | 206 (loop + 3 main)              | 203                 | its loop agent                       |
| `f34b7a70` | org-slug-routing          | 630 (main only)                  | 630                 | main                                 |
| `f34b7a70` | team-invitations          | 318 (main only)                  | 318                 | main                                 |
| `ed110cbf` | delete-a11y-tests         | 185 (main only)                  | 185                 | main                                 |

- **Every marker binds to one context.** Each ledger's 14 marker lines are held by exactly one context. It is the
  agent whose orchestrator-written description names that loop, which is an independent check of the binding.
- **Overlap disappears.** Cross-ledger shared rows fall from 1,060/1,482 to 0/757 in `3c47cb74`. Across the
  `f34b7a70` set they fall from 400/2,780 to 0/2,542.
- **The spawn condition (below) changed no count here.** It is kept for the main-thread variant of the same
  failure, stated in the design.
- **The build re-runs this with the BUILT code** and records the result in the measurement file and `BUILD.md`. The
  prototype is not the evidence ([[L4]]).

## Design — membership `run-window/2`

The window rule (`run-window/1`, rules 1–4 in the contract) is unchanged. A request is a member only if it is ALSO
inside the run's **context set**, and the set is read from the selected session's transcript:

1. **Context of a record** (`recordContext`, transcript-core):
   - `isSidechain === true` → `agent:<agentId>` when `agentId` is a bounded identity token.
   - `isSidechain === false` → `main`.
   - Anything else is undeterminable, and so is a record whose context disagrees with its file's (GRILL G2).

   This is the same reading the checker applies to a ledger row (`sidechain` + `agent_id`), so emitter and checker
   cannot disagree ([[L43]], below).

2. **The run's context C (the binding).**
   - Evidence: the current-run markers bound to the selected session (session match or `null`, parseable `ts`).
     Each marker's line is rebuilt by `markerLine(m)`, the ONE encoding mark-phase also prints with ([[L35]]).
   - Holders: the contexts whose tool-result text carries one of those lines as a WHOLE line.
   - Exactly one holder → C. None → unknown (`NO_CONTEXT`). More than one → unknown (`AMBIGUOUS_CONTEXT`).
     A copy of a line in a second context is therefore a refusal, never a re-binding.
3. **Links.** An agent X's parent is the unique context other than X that holds a `tool_use` block whose id is
   `agent-X.meta.json`'s `toolUseId`. The spawn time is that record's timestamp. No meta, no `toolUseId`, or not
   exactly one holder → unlinked. Workflow agents (no `toolUseId`) are unlinked by construction.
4. **The context set S.**
   - C is in S. `main` is in S only when it is C.
   - An agent is in S when its parent is in S AND its spawn lies inside the run window (session opening ≤ spawn ≤
     end). So a background agent that C spawned before the run is not the run's.
   - Unlinked, or a cycle → undecidable.
5. **Membership.** A window member is a run member iff its context is in S.
6. **Fail closed.** A window member whose context is undeterminable or undecidable makes the whole ledger
   `unknown` (`UNLINKED_CONTEXT`). The ledger is then `unavailable`, with no rows and `excluded_requests: null`.
   It is never a count that includes or drops that request silently.
7. **Recorded.** `membership.method` becomes `run-window/2`. `membership` gains `context` (C) and `contexts` (S,
   sorted), both `null` when membership is unknown or no transcript was read. `excluded_requests` now counts every
   session request outside the run: outside the window, or inside it from another context. `coverage_note` gives
   the second number.
8. **Reader in one pass.** `transcript-core.mjs` gains `recordContext` and one function that returns the requests
   (the same `sessionRequests` rule, one copy) plus the holders of the given lines and the parent links. It reads
   the meta files by listing the directory, so no path is built from a transcript value.
9. **Checker, plain mode (rule 8).** It accepts `run-window/1` (legacy, its own seven keys) and `run-window/2`
   (nine keys), each closed both ways ([[L36]]). For `/2` it:
   - recomputes the window from `markers[]`;
   - admits `unknown` with a context reason only over a known window;
   - requires `context ∈ contexts` and every row's context (`sidechain ? agent:<agent_id> : main`) to be in
     `contexts`.

   A `run-window/1` ledger with rows gets one WARN that it is not context-scoped, naming how many contexts its
   rows come from.

10. **`--verify-transcript`.** It re-derives through the emitter's own `deriveLedger` (the same rule) under the
    RECORDED markers.
    - For `/2`, `context`/`contexts` must also match.
    - A transcript that no longer binds one context (a later copy of a marker line) is a WARN, never a RED
      ([[L42]], [[L58]]).
    - A `run-window/1` ledger whose recorded rows include other contexts' requests is RED, with a message naming
      how many. The 6.28.1 precedent applies: "where it is, that RED is correct".
11. **Run report.** Its measurement label names the method read from the ledger. For `/2` it states the context
    scoping and quotes `context`/`contexts` as DATA. For `/1` it adds a "not context-scoped" caution. The UNKNOWN
    label stops saying the cause was the markers.

**Why the tool-result line is the evidence, and what that costs ([[L6]]).** L6 says a membership fact is read
from its structured location, never grepped from free text. Here no structured location exists: the environment
carries no agent id (measurement 1), and the platform records the orchestrating context nowhere. What the rule
does instead:

- It matches a WHOLE line for equality, never a substring. The line is rebuilt from the marker's own structured
  fields. It is output of PHARN's own tested code, not prose.
- The fail direction is closed: a MENTION of the line elsewhere makes the holder set ambiguous, so it is a
  refusal, not a re-binding.
- The residual is named (below): the original missing AND a mention present.

**Stated non-goals.**

- `pharn-cost-record/1` (the `ship-record.json` block) is session-scoped by its own contract and says so. It is
  not changed.
- The stage view (`attribute()`) and prices are not touched.
- Workflow-agent linking is named and not built (P7: no ledger has met a workflow agent).

## Applied lessons

- L1 — `README.md` (its checker table row claims unrelated session activity "cannot be summed in") and `CLAUDE.md`'s
  cost-ledger block state facts this increment changes, so both are in `## Files`, with the CHANGELOG entry.
- L2 — the guarantee audit's advisory/floor split is written into `cost-ledger.md` itself, and every floor op it
  cites (rule 8's set membership, the re-derivation) is one this increment's tests execute.
- L4 — the fixtures are authored, so they prove the reader's shape only; the rule is shown on real transcripts
  (the table above), re-run with the built code and recorded in the measurement file.
- L6 — the binding reads tool-result text because no structured location exists; whole-line equality, rebuilt
  from structured marker fields, ambiguity refused; the one residual is named (see Design).
- L29 — the sets are enumerated once: the membership consumers (emitter, checker rule 8, `--verify-transcript`,
  run report, `table()`) and the unknown reasons, each iterated by its tests.
- L34 — every per-row context test has a non-empty domain; `contexts` is required non-empty under a known window
  with rows, and the observed-zero case is asserted separately.
- L35 — the printed marker line gets ONE encoding, `markerLine()` in `mark-phase.mjs`, which the CLI prints and the
  binding rebuilds; the context-key vocabulary lives once, in `run-window-core.mjs`.
- L36 — `membership`'s key set is closed per method in both directions, and `UNKNOWN_REASONS` stays one closed
  set with a named context subset.
- L37 — every bound sentence written into the contract is probed by a test first (e.g. "a copy in a second
  context refuses", "a workflow agent is unlinked", "a pre-run agent is excluded").
- L42 — `--verify-transcript` answers what the transcript says NOW; a later copy of a marker line can make it
  ambiguous, so that case is a WARN, and the recorded markers, never the live file, are what it re-derives under.
- L43 — the plain checker proves rows agree with the RECORDED context set, never that the set is the run's; only
  `--verify-transcript` binds it to the transcript, and the contract says so.
- L52 — "every re-derivation of membership" is named as a set here (the five consumers under L29), and each gets
  its own test.
- L55 — `markerLine()` re-derives what the CLI prints, so a differential test runs the real CLI for every marker
  shape and compares its stdout with `markerLine()` of the marker read back from disk.
- L58 — split of the referent: rows, `contexts` and the in-window excluded part are fixed once a bounded window
  closes; the after-window tail keeps growing; the range check keeps its fixed/growing split.
- L60 — each asserted property gets its own negative control: the pre-6.29.0 overlap is shown on the same
  fixture, a mention makes the binding ambiguous, a pre-run agent flips on its spawn time.
- L62 — every new reason is a fixed string, and every file value a new RED/WARN quotes goes through the existing
  total quoters (`shown`, `valText`).
- L63 — the derivation change is checked against every existing re-derivation of rows and
  `excluded_requests`: plain rule 8, `--verify-transcript` rows, its excluded range, and the run report.
- L64 — each restatement (CHANGELOG, `CLAUDE.md`, `README.md`, module headers) is probed like its primary before
  hand-off.

## Files

- `pharn/floor/transcript-core.mjs` — `recordContext`; the one-pass reader of requests, line holders and parent links
- `pharn/floor/run-window-core.mjs` — method `run-window/2`, context vocabulary, binding, the context set, reasons
- `pharn/floor/mark-phase.mjs` — export `markerLine()`, the one encoding its CLI prints
- `pharn/floor/render-cost-ledger.mjs` — apply the context test; `membership.context`/`contexts`; `rowContext`
- `pharn/floor/check-cost-ledger.mjs` — rule 8 per method; the legacy WARN; `--verify-transcript` contexts
- `pharn/floor/render-run-report.mjs` — the measurement label reads the method and quotes the contexts
- `pharn/pharn-contracts/cost-ledger.md` — the `run-window/2` rule, its bounds and residuals
- `pharn/floor/transcript-core.test.mjs` — reader tests
- `pharn/floor/run-window-core.test.mjs` — binding and context-set tests
- `pharn/floor/mark-phase.test.mjs` — the `markerLine()` differential against the CLI
- `pharn/floor/render-cost-ledger.test.mjs` — the concurrent-runs regression and the staging helper
- `pharn/floor/check-cost-ledger.test.mjs` — rule-8 mutation controls and `--verify-transcript` cases
- `pharn/floor/cost-hostile-input.test.mjs` — staging binds the run; hostile context fields stay total
- `pharn/floor/render-run-report.test.mjs` — label tests; CLI ledgers staged with a binding
- `pharn/floor/fixtures/cost-ledger/with-subagents/00000000-0000-4000-8000-00000000cafe/subagents/agent-aaa1111111111111.jsonl` — the measured shape
- `pharn/floor/fixtures/cost-ledger/with-subagents/00000000-0000-4000-8000-00000000cafe/subagents/agent-bbb2222222222222.jsonl` — the measured shape
- `pharn/floor/fixtures/cost-ledger/with-subagents/00000000-0000-4000-8000-00000000cafe/subagents/agent-aaa1111111111111.meta.json` — a spawn link
- `pharn/floor/fixtures/cost-ledger/with-subagents/00000000-0000-4000-8000-00000000cafe/subagents/agent-bbb2222222222222.meta.json` — a spawn link
- `pharn/floor/fixtures/cost-ledger/with-routed-stage/00000000-0000-4000-8000-0000000c0de5/subagents/agent-a0f1e2d3c4b5a6978.meta.json` — gains `toolUseId`
- `pharn/floor/fixtures/cost-ledger/usage-snapshots/00000000-0000-4000-8000-00000000beef/subagents/agent-fff3333333333333.meta.json` — a spawn link
- `.dev/measurements/cost-ledger-run-scope-2026-09-27.md` — the measurements and the built-code re-derivation
- `.dev/features/cost-ledger-run-scope/BUILD.md` — the build's record (added after GATE 1, the precedent's shape)
- `CHANGELOG.md` — the 6.29.0 section
- `SKILLS_VERSION` — 6.29.0
- `README.md` — the version badge, and the checker row's claim corrected
- `CLAUDE.md` — the cost-ledger block names `run-window/2`

### Explicitly not touched

- The four trusted docs: none states a fact this changes (read this run), so no human-only patch is needed.
- `render-cost-record.mjs` and `ship-record.md`: session-scoped by design, a stated non-goal.
- `.claude/commands/**`: the commands cite the contract's "Run membership" and stay true.
- `MIN_CLI`: no installed path moves.

## Contracts satisfied

- `pharn/pharn-contracts/cost-ledger.md` — amended in this increment. It names the method `run-window/2`, the
  context rule, the two new `membership` keys and the three new unknown reasons. Its bounds (below) are carried INTO
  the contract ([[L2]]), and the Route section's concurrency sentence is corrected.
- `pharn/pharn-contracts/ship-record.md` — cited, unchanged. Its sentences stay true.

## Tests to write (P1 — the floor modules' own suites; no capability is added)

- **transcript-core:**
  - `recordContext` over the measured shapes and the hostile alphabet.
  - The one-pass reader returns `sessionRequests`' requests byte-for-byte.
  - Line holders: string content and text blocks, whole line only, a substring never counts, two contexts are two
    holders.
  - Links: parent found, self-exclusion (fork copy), no meta, no `toolUseId`, two holders, workflow agent,
    depth 2.
  - ONE OWNER and the rule-anchor mutants still pass.
- **run-window-core:**
  - The binding: zero, one and two holders; a `null` holder never binds.
  - Binding markers: current run only, session match or `null`.
  - The context set: C, main, a child in and out of the window, a grandchild, a sibling, unlinked, a cycle, and
    C = main with a pre-run agent. `CONTEXT_REASONS` ⊂ `UNKNOWN_REASONS`.
- **mark-phase — ★ DIFFERENTIAL:** every marker shape the CLI writes; stdout equals `markerLine()` of the marker
  read back, with a negative control. A closure: the print template exists once.
- **render-cost-ledger:**
  - **★ Two concurrent runs in one session**, each in its own agent, with main-thread requests inside both
    windows: disjoint rows, the main thread in neither. A control on the same bytes shows the window-only rule
    would share them.
  - A nested agent kept; a pre-run background agent excluded, and admitted when spawned inside the window.
  - Each unknown reason: `unavailable`, no rows, `null` excluded, checker GREEN.
  - The routed-stage tests still hold.
  - `rowContext` of every emitted row equals the context the emitter used.
- **check-cost-ledger:**
  - Rule 8 mutation controls, one per property.
  - A legacy `run-window/1` ledger is GREEN with the WARN; closed keys per method.
  - `--verify-transcript`: GREEN; tampered `contexts` RED; a later copy is a WARN; a legacy contaminated ledger
    RED.
- **cost-hostile-input:** the scratch run is bound; hostile `isSidechain`/`agentId`/tool-result/meta values leave
  every consumer total.
- **render-run-report:** the `/2` label, the `/1` caution, the context-reason UNKNOWN label; CLI ledgers staged
  with a binding.
- **Fixtures:** `with-subagents` moves to the measured shape (`agentId` = file id). Its D2 test is rewritten. A
  sidechain record with no `agentId` now makes membership unknown, and a test pins that.

## Guarantee audit (P0)

- "A row's context is in the recorded `contexts`" → **floor: enum-regex** (set membership in `check-cost-ledger.mjs`
  rule 8, plain mode).
- "`membership`'s key set is closed per method" → **floor: enum-regex**.
- "Given the same transcript and markers bytes, C and S are the same" → **floor** (a deterministic function,
  primitive #3 + integer compare), pinned by tests.
- "The recorded `contexts` are the run's" → **advisory** without `--verify-transcript`. With it, a floor re-derivation
  (primitive #3) that works only while the transcript exists.
- "C is the context that ran the run" → **advisory.** It rests on the platform recording a Bash result in the
  calling context's transcript, and on the orchestrator's marker output reaching that result (pinned lines print
  to stdout). Both are observed platform behaviour on an undocumented format, not floor facts. A failure of either
  reads as `unknown`, except in one named case: the output never reached the calling context, and another
  context's tool result carries a copy. Then the copy's context is measured (`cost-ledger-mention-only`, below;
  GRILL G1).
- "A concurrent run's requests are never counted" → **struck as a guarantee.** The true sentence: a request is
  counted only when the transcript links its context to the context that printed the run's markers. Ambiguity reads
  as `unknown`.
- "The transcript layout" → **advisory, machine-local, perishable**, stated in the contract.

## Trust audit (P2)

The transcript is untrusted input: tool-result text, `agentId`, `isSidechain`, meta `toolUseId`, and `tool_use`
ids. Each read value is type- and domain-tested before use. Context keys are built from an identity token only.
The meta path is taken from the directory listing, never from a transcript value.

- A crafted line can claim a marker's line, or move a request between contexts. That is the existing "a crafted
  record can move itself into or out of the window" bound, one field wider. `cost.json` gates nothing (fix #3).
- New RED/WARN text quotes file values through the existing total quoters only.

## Determinism audit (P5)

Every branch is a membership or integer test:

- holder-set size;
- `isSidechain === true` or `=== false` exactly, and agreement with the file the record was read from (GRILL G2);
- an identity-token test;
- a unique holder of a tool_use id;
- a timestamp compare.

Each undecidable case ends in `unknown`, the ledger's terminal fallback. There is no guess and no default binding.

## Named residuals (P7 — named, not built)

- `cost-ledger-workflow-agents`: a Workflow-tool agent's requests inside a run window make membership unknown. The
  link is readable through the parent's tool-result `runId`, but no ledger has met one.
- `cost-ledger-mention-only`: if the orchestrator's marker output never reaches its own tool result (redirected),
  and a DIFFERENT context later reads that output back, the reader would bind to the reader. The pinned lines print
  to the tool result, and not observed.
- `cost-ledger-shared-markers-file`: two contexts appending to ONE markers file (the same feature run twice at
  once in one checkout) are refused as ambiguous only when both print lines of the current run. The stage view
  would still mix them.
- `cost-ledger-spawn-batched`: an agent spawned in the same message as the run's first marker is stamped before
  the window opens and is excluded. The pinned flows never do this.

## Open questions (HALT) — all three resolved at GATE 1

Each was resolved by the orchestrator under the maintainer's delegation, 2026-09-27:

- **Spawn-inside-the-run condition (Design 4):** IN. It is part of defining "the run's agents", not a separate rule.
- **Legacy contaminated ledgers under `--verify-transcript`:** RED, as planned (6.28.1). GREEN plus a WARN in plain
  mode.
- **`ship-record.json`'s session-scoped cost block:** OUT. Its contract already says it is session-wide.

## Build carry-overs (GATE 1 requirements and GRILL findings, folded into the files above)

- **R1 / G5 — where holder evidence is read.** Tool-result blocks only (string content or text blocks), stated in
  the contract with its measured consequence:
  - A foreground agent's returned report is a tool result, so a quoted marker line there makes the binding
    ambiguous and the ledger `unknown`.
  - A background agent's hand-back (a `user` record, plus a `queue-operation`) is not a tool result, and neither is
    a human's chat paste. Neither changes the binding.
  - Both directions are pinned by tests.
- **R2 — the printed line is load-bearing.** `markerLine()` is its one owner. The differential test runs the real
  CLI, and `mark-phase.mjs`'s header states that changing the line changes run membership for every ledger emitted,
  or re-derived, afterwards.
- **R3 — the measurement record.**
  - It shows before/after counts from the BUILT code on `3c47cb74` and `f34b7a70`.
  - It states that `bb54cf03` — the session behind the measured trigger the orchestrator names (finding H3's
    attribution) — no longer exists, so that trigger cannot be re-derived.
- **G2 — fail closed on format drift.** `main` only on an explicit `isSidechain === false`. The record's context must
  agree with the file it was read from, else it is undeterminable.
- **G3 — the old-reader direction.** The contract's Compatibility section states it: a ≤6.28.x checker REDs a
  `run-window/2` ledger, ledgers are never rewritten, and a 6.29.0+ checker reads both methods.
- **G4 — the range check.** A `--verify-transcript` test covers another context's requests inside and after the
  window.
- **G6** — the D2 rewrite says what became unreachable. **G7** — `run-window-core.mjs`'s header claims both halves of
  membership. **G8** — a substring pre-check before the line split, and a re-measure recorded in `BUILD.md`.
