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

Live probe of the field itself (Claude Code 2.1.312, `claude -p --allowedTools Write --model haiku`, two scratch
projects whose only `PreToolUse` handler runs a missing `.claude/hooks/missing-guard.cjs`; script `g3/probe-p.mjs`):

- `onFailure: "block"` → `probe.txt` NOT created; the tool error read `PreToolUse:Write hook error: [node
"${CLAUDE_PROJECT_DIR}"/.claude/hooks/missing-guard.cjs]: failed; blocking because onFailure is "block"`.
- field unset (control) → `probe.txt` created: the missing guard let the write through, which is the defect fixed here.

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

Worktree, branch head before the human patch (settings.json unpatched):

- `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 37 capabilities checked in "."`
- `npm run -s docs:check` → `CATALOG: GREEN …`, `LESSONS-INDEX: GREEN …`; `npm run -s check:changelog` → GREEN
  (`3 dated [Unreleased] entr(ies)`)
- `node .dev/floor/check-changelog-entry.mjs --merge-base origin/main` → `CHANGELOG-ENTRY: GREEN — 3 new entr(ies)`
- `node .dev/floor/check-surface-bump.mjs --merge-base origin/main` → GREEN (no product path changed yet); it REDs
  (`NOT_BUMPED`) once the settings.json patch is committed — expected in this batch (COMMON.md)
- The new `✧ both PreToolUse guard handlers carry "onFailure": "block"` test is RED here until the patch is applied;
  every other new test passes.

apply.py proof, throwaway clone of `origin/fix/guard-wiring` @ `4c8715ca` in the session scratchpad (`g3/clone`), ROOT
pointed at the clone:

- `apply.py` → `OK .claude/settings.json`, BEFORE `af2b1543…6d37`, AFTER `d218f551…3e05`, exit 0; a second run →
  `ABORT … current d218f551… != pinned BEFORE …`, `Nothing written.`, exit 1.
- `node --test hook-wiring + enforce-writes-scope` → `# tests 221 # pass 221 # fail 0`; with `protect-trusted-paths`
  added → 390/390.
- `npm test` → exit 0 (host load average ~93; the run took ~25 min).
- `format:check`, `lint`, `lint:md`, `docs:check`, `check:markers`, `check:badge`, `check:changelog`, `check:contributing`
  → exit 0. `check:reconcile` → `ESCAPE` on the UNCOMMITTED `.claude/settings.json` (always-reconciled control surface);
  after a local commit in the clone → `escapes: []`, exit 0 — so the maintainer commits the patch before running gates
  (L68).
- `validate.mjs` → GREEN 37.
