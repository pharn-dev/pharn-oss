# PROBE — does a command's `allowed-tools` honor a scoped `Skill(<name> *)` grant?

Run 2026-10-19 for GATE-1 question Q2, at the orchestrator's direction. Claude Code `2.1.303`, `claude -p "/probe"
--model haiku --output-format json`, DEFAULT permission mode (no `--permission-mode`, no skip flags), each variant
in its own scratch project under this session's scratchpad (`.../scratchpad/skillprobe/<variant>/`), outside the
repo. User settings allow no Skill rule (checked: `~/.claude/settings.json` `permissions.allow` holds two `Bash`
rules only).

Each project holds `.claude/commands/probe.md` (the grant under test in its `allowed-tools`, body: "Use the Skill
tool to invoke the skill `probe-target` with the argument string `hello --flag`") and
`.claude/commands/probe-target.md` (body: reply `PROBE-TARGET-RAN $ARGUMENTS`). The verdict is read from the JSON
result's `permission_denials` and from the session transcript's `Skill` tool_use, never from the model's prose.

## Results

| target `probe-target.md` frontmatter                                                          | grant in `probe.md`     | Skill call | `permission_denials` |
| --------------------------------------------------------------------------------------------- | ----------------------- | ---------- | -------------------- |
| `description` only                                                                            | none                    | ran        | `[]`                 |
| `description` only                                                                            | `Skill(probe-target *)` | ran        | `[]`                 |
| `description` only                                                                            | `Skill`                 | ran        | `[]`                 |
| PHARN-stage-like (`kind`, `trust`, `model`, `effort`, `reads`, `writes`, `version`; no tools) | none                    | ran        | `[]`                 |
| `allowed-tools: ["Bash(echo *)"]`                                                             | none                    | denied     | 1 (Skill)            |
| `allowed-tools: ["Bash(echo *)"]`                                                             | `Skill(other-target *)` | denied     | 1 (Skill)            |
| `allowed-tools: ["Bash(echo *)"]`                                                             | `Skill(probe-target *)` | ran        | `[]`                 |
| `allowed-tools: ["Bash(echo *)"]`                                                             | `Skill`                 | ran        | `[]`                 |

## What it shows (and what it does not)

- **A scoped `Skill(<name> *)` in a command's `allowed-tools` is honored, and it discriminates by name:** it
  pre-approves the named target and not another one (rows 5-7).
- **On this version, a Skill call to a target that declares no `allowed-tools` needs no grant at all** (rows 1-4).
  The five stage commands `/pharn-loop` invokes inline declare none, so today the grant changes nothing for them;
  the scoped grants keep the loop prompt-free if that ever changes, at no cost.
- **What the bare `Skill` grant added was exactly SEC-6's surface:** it pre-approved a target that declares
  `allowed-tools` — a skill that would otherwise be denied in `-p` and prompt interactively (row 8 against row 5).
- NOT shown: interactive-mode prompting (a `-p` denial stands in for a prompt); a `.claude/skills/<name>/SKILL.md`
  target (both targets were command files); other models or Claude Code versions; whether the grant reaches a
  subagent. One run per cell.
- Also observed, and outside this increment: a skill that declares no `allowed-tools` is invocable through the Skill
  tool with no grant and no prompt, in any session, so a user's `.claude/skills/` drop of that shape can load as
  instructions without PHARN granting anything. That is Claude Code's behavior, not a PHARN grant.

Session ids (transcripts under `~/.claude/projects/-private-tmp-claude-501-…-scratchpad-skillprobe-<variant>/`):
`none` 33b285bb, `scoped` b0c62319, `bare` 47ffc293; the other variants' ids are in each project's `out.json`.
