# PLAN — guard-wiring

- spec_content_hash: d5a974303fd0b9568945c60423ae5a89c57d7b65f5baa03657e317fbe64f33a5
- applied_lessons: [L36, L37, L40, L45, L67, L68]
- increment: Batch 2026-11-03 group G3 (LIGHT, no /pharn-dev-ship). Close the guards' fail-open-on-guard-failure path
  with `"onFailure": "block"` on both `PreToolUse` handlers (HIGH), pin it in `hook-wiring.test.cjs`, answer the
  dev-posture scratchpad finding (MED) with the finding's own test, record the MCP-tool won't-fix where README and
  SECURITY list what the guards cover (MED), and update the README fail-open prose; trusted-doc text goes to
  DOCS-PROPOSAL.md.
- layer(s): product surface `.claude/settings.json` (human patch via apply.py — protected), hook TESTS (never ship),
  README / SECURITY / CHANGELOG (repo-meta). The version bump is the orchestrator's (7.3.0), not this branch's.
- constitution_refs: [P0, P6, P7]

## Trigger (P7)

The 2026-11-03 principal review, §3: HIGH "The shipped settings.json sets no `onFailure: "block"`"; MED "#389 added
an ALLOW … for the session scratchpad in the dev posture"; MED "Both hooks ignore every `mcp__*` tool". Each was
re-opened at `dd0bb3d3` (P6) before planning.

## Decisions

1. **onFailure backward compatibility (asked first).** Documented: `onFailure` is a handler field, `"continue"` or
   `"block"`, "Requires Claude Code v2.1.295 or later" (hooks.md:447); it has no effect on `Stop` (hooks.md:951-953).
   Not documented: what a client older than 2.1.295 does with the key. Measured on the installed 2.1.312 with
   `claude doctor` over four scratch projects: an UNKNOWN handler key (`zzUnknownField`) produces no warning and no
   invalid-settings report, identical to the control, while a bad VALUE of a known key (`onFailure: "zzBogus"`) makes
   the file's settings not applied. So the validator strips unknown handler keys; an older client that does not know
   `onFailure` most likely ignores it and keeps today's fail-open behaviour. Not proven for < 2.1.295 (no such build
   is installed here, and downloading one needs the owner's permission) — recorded as a residual in NOTES.md and the
   APPLY READY report, never claimed as a guarantee (P0, L67). The two guards exit only 0 or 2 (a crash is caught and
   exits 2), so on a ≥ 2.1.295 client `"block"` changes no verdict of a guard that runs.
2. **Scratchpad (MED) is not a code bug — no hook change.** `isInOwnScratchpad()` → `ownScratchpadDir()` (enforce
   :864-874) is the ONE rule both postures use, and it already requires `<temp root>/claude-<digits>/<key>/<sid>/
scratchpad` with the base equal to a `tempRoots()` entry (os.tmpdir() / `/tmp`, realpath'd). The allow at :1355 sits
   inside `rel === null`, so an in-project target never reaches it. The finding's own test passes today; it is added as
   a pin, with a sibling case for a Claude-shaped scratchpad inside the project. `enforce-writes-scope.cjs` is not patched.
3. **MCP tools: won't fix in the hooks** (orchestrator's decision). README and SECURITY say so where they list the guards'
   coverage; LIMITS §6 already says it.
4. **README fail-open prose** updated for `onFailure`; `pharn/LIMITS.md:461-462` → DOCS-PROPOSAL.md.

## Files

- `.dev/features/guard-wiring/PLAN.md`
- `.dev/features/guard-wiring/NOTES.md`
- `.dev/features/guard-wiring/DOCS-PROPOSAL.md`
- `.dev/features/guard-wiring/apply.py`
- `.claude/hooks/hook-wiring.test.cjs`
- `.claude/hooks/enforce-writes-scope.test.cjs`
- `README.md`
- `SECURITY.md`
- `CHANGELOG.md`

## Human-applied, outside this scope

`.claude/settings.json` (protected by `protect-trusted-paths.cjs`) changes only through `apply.py` (never committed),
proven in a throwaway clone first, run by the owner, then committed as "guard-wiring: maintainer-applied human patch"
(L68: the human edit lands as its own commit).

## Lessons

- L36: the `onFailure` pin compares each wired handler as a whole object, so a variant spelling (`"Block"`, a second key)
  fails it.
- L37: the scratchpad and onFailure statements are probed (hook run / `claude doctor`), not read off the code or docs.
- L40: each new pin has a negative control that plants the defect (field removed, wrong value, on Stop).
- L45: the fix lives in the INVOKING file (settings.json), not in a guard — so the wiring test pins the invoking file.
- L67: older-client behaviour is stated from the docs' own enumeration plus one measurement, with the gap named.
- L68: the human patch is its own commit, outside any reconcile window.
