# HUMAN-PATCH — audit-small-fixes (SEC-7, the prose part)

`LIMITS.md` is human-only, so this increment proposes the edit here and does not apply it. The test half of SEC-7
landed in `.claude/hooks/hook-wiring.test.cjs` (no project settings file carries `disableAllHooks`).

## H1 — `LIMITS.md` §6: name two more ways a write reaches no guard

**Where.** §6 "The write guards cover one tool surface; `Bash` is outside it", directly after the **True statement**
bullet (the one ending "and no record of it exists to reconcile later.") and before the bullet that begins "**It IS
detected AFTERWARDS".

**Old text** (the end of the True-statement bullet, unchanged, shown as the anchor):

```markdown
- **True statement:** a `Bash` write is **not denied**, and is **not detected at the time it happens**. No
  `PostToolUse` hook is wired (`grep -c PostToolUse .claude/settings.json` → `0`), so nothing observes
  the write, and no record of it exists to reconcile later.
```

**New text** (the anchor, then one new bullet):

```markdown
- **True statement:** a `Bash` write is **not denied**, and is **not detected at the time it happens**. No
  `PostToolUse` hook is wired (`grep -c PostToolUse .claude/settings.json` → `0`), so nothing observes
  the write, and no record of it exists to reconcile later.
- **`Bash` is not the only surface outside the matcher.** (a) A write made through an **MCP server's** tool — a
  filesystem server's `write_file`, say — arrives under that tool's own `mcp__<server>__<tool>` name, which is none
  of `Write|Edit|MultiEdit|NotebookEdit`; even where the matcher's pattern happens to match it, each hook's own
  anchored `isWrite` test does not, so neither guard judges it; the after-the-fact reconciliation
  below covers it exactly as it covers a `Bash` write, and no more. (b) **`"disableAllHooks": true`** in any settings
  file Claude Code loads turns off every hook, both guards included, while the wiring stays exactly as committed.
  `hook-wiring.test.cjs` RED-fails when either project file (`.claude/settings.json`, or `.claude/settings.local.json`
  when present) carries the key; a user-level `~/.claude/settings.json` lies outside the repository and is checked
  by nothing PHARN ships.
```

**Reason.** Audit SEC-7 (2026-10-12): §6 states the guards' bound as "one tool surface; `Bash` is outside it", which a
reader takes as the whole bound. The MCP route has the same shape as `Bash` (a tool name the matcher does not name),
and `disableAllHooks` disarms both guards without touching any file a PHARN check reads outside the repository. The
test half bounds the project files only; the user-level file is the residual this sentence names.

**Bytes.** `LIMITS.md` ships, so this edit needs its own patch bump and CHANGELOG entry when applied (it is not part of
6.64.3's bytes). Prettier keeps the list as written (2-space continuation indent, 120 columns).
