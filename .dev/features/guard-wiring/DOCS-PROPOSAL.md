# DOCS-PROPOSAL — guard-wiring (batch 2026-11-03, G3)

Trusted-doc text this group needs and cannot write. Line numbers are as of `dd0bb3d3` (== `origin/batch/audit-2026-11-03`
when this was written). Each change is valid only once `.claude/settings.json` carries `"onFailure": "block"` on both
`PreToolUse` guard handlers (this branch's maintainer-applied patch).

## 1. `pharn/LIMITS.md` §7, lines 447-449 — the opening sentence's "non-blocking" now has an exception

Old (447-449):

```text
`PreToolUse` hooks actually **run**. Claude Code runs a command hook in Claude's **current** directory, and
treats a hook that exits with anything other than 0 or 2 — including one whose script cannot be found — as a
non-blocking error. Until `SKILLS_VERSION` 6.1.0 the shipped wiring was a relative `node .claude/hooks/…`,
```

New:

```text
`PreToolUse` hooks actually **run**. Claude Code runs a command hook in Claude's **current** directory, and
treats a hook that exits with anything other than 0 or 2 — including one whose script cannot be found — as a
non-blocking error, unless the hook sets `"onFailure": "block"` (Claude Code 2.1.295 or later), which both guards
do since 7.3.0. Until `SKILLS_VERSION` 6.1.0 the shipped wiring was a relative `node .claude/hooks/…`,
```

## 2. `pharn/LIMITS.md` §7, lines 461-465 — "no hook can change it" is stale since Claude Code 2.1.295

Old (461-465):

```text
- **A guard that cannot start, or that times out, still does not block.** That is Claude Code's documented
  behaviour, and no hook can change it. What a running guard controls is its own exit, and both deny (exit 2) on
  input they cannot use — an empty or unreadable stdin, invalid JSON, a payload that is not an object — and on an
  uncaught exception, through a handler each registers before its first decision. A process
  killed by a signal, or one that fails before that handler is registered, exits otherwise and does not block.
```

New:

```text
- **A guard that cannot start, or that times out, blocks only on Claude Code 2.1.295 or later.** Since 7.3.0 both
  guard handlers in the shipped `settings.json` carry `"onFailure": "block"`, and Claude Code documents that a
  command hook with that field which cannot start, exits with a code other than 0 or 2, or times out blocks the tool
  call. Without the field, the same failure is a non-blocking error and the write proceeds. What a client older than
  2.1.295 does with the key is undocumented. On 2.1.312 `claude doctor` reports nothing for an unknown hook-handler key,
  so an older client most likely ignores the field and stays fail-open, but no older client was measured. The field
  reaches an install only through its own `settings.json`, as the anchoring did (next bullet). A running guard still
  controls its own exit: both deny (exit 2) on input they cannot use — an empty or unreadable stdin, invalid JSON, a
  payload that is not an object — and on an uncaught exception, through a handler each registers before its first
  decision. A process killed by a signal, or one that fails before that handler is registered, is a failure that
  `"onFailure": "block"` turns into a block on 2.1.295 or later and that does not block otherwise. The field has no
  effect on the `Stop` hook, which fails open by design (below).
```

## Not proposed

- `pharn/LIMITS.md:311-316` (§6, MCP tools outside both guards) already states the MCP bound the orchestrator chose to
  keep (won't fix in the hooks). No change.
- `pharn/LIMITS.md:564-567` (the Stop guard fails open) stays true: `onFailure` has no effect on `Stop`.
