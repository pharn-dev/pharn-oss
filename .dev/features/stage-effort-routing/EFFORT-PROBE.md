# EFFORT-PROBE — does the Agent tool take `effort`, and is the sent effort observable?

Dated 2026-11-16. Written for `stage-effort-routing` (SKILLS_VERSION 7.20.0, Linear CORE-111), acceptance criteria 1
and 5. Every line below names its source. These are observations of one harness on one day, never a contract: the
Agent tool's schema is the platform's, it is not documented as stable, and a later build may change it (the residuals
`agent-effort-set-drift` and `agent-effort-param-absent` in `pharn/floor/stage-agent-core.mjs` cover that).

## 1. AC1 — does the Agent tool take `effort`, and with which values, per client

| client                                 | takes `effort`?                                                                                                 | values                                  | source                                                                                                                                                                                                                                                                                                              |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Claude Code desktop app (Code tab)     | yes, optional                                                                                                   | `low`, `medium`, `high`, `xhigh`, `max` | (a) the orchestrating session's Agent tool schema, read by that session (Claude Code 2.1.323 by its own reading); (b) this increment's planning session's own Agent tool schema, the same parameter and enum; (c) the probe subagent's transcript in §2 records `version` `2.1.325`, `entrypoint` `claude-desktop`. |
| Claude Code terminal CLI, 2.1.323      | yes, optional — except that the schema OMITS it when the environment variable `CLAUDE_CODE_EFFORT_LEVEL` is set | the same five                           | read-only `strings` over the installed binary (`~/.local/share/claude/versions/2.1.323`), not run. Minified code, so an observation, not documentation.                                                                                                                                                             |
| headless `claude -p` (the same binary) | not observed at run time                                                                                        | —                                       | not run: this session may not launch `claude -p`. It is the CLI binary above, so the same schema code ships in it; whether a headless session builds the same tool list is not measured.                                                                                                                            |
| IDE extensions, claude.ai web          | not observed                                                                                                    | —                                       | no access from this session; nothing is inferred.                                                                                                                                                                                                                                                                   |

What else the observations say, each with its source:

- **The parameter's own description** (desktop schema, and the same string in the CLI binary): set it ONLY when the
  user, or instructions such as CLAUDE.md or a skill, explicitly ask that the agent run at a specific level, never on
  the model's own judgment; and it is ignored for `subagent_type: "fork"`. A command that names the level for a routed
  stage — what `/pharn-loop` and `/pharn-ship` now do — is the sanctioned case. PHARN never requests a fork.
- **A relative variant exists in the CLI binary**: a second schema whose `effort` also takes `"lower"` and `"higher"`
  (one step from the agent's default). Which sessions get it is not observed. PHARN sends absolute levels only.
- **The enum equals the config checker's.** `pharn/floor/check-model-config.mjs`'s `EFFORT_ENUM` is the same five
  levels, so every effort `models.stages` can declare is one the tool takes. `AGENT_EFFORTS` in
  `pharn/floor/route-token-core.mjs` copies that set, and `route-token-core.test.mjs` holds the two equal.
- **Agent definitions also take an `effort` frontmatter key** in the CLI binary (a level or an integer). PHARN does not
  use it: the `pharn-stage` definition stays byte-pinned, and the Agent call's parameter routes a per-stage level that one
  definition could not.

## 2. AC5 — is the effort a request was sent with observable? One measured call

**What was run.** One Agent call from this increment's planning session (desktop app, 2026-11-16): `subagent_type:
"general-purpose"`, `model: "haiku"`, `effort: "low"`, prompt "Reply with exactly the single word: ok. Do not use any
tools." It replied `ok`.

**What its transcript recorded** (`~/.claude/projects/<project>/<session>/subagents/agent-<id>.{meta.json,jsonl}`;
field counts from a `grep -o` over the files, ids omitted):

| record                | field                     | value                       |
| --------------------- | ------------------------- | --------------------------- |
| `meta.json`           | `effort`                  | `low`                       |
| `meta.json`           | `model` / `requestShape`  | `haiku` / `foreground`      |
| request records (3)   | `output_config`           | `{"effort":"low"}`          |
| assistant records (2) | `effort`, `perTurnEffort` | `low`, `low`                |
| assistant records     | served `model`            | `claude-haiku-5-5`          |
| all records           | `version`, `entrypoint`   | `2.1.325`, `claude-desktop` |

**Control.** The planning session itself was spawned with no `effort`: its `meta.json` has no `effort` key, and its
request records carry `"output_config":{"effort":"high"}` and `perTurnEffort` `high` (no other level appears in
its transcript): the level it inherited.

**What this shows, and what it does not.** The effort an Agent call requests reaches the requests its subagent sends,
and the transcript records it in three places, so the effort a stage agent was sent with CAN be read after a run. That
is evidence from a transcript format the platform does not document — the same standing as `cost.json`'s served
`requests[].model` (agreement between two records, never proof; L43). It does NOT show:

- that a **routed stage** gets it: this was a direct Agent call, not a stage started by `stage-agent.mjs start` and run
  as `pharn-stage`. The first routed loop run on 7.20.0 (or CORE-112's effort pairs) is where that is read;
- that a lower level changes a stage's quality or cost: n = 1, a one-word prompt, no comparison;
- anything about a client other than the desktop app.

PHARN's ledger does not read the field yet: neither the stage-start marker nor `cost.json` records a requested or sent
effort (follow-up `cost-ledger-served-effort`).

## 3. Not measured here — named, not claimed

- **The before/after comparison** the ticket asks for (catch counts on the benchmark features of
  `.dev/measurements/loop-baseline-2026-11-11.md` §11 and on a probe set): the probe set (CORE-90) does not exist yet, so
  no comparison was run. CORE-112's effort pairs are where it is measured. Every stage still declares `effort: high`, so
  this increment changes what a routed stage is REQUESTED at only where a session would otherwise have inherited a
  different level.
- **A harness that refuses a level, or lists no `effort`**: not observed in a run. The commands' rule (call once more
  without `effort`, report `effort not applied`) is advisory text, pinned by `.dev/floor/stage-agent-type.test.mjs`,
  never exercised.
