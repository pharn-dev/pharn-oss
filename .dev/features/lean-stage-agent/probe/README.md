# CORE-107 probe kit (lean-stage-agent)

Measures AC2 (the `pharn-stage` type's first request as a fraction of `general-purpose`'s, with the same project
instruction files loaded in both), AC3 live (an out-of-scope Write inside the type is denied by the writes-scope hook)
and AC1's binding (the probed `.claude/agents/pharn-stage.md` is the file `stage-agent-type.test.mjs` pins).

The run of 2026-11-16 and its result are recorded in [`../MEASUREMENTS.md`](../MEASUREMENTS.md). This directory holds
what that run used: `prompt.md` (byte for byte the prompt that was measured), `read-probe.mjs` (the reader) and this
file. Nothing here is a test, and no test pins it: an edit to the reader, or to the `audit.mjs --prefix` it calls, is
caught only by re-running it.

It needs a FRESH Claude Code session started in a tree that already holds `.claude/agents/pharn-stage.md`: Claude Code
discovers a definition only in a session that started after the file existed. An agent's Bash cannot launch it, so a
person runs step 2.

Placeholders: `<repo>` is a checkout of this repository, `<kit>` is this directory in it
(`<repo>/.dev/features/lean-stage-agent/probe`), `<probe-tree>` is a scratch directory outside the checkout, and
`<sha>` is the commit whose `pharn-stage.md` you want to measure.

## 1. The probe tree

A detached scratch worktree of the commit to measure:

```bash
git -C <repo> worktree add --detach <probe-tree> <sha>
```

Do not run anything else in that tree first: `pharn/.run/writes-scope.json` must be absent, so the write guard applies
its fail-closed default (`pharn/floor/**` is outside it).

## 2. The run (a person, in a terminal)

```bash
cd <probe-tree> && claude -p "$(cat <kit>/prompt.md)" --permission-mode acceptEdits --model opus
```

`--permission-mode acceptEdits` lets step 3's Write reach the hook (the permission layer would otherwise stop it first).
No `--allowedTools` is needed: no step runs Bash. Run it once; a second run makes a second session, and the reader
picks the newest. `$(cat …)` drops the file's trailing newline, so the session's first message is the file minus it.

## 3. The reading (anyone, any time after)

```bash
node <kit>/read-probe.mjs <probe-tree>
```

It prints one row per subagent (first-request usage per token class through the repo's own
`.dev/features/pipeline-performance-audit/audit.mjs --prefix`, run from the probe tree, plus tool count, tool-schema and
system bytes), each type's tool names, both transcripts' instruction files (path, type, content hash) and whether they
are identical, the **AC2 fraction**, the write probe's tool result and whether the target exists afterwards (**AC3
live**), and the probed file's SHA-256 against `PINNED_SHA256` (**AC1**). It exits 2 if a subagent is missing or ran
as another type (a fallback), and it writes nothing. It finds the session under Claude Code's per-project transcript
directory in your home directory; `--session-dir <dir>` names one instead.

Its output holds absolute paths (the session directory with its id, the instruction files, the write target).
Generalize them before quoting the output in a committed record.

## Bounds

- One session, one model, that session's skills, MCP servers and Claude Code version. The fraction holds within it;
  it does not transfer to the 94–97k-token stage agents of a real run, whose prompt is a brief and not one line.
- The probe prompt is one line, not a stage brief, so the measured difference is the container's: tool schemas, system
  prompt, and anything Claude Code adds per type.
- If the type's tool list names a tool this Claude Code does not offer (for example `MultiEdit`), the tool-name line
  shows it absent; a definition Claude Code rejected outright would make step 1 fail to start (the reader exits 2).

## Cleanup

```bash
git -C <repo> worktree remove --force <probe-tree>
```
