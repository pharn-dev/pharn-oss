# NOTES — guard-wiring (batch 2026-11-03, G3)

## 1. onFailure backward compatibility — answered before any write

Sources, fetched raw on 2026-11-03 (`curl -sS https://code.claude.com/docs/en/{hooks,settings}.md`), plus a
`claude-code-guide` agent that also read `settings-reference.md`, `debug-your-config.md` and the Claude Code CHANGELOG.

Documented:

- hooks.md:447 — `onFailure` is a command-hook handler field, `"continue"` or `"block"`, "Requires Claude Code v2.1.295
  or later". It goes on the handler object (hooks.md:910-930 example), not the matcher group.
- hooks.md:904, :941-949 — with `"block"`, a hook that cannot start, exits other than 0/2, times out or prints invalid
  output blocks the action; "a `PreToolUse` failure blocks the tool call".
- hooks.md:951-953 — "The field has no effect on these hooks: `Stop`, …".
- settings.md:199-200 — a "value the schema rejects" is a Settings Error (the file is skipped); "an unknown hook event
  name" is a Settings Warning (that entry skipped, the rest kept).
- settings-reference.md (agent report, :3400) — `attribution: false` (a new VALUE of a known key): "earlier versions
  reject it and skip the whole … settings file". (:5110) a new top-level key, `sshHostCommands`: older clients load a
  file that holds it.
- CHANGELOG 2.1.295 — "Added `onFailure: "block"` for command and HTTP hooks"; nothing about older clients.

NOT documented: what a client older than 2.1.295 does with an unknown key inside a hook handler.

Measured (installed Claude Code 2.1.312, `claude doctor`, four scratch projects with one `PreToolUse` `Write` handler
each; probe script in the session scratchpad, `g3/probe.mjs`):

- `{type, command}` (control) → no settings finding.
- `{type, command, zzUnknownField: "block"}` → no settings finding, identical to the control.
- `{type, command, onFailure: "block"}` → no settings finding.
- `{type, command, onFailure: "zzBogus"}` → `Invalid settings … Invalid command hook (onFailure: Invalid option: expected
one of "continue"|"block") — a PreToolUse/PermissionRequest hook that cannot be loaded may be what guards the
permissions declared beside it, so nothing it sits in is applied until the entry is fixed or removed.`

Conclusion: the current validator ignores unknown handler keys; it rejects a bad value of a known key, and then drops
the whole file. An older client for which `onFailure` is an unknown key therefore most likely ignores it and keeps
today's fail-open behaviour. This is an inference from one current build, not a measurement of an older one: no
build older than 2.1.295 is installed here (`~/.local/share/claude/versions/` holds 2.1.310-2.1.312), and fetching one
from npm needs the owner's permission. **Judged not shown unsafe; the residual is reported in APPLY READY, never stated
as a guarantee (P0).** If the owner wants it closed: install `@anthropic-ai/claude-code@2.1.294` in a scratch dir and run
`claude doctor` in a project holding the patched settings.json.

Effect on running guards: both exit only 0 or 2 (`process.exit` sites: protect :236, :824, :955, :960; enforce :225,
:1245, :1260, :1277, :1392; a crash after the handler registers exits 2), so on ≥ 2.1.295 `"block"` changes no verdict
of a guard that runs.

## 2. Scratchpad finding (MED) — non-bug in code

`ownScratchpadDir()` (enforce-writes-scope.cjs:864-874) is the one rule both postures call; it accepts only
`<temp root>/claude-<digits>/<key>/<session_id>/scratchpad` whose base equals a `tempRoots()` entry (realpath of
`os.tmpdir()` and of `/tmp`). The dev/unsignalled allow at :1355 is inside `if (rel === null)` (target outside the root),
so an in-project target is never judged by it. The finding's own test (`scratchpad_dir: "<root>/pharn"`, write
`<root>/pharn/floor/x.mjs`) exits 2 on the unpatched hook. Added as a pin in both postures with two sibling cases and
controls; the existing `TST-12 fail-closed (dev)` test already pins "not under a temp root". No hook patch.

## 3. MCP tools — won't fix in the hooks (orchestrator's decision)

README ("Detected, not prevented" bullet; the trusted-docs paragraph) and SECURITY ("Not a bypass") now say it.
LIMITS §6 (:311-316) already did — no trusted-doc proposal for it.

## 4. Trusted docs

`pharn/LIMITS.md:447-449` and `:461-465` → `DOCS-PROPOSAL.md`.

## Gates

(recorded below after the run)
