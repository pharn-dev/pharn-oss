# PLAN — inline-fallback-stop

- spec_content_hash: d19c3ae5ef62837c025d3dffb5e878c114e0c1d4a745caf51b4c114b9e7a8bcf
- applied_lessons: [L1, L27, L34, L50, L51, L75]
- increment: Remove `/pharn-loop`'s `--no-foreground-agent` rule, so a routed stage runs as a stage agent and is waited
  out on disk whatever the Agent tool's schema lists; `stage-agent.mjs start` accepts and ignores the old flag; the
  route token stays valid for records written before.
- layer(s): product floor (`pharn/floor/`), product command (`.claude/commands/pharn-loop.md`), dev apparatus (tests,
  guide)
- constitution_refs: [P0, P4, P5, P6, P7]

## Why (P7 — the triggering failure)

Measured, `.dev/measurements/loop-baseline-2026-11-11.md` §4: 11 of the 12 `/pharn-loop` runs started in a main session
recorded `inline:no-foreground-agent` (37 stages), so spec, plan, test and build ran in the orchestrator's own context.
The 8 that reached build carried a median of 643k tokens per orchestrator request (417k–940k), against 267k (197k–315k)
for the 8 routed runs started inside an agent that reached build. The rule was added in 6.73.2 because the loop could
not wait for a background agent; 6.74.0 added the on-disk wait (`finish --budget-ms`) and kept the rule by a human
decision ("not widened, not removed", `.dev/features/stage-agent-background-wait/PLAN.md`). 7.1.2 measured six of six
background launches waited out (`.dev/measurements/loop-interactive-cli-2026-10-26.md`), and the baseline's 24 runs
started inside an agent ran 66 routed stages as `agent:<alias>` with no S9b stop.

## Decision record — removing a rule a human kept

The 6.74.0 decision to keep the rule was a human one. **The decision to remove it was made by the orchestrating model
under the maintainer's delegation of every decision in this batch** (epic CORE-13), citing the baseline figures above.
It is recorded here as a delegated model decision, never as a human approval. GATE 1 confirms it.

## Design

1. **`pharn-loop.md`, `## Running a stage`, item 1.** Delete the paragraph "With an Agent tool whose parameters list no
   `run_in_background`, append `--no-foreground-agent` …" (live lines 564-567, with its blank line). Item 2's lead
   gains one clause, so the routed path names no schema exception: **"On start exit `0` only, the Agent call, whatever
   parameters your Agent tool lists:"**. Nothing else in the loop family changes: the `--no-agent-tool` paragraph,
   item 2's "no `run_in_background`", item 3's finish-after-every-Agent-call rule and the four `--budget-ms 570000`
   finish lines stay byte-identical.
2. **`stage-agent.mjs start` and the old flag: accept and ignore (open question Q1).** `start` still recognises the
   bare `--no-foreground-agent` (at most once; a second copy is still refused, exit 2, nothing written), but it no
   longer changes the decision: the route is decided exactly as without it (config read, `agent:<alias>` or the
   config's inline reason). It prints one stderr line, `NO_FOREGROUND_AGENT_IGNORED`, naming why (the loop waits on
   disk whichever launch the harness picks) and the residual that owns the measurement. Reason: pharn-cli never
   overwrites a user's edited command file, so an install can pair a pre-change `pharn-loop.md` (from 6.74.0 on, which
   already waits on disk) with this floor; ignoring the flag gives that install the routed stage and the wait its
   own prose already runs. `decideStart` / `startStage` lose their `noForegroundAgent` parameter (no caller outside
   `stage-agent.mjs`, read this run).
3. **`stage-agent-core.mjs`.** The reason table's `no-foreground-agent` row says the reason is retired: no `start`
   records it any more, and a record written before carries it. `INLINE_REMEDIES["no-foreground-agent"]` (kept,
   because its keys are exactly `INLINE_REASONS`) says the same instead of telling the reader to switch sessions —
   unreachable from any current `start`/`route`, so it must not name a remedy that only made sense while the flag
   decided (L27). The `stage-agent-background` residual gains a dated paragraph stating what is measured (7.1.2's six
   background launches waited out; the baseline's 66 `agent:` stages over 24 runs started inside an agent, no S9b)
   and what is not (a main-session orchestrator whose Agent tool lists no `run_in_background`, the 11 runs' setting,
   Claude Code 2.1.309 / 2.1.317, client not recorded). It claims no result for the pending observation.
4. **`route-token-core.mjs`.** `no-foreground-agent` stays in `INLINE_REASONS` (so `isRouteToken`, `mark-phase.mjs
--route`, `render-cost-ledger.mjs normalizeMarkers` and every ledger or marker file written before still read it).
   Its header comment says the member is retired and kept for those records.
5. **Pins reversed or added** (each assertion is "present in its case AND absent from the other", L27):
   - `.dev/floor/command-hygiene.test.mjs` STAGE_AGENT_WIRING (5): `pharn-loop.md`'s section no longer matches the
     rule; a new assertion closes **every file of both orchestrator families** (`pharn-loop*.md`, `pharn-ship*.md`)
     over `no-foreground-agent`, with a non-vacuity control (each file read is non-empty, and the loop family still
     names `--no-agent-tool`, L34); the item-2 clause is pinned.
   - The same file's `loop-no-prompts` test drops the two `--no-foreground-agent` tails, keeping `--no-agent-tool`.
   - **Criterion 2 is already pinned and stays pinned unchanged**: STAGE_AGENT_WIRING (4) (`start < brief < finish`
     per full-mode start line, same stage and iteration, no marker between) and `finish --budget-ms CLOSURE` (every
     loop-family finish line ends `--budget-ms 570000`). The PR cites both test names as the evidence.
   - `pharn/floor/stage-agent.test.mjs`: the `start --no-foreground-agent` test becomes "accepted and IGNORED": with
     no config it prints `inline:no-config` (the config was read), over this repo's config `agent:<alias>`, exit 0,
     the marker records that token, stderr carries the ignored note and no `runs inline (no-foreground-agent)`; mid-argv
     and `--mode quick` the same; with `--no-agent-tool` too → `inline:no-agent-tool`; twice → exit 2, no marker; as a
     `--name` value → exit 2. The usage table's duplicate case stays.
   - `pharn/floor/stage-agent-core.test.mjs`: the remedy test asserts the retired remedy names no session switch
     (`run_in_background` absent) and says it comes from an earlier record; `no-agent-tool`'s stays as it is.
   - `pharn/floor/route-token-core.test.mjs`: `isRouteToken("inline:no-foreground-agent")` is true (explicit), count
     stays 11 (message reworded).
   - `pharn/floor/render-cost-ledger.test.mjs`: `normalizeMarkers` keeps `inline:no-foreground-agent`.
   - `pharn/floor/check-cost-ledger.test.mjs`: a ledger emitted from a markers file whose build stage-start carries
     `route: "inline:no-foreground-agent"` (what a pre-change run writes) checks GREEN and keeps the route in
     `markers[]` (criterion 3).
6. **Docs.** `.dev/guides/floor-orchestration.md` (the `stage-agent.mjs` section) loses the flag from the `start` usage
   line and its paragraph says the flag is accepted and ignored. `CHANGELOG.md` `## [7.11.0]`, `SKILLS_VERSION` 7.11.0.

## Files

- `.claude/commands/pharn-loop.md` — delete the rule, item-2 clause — product command
- `pharn/floor/stage-agent.mjs` — accept and ignore the old flag; header — product floor
- `pharn/floor/stage-agent-core.mjs` — retired reason row, remedy, residual paragraph — product floor
- `pharn/floor/route-token-core.mjs` — header comment on the retired member — product floor
- `pharn/floor/stage-agent.test.mjs` — reversed pin — test
- `pharn/floor/stage-agent-core.test.mjs` — reversed remedy pin — test
- `pharn/floor/route-token-core.test.mjs` — explicit isRouteToken pin — test
- `pharn/floor/render-cost-ledger.test.mjs` — normalizeMarkers keeps the old token — test
- `pharn/floor/check-cost-ledger.test.mjs` — pre-change ledger checks GREEN — test
- `.dev/floor/command-hygiene.test.mjs` — absence pin, item-2 pin, grant tails — dev floor test
- `.dev/guides/floor-orchestration.md` — the start usage line and paragraph — dev guide
- `CHANGELOG.md` — the 7.11.0 section — repo meta
- `SKILLS_VERSION` — 7.10.3 → 7.11.0 — repo meta
- `README.md` — the version badge (`check:badge` binds it to `SKILLS_VERSION`) — repo meta; added during the build
  (the L1 sweep missed it), before any write to it: the first epoch reconciled CLEAN over 13 paths and the build
  re-ran its Step 0 (setter, then anchor) with this line present

### Not changed (read this run)

- `pharn/LIMITS.md` §8 and the other trusted docs: no sentence names the flag or the rule; "`/pharn-loop` waits either
  way" and "the inline reasons `pharn/floor/stage-agent-core.mjs`'s header lists" stay true. No patch script.
- `MIN_CLI`: unchanged (no installed path, contract or frontmatter shape moves).

## Contracts satisfied

- `pharn/pharn-contracts/stage-exit.md` — `start`'s exit codes are unchanged (0 / 3 / 2); only which token a flagged
  call yields changes.
- `pharn/pharn-contracts/cost-ledger.md` — a marker's `route` stays a valid route token (`route-token-core.mjs`).

## Evals to write (P1)

No capability (no `role:` file) is added or changed, so no `evals/` directory changes. The floor tests above are the
specification of the changed CLI.

## Acceptance criteria → how each is met and tested

1. `pharn-loop.md` no longer names the flag, and the hygiene pin asserts its absence → design 1; command-hygiene
   STAGE_AGENT_WIRING (5) and the new family-wide absence assertion.
2. Each routed start line is followed by an Agent call and a `finish --budget-ms` line (pinned) → STAGE_AGENT_WIRING (4)
   and `finish --budget-ms CLOSURE`, unchanged and green; the item-2 clause pin.
3. `isRouteToken("inline:no-foreground-agent")` stays true, and a ledger fixture from before the change still checks
   green → `route-token-core.test.mjs`, `check-cost-ledger.test.mjs`, `render-cost-ledger.test.mjs`.
4. One real run started in a main session, in the client of the 11 runs, records `agent:<alias>` on every routed stage
   and completes its waits → **not met by this increment: pending the maintainer's observation.** A subagent cannot
   start it. An observation kit (steps, project, prompt, check command) is prepared in the session scratchpad
   (`core-105/`) and the PR body states that if the wait fails there, the change is reverted and the finding recorded.
5. The residual entry in `stage-agent-core.mjs` states the new measurement → design 3 (measured and not measured; no
   claim of criterion 4).

## Guarantee audit (P0)

- "the loop no longer tells the model to append the flag" → floor: enum-regex (the hygiene absence pin over committed
  prose). That a run's orchestrator does not append it anyway → advisory (what the model sends).
- "`start` ignores the flag" → floor: the CLI's tested decision (the flag no longer reaches `decideStart`).
- "a routed stage is waited out whatever the launch" → floor for the wait's mechanics (THE WAIT, unchanged); advisory
  that the orchestrator runs `finish` after every Agent call; **not measured** in a main session whose Agent tool lists
  no `run_in_background` (criterion 4, pending).
- "records written before still validate" → floor: enum-regex (`ROUTE_TOKEN_RE` built from `INLINE_REASONS`).

## Trust audit (P2)

No new input is ingested. The stderr note is a fixed string. Stage-agent results stay DATA as before.

## Determinism audit (P5)

`start` branches on the presence of a bare argv token (membership); the route decision is unchanged.

## Applied lessons

- L1 — the meta-docs this changes are named in `## Files`: `CHANGELOG.md`, and the dev guide that documents `start`'s
  usage (`.dev/guides/floor-orchestration.md`); `CLAUDE.md` and `README.md` state no fact about the flag (swept below).
- L27 — the retired remedy must not keep advising a session switch now that no branch reaches it; the ignored-flag note
  is printed only when the flag is given, and the tests assert it present on that call and absent on a call without it.
- L34 — the family-wide absence pin carries a non-vacuity control (files non-empty, the loop family still names
  `--no-agent-tool`), so an empty read cannot pass it.
- L50 — swept by referent as well as by phrase: cites of the residual `stage-agent-background` and of the parameter
  `run_in_background` on every surface (results below), not only the flag's spelling.
- L51 — the flag's parsing is not deleted as "now unreachable": older command bytes in an install still send it, so
  `start` keeps recognising it (and its duplicate refusal) and a test pins the ignored path.
- L75 — every hit of each swept phrase is listed with a disposition below.

## Sweep (L50, L75) — `git grep` at `origin/main` `61deb6b1`, outside `.dev/features/`, `.dev/measurements/`

Phrase `no-foreground-agent` / `NO_FOREGROUND_AGENT` / `noForegroundAgent`:

- `.claude/commands/pharn-loop.md:564-567` — edited (deleted).
- `pharn/floor/stage-agent.mjs:17, 51-53, 235, 266-268, 609, 614, 639, 641, 742, 755, 769` — edited.
- `pharn/floor/stage-agent-core.mjs:72-74` (reason row), `:169` and `:206` (residual history) — edited / still true as
  dated history; `:378-379` (remedy) — edited.
- `pharn/floor/route-token-core.mjs:47` — edited; `:61` — still true (kept member).
- `pharn/floor/stage-agent.test.mjs:33, 769-822` — edited; `:1257` — still true (duplicate refused).
- `pharn/floor/stage-agent-core.test.mjs:213-216` — edited.
- `pharn/floor/route-token-core.test.mjs:31` — edited (message).
- `.dev/floor/command-hygiene.test.mjs:5145-5152, 6460-6472` — edited.
- `.dev/guides/floor-orchestration.md:513-515, 532` — edited.
- `CHANGELOG.md:901, 924, 1126, 1137, 1184-1185` — still true (released, frozen history).

Referent `stage-agent-background` / `run_in_background`:

- `pharn/LIMITS.md:680-690` (§8 launch bullet) — still true (names no flag; "waits either way").
- `README.md:158`, `docs/pipeline.md:385`, `docs/limitations.md:165-172` — still true (measured launches; no flag).
- `.claude/commands/pharn-loop.md:570` (item 2, "no `run_in_background`") — still true, kept byte-identical.
- `.claude/commands/pharn-ship-stages.md:53` (`run_in_background: false`) — still true (ship never had the flag).
- `.claude/commands/pharn-dev-verify.md:95` — unrelated (Bash tool parameter).
- `pharn/floor/stage-agent-core.mjs:125-127, 162-213`, `pharn/floor/stage-agent.mjs:71-75` — still true (the wait and
  its history), plus the new residual paragraph.
- `.dev/floor/check-ship-record.mjs:13`, `.dev/floor/command-hygiene.test.mjs:3701, 3769, 4853, 5104-5113, 6373` — still
  true (history comments and ship/verify pins unrelated to the flag).

## Open questions (HALT)

None open. Resolved at GATE 1 (2026-11-12) by the orchestrating model under the maintainer's delegation of every
decision in this batch — a delegated model decision, never a human approval:

- **Q1 — the old flag on `start`: (a), accept and ignore it.** One stderr note; a duplicate copy is still refused (exit
  2, nothing written); a test pins the ignored path. Rejected: (b) refuse with a remedy (the old prose would map exit 2
  to `inline:route-unavailable` and keep paying the inline cost under a misleading token) and (c) keep the old CLI
  behaviour (contradicts the scope). Its bound, stated in one sentence each in the `stage-agent-background` residual
  and in the CHANGELOG entry: an edited 6.73.2 `pharn-loop.md` (the one version with the flag and no wait) kept
  through every update would now route and could stop S9 on a background launch.
- **Q2 — removing the rule 6.74.0 kept: confirmed** as a model decision under delegation, citing baseline §4 (643k
  against 267k tokens per orchestrator request in runs that reached build). Never recorded as a human approval.
- **Q3 — bump: confirmed.** Minor, 7.10.3 → 7.11.0; `MIN_CLI` unchanged.
- **Criterion 4: pending the maintainer's observation.** The PR lists it as pending, names the kit's scratchpad
  folder (`core-105/`), and states the revert condition.
