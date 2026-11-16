# PLAN — stage-effort-routing

- spec_content_hash: f058fca367fabcdfecf939dc70bfb43deaadedb1b0e810b790c4aeb156d6775d
- applied_lessons: [L1, L31, L33, L36, L47, L50, L60, L68, L75]
- increment: A routed `/pharn-loop` or `/pharn-ship` stage agent is requested at the effort `models.stages` resolves for it: `stage-agent.mjs start` prints that effort beside the route token, both orchestrators' Agent calls pass it as `effort`, and where the Agent tool takes no `effort` the stage still routes and the report says the effort was not applied (Linear CORE-111, SKILLS_VERSION 7.19.0 → 7.20.0).
- layer(s): product floor (`pharn/floor/`), the product `.claude` surface (`.claude/commands/`), one contract's prose (`pharn/pharn-contracts/cost-ledger.md`); dev apparatus (`.dev/floor/` tests, `.dev/guides/`, this feature's records)
- constitution_refs: [P0, P2, P3, P5, P6, P7]

## Why (P7 — the measured trigger)

Every stage in the shipped `pharn.config.json` declares `effort: high`, and nothing applies it to a routed stage agent:
the Agent call carries `model` only (`.claude/commands/pharn-loop.md:594-597`, `.claude/commands/pharn-ship-stages.md:52-54`),
and both say "**The model is routed; effort is not**: the Agent tool takes no effort". `.dev/measurements/loop-baseline-2026-11-11.md`
§12 rates CORE-111 **go**: spec and plan are 41.4% of weighted cost, and no ledger records a served effort, so the setting
cannot be tuned. The 2026-09-29 audit (`.dev/measurements/pipeline-performance-audit-2026-09-29.md:570`) records the
same gap. The premise behind "takes no effort" (the 2.1.281 Agent tool, `.dev/features/stage-model-routing/PLAN.md:68`)
no longer holds: see Discovery.

## Discovery (read live this run, main `155d1205`, SKILLS_VERSION 7.19.0, MIN_CLI unchanged)

- **The harness probe (AC1), done at plan time** — recorded in full at build in
  `.dev/features/stage-effort-routing/EFFORT-PROBE.md`:
  - **Desktop app (Code tab).** The orchestrator's Agent tool schema (Claude Code 2.1.323, orchestrator observation,
    2026-11-16) and this planning session's own Agent tool schema both carry an optional `effort`, enum
    `["low","medium","high","xhigh","max"]`, described as "Set this ONLY when the user, or instructions such as
    CLAUDE.md or a skill, explicitly ask…", ignored for `subagent_type: "fork"`. A probe subagent's transcript records
    `version` 2.1.325 and `entrypoint` `claude-desktop`.
  - **Terminal CLI 2.1.323** (`~/.local/share/claude/versions/2.1.323`, read-only `strings` over its embedded JS, not
    run): the same `effort` parameter over the same five-level array, and code that OMITS the parameter from the
    schema when `CLAUDE_CODE_EFFORT_LEVEL` is set. A second schema variant adds relative `"lower"` / `"higher"`; PHARN
    sends absolute levels only. `claude --help` lists `--effort <level>` with the same five values (session effort).
    Minified code, not documentation: an observation, never a contract.
  - **Headless `claude -p`**: the same binary as the CLI; not run (no `claude -p` from this session — the brief).
  - **Other clients** (IDE extensions, web): not observed; the record says so rather than inferring.
- **AC5, served effort — observable, measured once.** One probe Agent call from this session (`general-purpose`,
  `model: "haiku"`, `effort: "low"`, a one-word prompt) produced a subagent transcript whose `meta.json` records
  `"effort":"low"`, whose request records carry `"output_config":{"effort":"low"}` (3), and whose assistant records carry
  `"effort":"low","perTurnEffort":"low"` (2), served `claude-haiku-5-5`. Control: this planning agent, spawned with no
  `effort`, has no `effort` key in its `meta.json` and its requests carry `output_config.effort` `high` (inherited).
  So the sent effort is readable from the transcript — an undocumented format, evidence never proof (L43's class).
- The enum `EFFORT_ENUM` (`pharn/floor/check-model-config.mjs:121`) equals the observed Agent `effort` enum.
  `check-model-config.mjs resolve` validates the whole block before printing, so a resolved effort is always a member.
- `stage-agent.mjs start` (`startStage`, `pharn/floor/stage-agent.mjs:643`) prints the token then the marker line;
  `decideRoute` → `routeFromResolved` (`stage-agent-core.mjs:529`) already parses `effort` as a string and drops it.
  `route` is not called by either orchestrator (the 6.43.0 `start`/`finish` form); no code parses `start`'s stdout —
  only the orchestrating model reads it (grep: `stage-agent.mjs start` appears in code only in its own file's header).
- Wiring pins: `.dev/floor/command-hygiene.test.mjs:5245` pins "**The model is routed; effort is not**";
  `.dev/floor/stage-agent-type.test.mjs` pins item 2 and the two close parts' route bullet (its mutation controls rely on
  the literal `took the fallback, or`, so the effort note goes in its own sentence).
- `AGENT_MODELS` is pinned in `pharn/floor/route-token-core.mjs:41` with a ✧ PARITY test reading the checker's SOURCE
  (`route-token-core.test.mjs:114-136`); the effort enum gets the same shape (AC4).
- `pharn/ARCHITECTURE.md` and `pharn/THREAT-MODEL.md`: no effort sentence (`grep -n -i effort`: only ARCHITECTURE.md:332's
  "best-effort grep"). `pharn/LIMITS.md` §8 (lines 668-670, 678-679, 683-684) goes stale → human patch (below).

## Design

1. **`pharn/floor/route-token-core.mjs`** gains the effort grammar, beside the token's, as the platform fact it is:
   `AGENT_EFFORTS = ["low","medium","high","xhigh","max"]` (frozen), `EFFORT_PREFIX = "effort:"`,
   `effortLine(level)` → `effort:<level>` or null, and `isEffortLine(v)` (clean-scalar guard, then an anchored
   alternation built from the set — L14). Header: the set is the Agent tool's `effort` enum as read in Claude Code
   2.1.323–2.1.325, and a ✧ parity test binds it to the checker's `EFFORT_ENUM`.
2. **`pharn/floor/stage-agent-core.mjs`**: `routeFromResolved` returns `{token, exit: 0, model, effort}`; an effort
   outside `AGENT_EFFORTS` is `inline:resolve-failed` (fail-closed — the real checker cannot print one; the parity test
   binds the two sets). Header: the STRUCK "effort is routed" becomes "effort is REQUESTED where the tool takes it"
   (advisory, the model's call); residual `stage-agent-effort` is replaced by `agent-effort-set-drift` (the
   `agent-model-set-drift` twin) and `agent-effort-param-absent` (the tool omits the parameter — observed in the CLI
   bundle when `CLAUDE_CODE_EFFORT_LEVEL` is set: the stage routes at the inherited effort and the summary says so).
3. **`pharn/floor/stage-agent.mjs start`**: on exit 0, a THIRD stdout line `effort:<level>` after the token and the
   marker line (the token stays exactly `route`'s line; "a second line `marker: not written`" stays true). Exit 3 and
   exit 2 unchanged. `route` unchanged (one line). Header usage/exit text updated.
4. **Both orchestrators' `## Running a stage`** (`pharn-loop.md`, `pharn-ship-stages.md`): the intro becomes
   "**The model and the effort are requested on the Agent call**" with the not-applied case; item 1 names the third
   line; item 2 adds `effort: "<level>"` (the part after `effort:` on the start line's third line) and the rule: if your
   Agent tool lists no `effort` parameter, or refuses the value without starting an agent, make the call without
   `effort` — the stage still routes — and write `effort not applied` after that stage's route token in the Step 7
   summary / `SHIP.md`. Command text stays a command (product-commands.md): the why lives in the core header.
5. **Both close parts' route bullet** (`pharn-loop-close.md`, `pharn-ship-close.md`): one added sentence — after an
   `agent:<alias>` token write `effort:<level> requested`, or `effort not applied`; a route records what was requested.
   `pharn-ship-close.md:329`'s claims line ("effort is not routed") becomes the requested-never-proven form.
6. **Prose that goes stale** (the sweep below): `check-model-config.mjs` header (2 sentences, header only),
   `cost-ledger.md:573`, `pharn.config.json`'s `_models_stages_note`, `docs/limitations.md` (2 sites), `README.md:235`,
   `.dev/guides/floor-orchestration.md`, `.dev/guides/floor-checks.md`.
7. **The probe record** `.dev/features/stage-effort-routing/EFFORT-PROBE.md` (AC1, AC5), dated, each observation with
   its source; the benchmark/probe-set comparison is NOT run here (CORE-90's probe set does not exist) and is named as
   the follow-up CORE-112's effort pairs cover.

## Applied lessons

- L1 — the meta-docs this changes are in `## Files`: `CHANGELOG.md`, `SKILLS_VERSION`, `README.md:235`, `docs/limitations.md`, both guides; `CLAUDE.md` states no effort fact (grep), so it is not touched.
- L31 — `AGENT_EFFORTS` is a deliberate copy of `EFFORT_ENUM` across two files; a ✧ parity test reads the checker's source and binds them, with a discriminating mutant, exactly as `AGENT_MODELS` ↔ `MODEL_ALIASES`.
- L33 — the "takes no effort" class is swept by its shortest invariant substrings (`no effort`, `effort is not`, `effort it inherits`, `takes none`, `stage-agent-effort`, `EFFORT keeps`), not by one sentence; hits and dispositions below.
- L36 — the effort line is a closed grammar (anchored alternation from the frozen set, clean-scalar guard first), and the tests assert a variant spelling (`Effort:high`, `effort:turbo`, trailing newline) is refused.
- L47 — the retracted "effort is not routed" is replaced by an OPEN, conditional form ("requested where the Agent tool takes it"), never a new closed claim like "effort is routed".
- L50 — the sweep also follows the referent that broke (the 2.1.281 "no effort parameter" observation): its cites in `stage-agent-core.mjs`, `check-model-config.mjs` and `floor-orchestration.md` are each in the table.
- L60 — each new pin (item 2's `effort` parameter, the not-applied rule, the close parts' note, the parity) gets an in-memory negative control that turns that one assertion red, and every anchor is asserted found before slicing.
- L68 — the `pharn/LIMITS.md` patch is a human-only write and must land BEFORE `/pharn-dev-build` Step 0's anchor (recommended) or after `/pharn-dev-verify`; the orchestrator is told at GATE 1.
- L75 — the sweep below lists every hit `path:line` with one disposition each, so grill can re-run the greps.

## Files

- `pharn/floor/route-token-core.mjs` — `AGENT_EFFORTS`, `EFFORT_PREFIX`, `effortLine`, `isEffortLine`; header — layer product floor
- `pharn/floor/route-token-core.test.mjs` — set shape, grammar closure, ✧ parity with `EFFORT_ENUM` + discriminating mutant — layer product floor (test, ships no bytes)
- `pharn/floor/stage-agent-core.mjs` — `routeFromResolved` carries/validates effort; header (struck claim, residuals) — layer product floor
- `pharn/floor/stage-agent-core.test.mjs` — `decideRoute` carries effort; an out-of-set effort is `resolve-failed` — layer product floor (test)
- `pharn/floor/stage-agent.mjs` — `start` prints `effort:<level>` as its third line on exit 0; header — layer product floor
- `pharn/floor/stage-agent.test.mjs` — the third line equals the config's effort (and a non-default one), absent on exit 3, present on a kept marker — layer product floor (test)
- `pharn/floor/check-model-config.mjs` — header only (two sentences: "it takes no effort", "its EFFORT keeps this bound"); no code — layer product floor
- `pharn/pharn-contracts/cost-ledger.md` — line 573's effort sentence — layer pharn-contracts (prose)
- `.claude/commands/pharn-loop.md` — `## Running a stage` intro, items 1 and 2 — layer product .claude
- `.claude/commands/pharn-ship-stages.md` — `## Running a stage` intro, items 1 and 2 — layer product .claude
- `.claude/commands/pharn-loop-close.md` — route bullet's effort sentence — layer product .claude
- `.claude/commands/pharn-ship-close.md` — route bullet's effort sentence; claims line 329 — layer product .claude
- `pharn.config.json` — `_models_stages_note`'s effort sentence — layer root config
- `docs/limitations.md` — the two effort statements (lines 141, 161) — layer root docs
- `README.md` — line 235, "model and effort" requested — layer root docs
- `.dev/guides/floor-orchestration.md` — `stage-agent.mjs` section's effort lines — layer dev apparatus
- `.dev/guides/floor-checks.md` — `check-model-config.mjs` section's "its EFFORT keeps this bound" — layer dev apparatus
- `.dev/floor/command-hygiene.test.mjs` — STAGE_AGENT_WIRING (5): the new intro pin, the old one closed out; COMMAND_BYTE_CEILINGS rows if measured bytes exceed (a visible raise by the measured + 10% rule) — layer dev apparatus
- `.dev/floor/stage-agent-type.test.mjs` — item 2's effort parameter and not-applied rule, the close parts' effort sentence, each with a control — layer dev apparatus
- `.dev/floor/stage-load-budget.test.mjs` — `STAGE_LOAD_CEILINGS` rows only if the measured totals exceed (visible raise) — layer dev apparatus
- `.dev/features/stage-effort-routing/EFFORT-PROBE.md` — the harness probe and the served-effort measurement (AC1, AC5) — layer dev apparatus
- `CHANGELOG.md` — `[7.20.0]` entry — layer repo meta
- `SKILLS_VERSION` — 7.19.0 → 7.20.0 — layer repo meta

### Not in this increment (human-only, or out of scope)

- `pharn/LIMITS.md` §8 — human-only (fix #2): `$SCRATCH/core-111/patch.py`, applied by a person and committed before build Step 0 (L68).
- A `triage` key in the shipped config — blocked on the installer's stage list (the ticket's constraint).
- Recording the requested or served effort in `cost.json` / the stage-start marker — a contract change; follow-up `cost-ledger-served-effort`.
- The before/after catch-count comparison on the benchmark features and the probe set — CORE-90's probe set does not exist; follow-up: CORE-112's effort pairs.
- pharn-cli's vendored `check-model-config.mjs` (pinned by sha256): a header-only edit here makes that copy lag (no rule or output change) — follow-up in pharn-cli.

## Contracts satisfied

- `pharn/pharn-contracts/stage-exit.md` — `start`'s exit numbers unchanged; only an added stdout line on exit 0.
- `pharn/pharn-contracts/cost-ledger.md` "Route" — the marker's `route` token grammar is unchanged (the effort is not a token); one sentence corrected.
- No new contract (P7): `stage-agent-core.mjs`'s header stays the protocol's spec.

## Evals to write (P1)

No capability is added or changed, so no eval pair. Tests (node --test):

- `route-token-core.test.mjs` → `AGENT_EFFORTS` frozen, five `[a-z]` members, unique; `effortLine` maps each member and returns null for `turbo`, `High`, `toString`, a number; `isEffortLine` accepts each `effort:<m>` and refuses `Effort:high`, `effort:high\n`, `effort:turbo`, `agent:opus`; ✧ PARITY: `AGENT_EFFORTS` equals the checker source's `EFFORT_ENUM` literal (anchor asserted found), and a mutant source with a sixth level fails the comparison (AC4).
- `stage-agent-core.test.mjs` → `decideRoute` over a resolved `{model:"opus",effort:"low"}` returns `effort: "low"`; over `effort:"turbo"` → `inline:resolve-failed`.
- `stage-agent.test.mjs` → `start` over this repo's config: line 3 is `effort:<config effort>`; over a config with `plan.effort: "low"`: `effort:low`; exit 3: exactly two lines; the open-stage case: three lines (AC2).
- `stage-agent-type.test.mjs` → item 2 names `` `effort: "<level>"` ``, the no-`effort` rule and `effort not applied` in its report; the close parts' route bullet carries the effort sentence; each with an in-memory control (AC3, AC6).
- `command-hygiene.test.mjs` (5) → the new intro pin; `doesNotMatch` "effort is not" in the section (AC3).

## Guarantee audit (P0)

- `start` prints the resolved effort on exit 0, and only a member of `AGENT_EFFORTS` → floor: enum-regex (tested).
- `AGENT_EFFORTS` equals the checker's `EFFORT_ENUM` → floor: enum (the ✧ parity test over the checker's source).
- The orchestrator passes `effort` on the Agent call, or omits it and reports `effort not applied` → advisory (command prose; the hygiene/type tests pin the TEXT's presence, never a run).
- `AGENT_EFFORTS` is the Agent tool's enum → advisory: a copy of a platform fact read in 2.1.323–2.1.325 (residual `agent-effort-set-drift`).
- A routed stage ran at the requested effort → **never a guarantee, struck**. The transcript's `output_config.effort` is evidence from an undocumented format (L43), measured once (EFFORT-PROBE.md).
- The effort changes a stage's quality or cost → not claimed; unmeasured here (follow-up CORE-112).

## Trust audit (P2)

No new untrusted input. The effort reaches the orchestrator as a closed-grammar line printed by floor code from a
config value the checker validated (the config is the project's, read as today). The Agent tool's returned text
remains THREAT-MODEL §5's free-text residual, unchanged.

## Determinism audit (P5)

`routeFromResolved`'s branch is set membership; the orchestrator's "tool lists no `effort`" branch is its own
reading of its schema (advisory, like `--no-agent-tool`), failing in the safe direction (the stage still routes).

## Sweep (L33/L50/L75) — phrases `no effort`, `effort is not`, `effort it inherits`, `takes none`, `stage-agent-effort`, `EFFORT keeps`, `Effort is not routed`, `not even routed`

| hit                                                           | disposition                                           |
| ------------------------------------------------------------- | ----------------------------------------------------- |
| `pharn/LIMITS.md:683-684` (and 668-670, 678-679)              | human patch (patch.py), before build Step 0           |
| `pharn/floor/stage-agent-core.mjs:159-160`, `:231`            | edited                                                |
| `pharn/floor/check-model-config.mjs:14`, `:41`                | edited (header only); pharn-cli copy lags, follow-up  |
| `pharn/floor/stage-agent.mjs:106`                             | still true (`{model, effort}` is what resolve prints) |
| `pharn/floor/stage-agent.test.mjs:616`                        | still true (a stub that prints no effort)             |
| `pharn/pharn-contracts/cost-ledger.md:573`                    | edited                                                |
| `.claude/commands/pharn-loop.md:565-566`                      | edited                                                |
| `.claude/commands/pharn-ship-stages.md:22-23`                 | edited                                                |
| `.claude/commands/pharn-ship-close.md:329`                    | edited                                                |
| `pharn.config.json:2`                                         | edited                                                |
| `docs/limitations.md:141`, `:161`                             | edited                                                |
| `README.md:235` (says model only)                             | edited                                                |
| `.dev/guides/floor-orchestration.md:496`, `:499`              | edited                                                |
| `.dev/guides/floor-checks.md` (`its EFFORT keeps this bound`) | edited                                                |
| `.dev/floor/command-hygiene.test.mjs:5245`                    | edited (the pin)                                      |
| `.dev/features/**`, `.dev/measurements/**` (dated records)    | still true at their date; not edited (L78)            |

## Open questions (HALT)

- Q1: Where may the probe record live? Recommended: `.dev/features/stage-effort-routing/EFFORT-PROBE.md` (beside the feature, as CORE-107's MEASUREMENTS.md). Alternative: `.dev/measurements/agent-effort-2026-11-16.md`.
- Q2: Edit `check-model-config.mjs`'s header (stale "takes no effort") although pharn-cli vendors it by sha256? Recommended: yes, header only, follow-up in pharn-cli; leaving a false sentence in a shipped checker is the worse drift.
- Q3: LIMITS patch timing (L68)? Recommended: the user runs patch.py and commits it BEFORE build Step 0; else after verify.
