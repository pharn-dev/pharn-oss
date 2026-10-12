# PLAN — loop-no-prompts

- spec_content_hash: 75088a82d113bc52cdd3d5fb2e44533e81cba5f520877f5eaa441ced45fb0fd6
- applied_lessons: [L29, L36]
- increment: `/pharn-loop` stops asking a person anything mid-run — it pre-approves its own pinned tool calls through
  the command's `allowed-tools` frontmatter, and it never calls `ExitPlanMode` / `AskUserQuestion` (a run started
  in plan mode stops at entry with one line instead of asking).
- layer(s): product `.claude/` surface (a `pharn-*` command) + dev floor test
- constitution_refs: [P0, P5, P6, P7]

## Trigger (P7) — the observed failure

- **2026-10-12, phargus session `acb7a6c5…`:** `/pharn-loop --quick …` was invoked while the session was in plan
  mode (`permissionMode: plan`). The orchestrator's first tool call after reading the quick part was
  `ExitPlanMode`, and the run waited ~67 s for the person to approve it ("User has approved exiting plan mode").
  The user's request for this increment came two minutes later: "pharn-loop command still asks for acceptance or
  anything. IT NEEDS TO BE FULLY AUTONOMOUS".
- **Bash permission prompts:** `phargus/.claude/settings.local.json` holds a "don't ask again" grant for
  `node pharn/floor/mark-phase.mjs --name agent-ndjson-export --kind orchestrator`, a line only `/pharn-loop`
  runs (the `agent-ndjson-export` loop, 2026-10-05). So that run prompted on the loop's own pinned lines. Its
  transcript is gone, so the full set of prompted lines is not measurable.
- **Not the cause:** PHARN's own prose. `stage-agent-core.mjs` rule 3 already tells a loop stage agent "ask no
  one", and the loop's stuck-point table (S1–S14) maps every sub-stage question to a stop. The asks come from
  the Claude Code harness (permission mode, permission prompts), which the command never addressed.

## What Claude Code allows (docs, read this run via a docs agent; cited, not verified live)

- `allowed-tools` in a command's frontmatter **grants** the listed tools for the turn that invokes the command; it
  never restricts, and the grant clears at the user's next message. `/pharn-loop` runs as ONE turn (the Stop guard
  holds the turn open), so the grant covers the whole orchestrator run. Deny/ask rules still win.
- No command or skill can change the permission mode. Plan mode blocks edits until a person approves a plan;
  `allowed-tools` is not documented to lift that.
- Subagents "inherit the parent conversation's permission rules". The docs are SILENT on whether a command's
  turn-scoped grant reaches a stage agent spawned in that turn. **Stated as a residual, not claimed.**
- Patterns: `Bash(node pharn/floor/*)` — `*` matches any text including spaces, and each subcommand of a compound
  line must match on its own.

## Applied lessons

- L29 — the remedy is quantified over a set ("every line the loop pins"), so the deliverable is that set
  enumerated in one place: the new test extracts EVERY ` ```bash ` line from all three loop files
  (`pharn-loop.md`, `pharn-loop-quick.md`, `pharn-loop-close.md`) and requires each subcommand to match an
  `allowed-tools` pattern — not an assertion written for the one `mark-phase` line that prompted.
- L36 — presence is not closure: besides "every pinned line is covered", the test asserts the converse closure,
  that every `Bash(...)` pattern in `allowed-tools` is used by at least one pinned line, so a grant cannot drift
  wider than what the loop actually runs.

## Files

- `.claude/commands/pharn-loop.md` — add `allowed-tools:` frontmatter (exact list below); add a `### Step 1 — No
harness prompts` paragraph: never call `AskUserQuestion` or `ExitPlanMode` during a run; if the session is in
  plan mode, stop before Step 1a with one line (nothing written, no marker, no record) telling the person to leave
  plan mode and run it again; name the stage-agent residual and that an unattended run wants a permission mode
  that does not prompt for the project's own gates (auto mode, or allow rules). Bump `version:`. — layer: product
  `.claude/` command
- `.dev/floor/command-hygiene.test.mjs` — new test block "pharn-loop allowed-tools covers every pinned line" (L29
  enumeration + L36 closure, above) and "pharn-loop never prescribes AskUserQuestion / ExitPlanMode as an action"
  (the two tool names appear only in the no-prompts paragraph). — layer: dev floor test
- `SKILLS_VERSION` — 6.57.0 → 6.58.0 (minor: the command gains a harness grant it did not have)
- `CHANGELOG.md` — one new 6.58.0 entry
- `README.md` — two sentences in the hand-written `/pharn-loop` quick-start paragraph (README:132–141, outside the
  generated markers): start it outside plan mode; it pre-approves its own pinned lines, while the stage agents'
  project commands follow the session's permission mode. (Checked at grill: the generated regions list command
  NAMES only, so `docs:generate` changes nothing and `docs/capabilities/**` is not touched.)

### The `allowed-tools` list (derived from the pinned lines this run, 2026-10-12)

```text
Read, Write, Edit, Glob, Grep, Agent, Skill,
Bash(node pharn/floor/*), Bash(node .claude/hooks/*),
Bash(git rev-parse *), Bash(git symbolic-ref *), Bash(git status *),
Bash(mkdir -p .pharn/*), Bash(cat .pharn/*)
```

Bare `Write` / `Edit` pre-approve the harness prompt only. PHARN's two `PreToolUse` guards still judge every write
(fix #2, fix #7), so the grant does not widen what the run may write.

## Contracts satisfied

- `pharn/pharn-contracts/loop-record.md` — unchanged; the plan-mode stop happens before `pharn/features/<name>/`
  exists, which that contract and Step 2 already route to "no record, straight to the summary".

## Evals to write (P1)

- No capability (`role:`) is added or changed, so no eval. The checks are the two dev-floor tests above.

## Guarantee audit (P0)

- "every line the loop pins is covered by its `allowed-tools`" → floor: enum-regex (the new test, over the
  committed text). It says nothing about what the harness does with the grant.
- "the loop no longer prompts" → **advisory**. It depends on Claude Code honoring `allowed-tools` (harness
  behavior, outside PHARN's floor), on the session's permission mode, and on deny/ask rules the person has.
- "a stage agent does not prompt" → **not claimed**. The docs are silent on whether the grant reaches subagents;
  stated as a residual in the command.
- "the loop never asks in plan mode" → **advisory** (command prose). The model reads its own mode from the harness;
  nothing on the floor detects plan mode.
- "the grant does not widen writes" → floor: hook (fix #2 + fix #7 still run on every Write/Edit). Bash-tool writes
  remain outside both hooks, as before (`LIMITS.md §6`).

## Trust audit (P2)

- No new untrusted input. The `allowed-tools` list is trusted command text; no part of it is derived from a
  description or artifact.

## Resolved at GATE 1 (2026-10-12, the person: "get all recommended answers")

- Plan mode → **stop at entry with one line, no ask**; never call `ExitPlanMode`. No hook.
- Scope → **`allowed-tools` on `/pharn-loop` only**; no `.claude/agents/` file, no pharn-cli change, no `MIN_CLI`
  bump.

## Open questions (HALT)

- none
