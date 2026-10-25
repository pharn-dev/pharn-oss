# PLAN — stage-agent-background-fix: `/pharn-loop` survives a harness that launches stage agents in the background

- spec_content_hash: 2c84959cbca0b2dc51aaad90f90d40e574732c9c5c83c0bda7e1481ecb0db12e
- applied_lessons: [L27, L29, L31, L72]
- increment: name `run_in_background`'s JSON type in both orchestrators' pinned Agent call, and give the start line a
  `--no-foreground-agent` flag, which `/pharn-loop` passes when its Agent tool offers no `run_in_background`
  parameter, so the stage runs inline (`inline:no-foreground-agent`) instead of stopping S9; rewrite the
  `stage-agent-background` residual to the observed failure.
- layer(s): product floor (`pharn/floor/route-token-core.mjs`, `stage-agent-core.mjs`, `stage-agent.mjs`), product
  commands (`.claude/commands/pharn-loop.md`, `pharn-ship-stages.md`); apparatus (hygiene test, floor guide)
- constitution_refs: [P0, P5, P6, P7]
- version: SKILLS_VERSION 6.73.1 → 6.73.2 (patch: a correction to shipped orchestration that has failed for real)

## The failure (P7 — observed 2026-10-25)

PHARN 6.72.0, installed in `~/Projects/pharn-starter-6.72` (base `9c6343b7`). Two `/pharn-loop` runs, one in a Claude
Code desktop-app session (2.1.308) and one in the terminal CLI (`claude --permission-mode auto`, 2.1.309), each stopped
at the spec stage, `blocked: stage-refused` (S9). Read this run from the transcripts in
`~/Projects/pharn-measure/run1-void/` and `run1-void-cli/`:

- each orchestrator's Agent call carried `"run_in_background":"false"` — a JSON **string**;
- each tool result began `Async agent launched successfully`;
- `pharn-loop.md` "Running a stage" item 3 then stopped the run: a background-launch notice is S9.

Also recorded (`run1-void-cli/NOTE.txt`, not re-run here): a headless 2.1.309 probe (`claude -p`) that sent the JSON
**boolean** `false` got a foreground result. And the desktop app's Agent tool, as two sessions there read their own
tool list (the measuring session, and this planning session), lists **no** `run_in_background` parameter and says
subagents run in the background with a completion notice. So in that harness a routed stage cannot run in the
foreground at all, whatever the model sends.

## Discovery (read this run; `origin/main` = `9ee54c8b`, SKILLS_VERSION 6.73.1)

1. The pinned call: `.claude/commands/pharn-loop.md:479-480` and `.claude/commands/pharn-ship-stages.md:52-53` both say
   `` `run_in_background: false` `` — a spelling a model can render as a string. `.dev/floor/command-hygiene.test.mjs`
   STAGE_AGENT_WIRING (5) pins that literal in both files' `## Running a stage`.
2. The background branch differs by command, on purpose: ship's item 3 waits for the agent's completion notice (it may
   end its turn); the loop's item 3 makes it S9 (its `Stop` guard refuses a turn end, nobody resumes it). So routing
   still works in ship under a background-only harness; only the loop dead-ends.
3. The route decision: `pharn/floor/stage-agent.mjs` `decideStart` (line 536) already maps one model-read fact to an
   inline reason without consulting the config — `--no-agent-tool` → `inline:no-agent-tool`, exit 3. `main` strips the
   bare flag from anywhere in argv before `parseArgs`, and refuses it twice.
4. The token grammar: `pharn/floor/route-token-core.mjs` `INLINE_REASONS` (10 members) builds `ROUTE_TOKEN_RE`. Every
   runtime reader goes through `isRouteToken` (`mark-phase.mjs:414`, `render-cost-ledger.mjs:508`); no contract
   enumerates the reasons (`cost-ledger.md` says `inline:<reason>` and cites the owner). `stage-agent-core.mjs`
   `INLINE_REMEDIES` must have exactly `INLINE_REASONS`' keys (a parity test); its header carries the fallback table.
5. The grants: every `/pharn-loop` start-line grant is `… --name *` or `… --name * --iteration *` or
   `… --name * --mode quick`. A flag placed right after `--name '<name>'` matches all three; one appended at the end
   falls outside the quick ones.
6. The residual: `pharn/floor/stage-agent-core.mjs:128-129` still reads as hypothetical ("a harness that backgrounds the
   agent despite `run_in_background: false`"). Its only other live cite is `.dev/guides/floor-orchestration.md:464`
   (a name list, still true). No trusted doc names it: `LIMITS.md` cites the header for the inline reasons.

## Design

1. **The JSON type, named — both orchestrators (ADVISORY).** In item 2 of each `## Running a stage`, keep the literal
   `` `run_in_background: false` `` and add that it is the JSON boolean, never the string `"false"`.
2. **`--no-foreground-agent` — the loop's instruction.** `pharn-loop.md` item 1 gains one paragraph: with an Agent tool
   whose parameters list no `run_in_background`, add `--no-foreground-agent` to the start line right after its
   `--name '<name>'` (so the existing grants still match): it records `inline:no-foreground-agent` and exits `3` —
   ADVISORY, your reading of the tool's schema, failing in the safe direction (inline on the orchestrator's model,
   never a second executor). Ship gets no such instruction: its item 3 already waits for a background agent.
3. **The CLI.** `stage-agent.mjs start` accepts the bare flag anywhere in argv, as `--no-agent-tool`, and refuses it
   twice. On an `agent` cell it returns `inline:no-foreground-agent`, exit 3, with no config consulted; a policy cell
   keeps its own reason. Both flags at once: `--no-agent-tool` wins (no Agent tool at all is the stronger fact). Header
   and usage line updated.
4. **The grammar and its remedy.** `INLINE_REASONS` gains `no-foreground-agent` after `no-agent-tool` (11 members).
   `INLINE_REMEDIES` gains a remedy reachable from that reason: run `/pharn-loop` in a Claude Code session whose Agent
   tool takes `run_in_background` (the terminal CLI does); otherwise each routed stage runs inline. The header's
   fallback table gains its row.
5. **The residual.** `stage-agent-background` rewritten: observed (versions, the string), what 6.73.2 changes, both
   halves ADVISORY; a background launch that still happens stays S9 in the loop and can leave the agent writing after
   the run's marker closes.
6. **Not in scope — follow-ups.** (a) Stopping a backgrounded stage agent before the loop's S9 stop: the CLI run left a
   spec agent running (~108k tokens) after the run closed. (b) `--no-agent-tool` is "appended", so on a `--quick` start
   line it falls outside the `--name * --mode quick` grants (not observed). (c) A real `/pharn-loop` run on 6.73.2 in
   both harnesses — the success measure, which is the pharn-starter cost measurement itself.

## Applied lessons

- L27 — the new reason gets its OWN remedy in `INLINE_REMEDIES` ("allow the Agent tool" would be unreachable: the tool
  is there), and a test asserts that remedy is printed for `inline:no-foreground-agent` and the no-agent-tool remedy is
  not.
- L29 — the set is `INLINE_REASONS`; the member is added there once, and the existing rules that iterate it
  (`ROUTE_TOKEN_RE`, the remedy-parity test, `mark-phase.test.mjs`'s token loop, the route-token tests) pick it up;
  only the count assertion is edited by hand.
- L31 — the two orchestrators are a copy-pair for the Agent call: the JSON-type obligation lands in both and the
  hygiene test asserts it for both (it already iterates both commands); the flag is deliberately loop-only, and the
  asymmetry is stated in the residual, the one owner.
- L72 — adding a member to a shared closed enum: every consumer was enumerated (Discovery 4) — all runtime readers go
  through `isRouteToken`, none compares a literal, and the only literal count is `route-token-core.test.mjs:31`.

## Files

- `pharn/floor/route-token-core.mjs` — `no-foreground-agent` in INLINE_REASONS, comment — product floor
- `pharn/floor/route-token-core.test.mjs` — the count, 11 — test
- `pharn/floor/stage-agent-core.mjs` — remedy, fallback-table row, residual text — product floor
- `pharn/floor/stage-agent-core.test.mjs` — the remedy's reachability (L27) — test
- `pharn/floor/stage-agent.mjs` — `--no-foreground-agent` on `start` — product floor
- `pharn/floor/stage-agent.test.mjs` — `start` tests for the flag — test
- `pharn/floor/mark-phase.test.mjs` — the whole-grammar token count, 15 (added during the build: an L72 miss, see BUILD.md) — test
- `.claude/commands/pharn-loop.md` — items 1 and 2 of `## Running a stage` — product command
- `.claude/commands/pharn-ship-stages.md` — item 2 of `## Running a stage` — product command
- `.dev/floor/command-hygiene.test.mjs` — STAGE_AGENT_WIRING (5) pins; byte ceilings if the commands outgrow them —
  apparatus
- `.dev/floor/stage-load-budget.test.mjs` — stage-load ceilings, if outgrown — apparatus
- `.dev/guides/floor-orchestration.md` — the start usage line and its note — apparatus
- `SKILLS_VERSION` — 6.73.2
- `CHANGELOG.md` — the 6.73.2 entry
- `README.md` — the version badge, 6.73.2 (`check:badge`)
- `.dev/features/stage-agent-background-fix/PLAN.md`
- `.dev/features/stage-agent-background-fix/GRILL.md`
- `.dev/features/stage-agent-background-fix/BUILD.md`
- `.dev/features/stage-agent-background-fix/REGRESSION.md`
- `.dev/features/stage-agent-background-fix/regression-report.json`
- `.dev/features/stage-agent-background-fix/VERIFY.md`
- `.dev/features/stage-agent-background-fix/verify-report.json`
- `.dev/features/stage-agent-background-fix/REVIEW.md`
- `.dev/features/stage-agent-background-fix/SHIP.md`

## Contracts satisfied

- `pharn/pharn-contracts/cost-ledger.md` ("Route") — unchanged: it names `inline:<reason>` and cites
  `route-token-core.mjs` as the grammar's owner, so a new member needs no contract edit (P4).
- `pharn/pharn-contracts/stage-exit.md` — unchanged: `start` keeps exit `3` for every inline token.

## Evals to write (P1)

No Capability is added or changed (no `role:` file). Tests instead:

- `start --no-foreground-agent` on an agent cell with NO config → stdout `inline:no-foreground-agent`, exit 3, marker
  route `inline:no-foreground-agent`, stderr carries its remedy and not the no-agent-tool remedy.
- the flag in the middle of argv (`--name x --no-foreground-agent --iteration 1`) → the same token (grant placement).
- on a policy-inline cell (a floor-only stage) → that cell's own reason.
- given twice → refused, exit 2, nothing written.
- with `--no-agent-tool` → `inline:no-agent-tool`.
- `isRouteToken("inline:no-foreground-agent")` true; INLINE_REASONS has 11 members.
- hygiene: both commands' `## Running a stage` name the JSON boolean; the loop's names the flag and its token.

## Guarantee audit (P0)

- `start --no-foreground-agent` on an agent cell records and prints `inline:no-foreground-agent`, exit 3, config not
  read → floor: enum-regex (closed tables, tested)
- the token is in the closed grammar and has its own remedy → floor: enum-regex (parity tests)
- the commands' text names the JSON boolean and the flag → floor: regex over the command text (hygiene test) — the TEXT
  only
- the orchestrating model sends a JSON boolean → advisory (model compliance; one headless probe is evidence, not proof)
- the model passes the flag exactly when its Agent tool lacks the parameter → advisory (its reading of its own tool
  schema)
- a routed stage then runs in the foreground or inline instead of stopping S9 → advisory, and NOT measured by this
  increment: no real `/pharn-loop` run on 6.73.2 is part of it (follow-up c)
- struck: "the loop now routes stages to their configured model in the desktop app" — there it now runs them INLINE,
  on the orchestrator's model

## Trust audit (P2)

No new input is ingested. The flag is a closed bare token; the CLI prints only closed-table values.

## Open questions (HALT)

None — resolved at GATE 1 (2026-10-25, the human: "Approve as drafted"; writes by the hook-checked Bash helper, the
human's choice for this run).
