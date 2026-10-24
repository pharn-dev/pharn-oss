# PLAN — audit-low-human-patch

- spec_content_hash: 2c84959cbca0b2dc51aaad90f90d40e574732c9c5c83c0bda7e1481ecb0db12e
- applied_lessons: [L26, L27, L37, L64, L68]
- increment: four LOW findings of the 2026-10-12 audit whose fix lands in hook-protected files — a NUL byte in a
  payload path denies in protect-trusted-paths (SEC-11); this session's own scratchpad is writable in the dev and
  unsignalled postures (TST-12); THREAT-MODEL §5 names two more free-text channels (SEC-13); LIMITS §9 states the
  environment the project's commands run with (SEC-9, LIMITS half). Provisional 6.73.1 (patch).
- mode: LIGHT (batch 2026-10-23, agent G) — no stage commands; the orchestrator holds both gates
- constitution_refs: [P0, P2, P6, P7]

Every change to `.claude/hooks/protect-trusted-paths.cjs`, `.claude/hooks/enforce-writes-scope.cjs`, `LIMITS.md` and
`THREAT-MODEL.md` is applied by the maintainer, never by the agent through any tool, Bash included (CLAUDE.md hard
constraint 1). The agent writes the tests, a sha256-pinned self-deleting `apply.py`, its readable twin
`HUMAN-PATCH.md`, the restatements, and the version bytes — the mechanism of `hook-hardening-batch` (6.71.0, #375).

## Why (P7 — each item is a recorded audit finding, re-verified live on origin/main 6.72.1)

1. **SEC-11.** `protect-trusted-paths.cjs` `extractPaths()` passes a path holding a NUL byte through, and the
   resolution then judges a name that is not a trusted path. Probed (`.pharn/audit-low-human-patch/probe-nul.cjs`):
   `LIMITS.md\u0000x`, its absolute form, `.claude/hooks/protect-trusted-paths.cjs\u0000` and
   `pharn/CONSTITUTION.md\u0000/../x` all exit 0. `enforce-writes-scope.cjs` rejects a NUL only in the payload's
   SESSION fields (`payloadPath()`); a NUL write path there is judged by the scope like any other name (denied unless
   the scope or default covers the name — `.dev/features/x\u0000y` exits 0 in the dev posture). Node's `fs` refuses a
   NUL path, so no such write can land through a Node tool today; the guard still must not depend on that.
2. **TST-12.** In the dev and unsignalled postures `judge()` denies every out-of-root target
   (`allowedRoot` requires `install`), so this session's own harness scratchpad is denied and the out-of-root body
   sends scratch writes to Bash. The batch brief records the live failure: agents in this repo cannot Write to their
   own scratchpad and fall back to Bash heredocs. The install posture already recognises the scratchpad (rule (2),
   `ownScratchpadDir()`), outside a run with no scope.
3. **SEC-13.** `THREAT-MODEL.md §5` says "the known ones are named here" and lists three channels. Two more are
   named in shipped commands: a stage agent's final text returned into the orchestrator's context
   (`pharn-loop.md` Step 4 bounds, `pharn-ship-stages.md`, `pharn-ship-close.md` claims, `stage-agent-core.mjs`
   header) and a prior run's `## Handoff` read by `/pharn-loop` Step 1b (`loop-record.md` § Residual,
   `pharn-loop-close.md` claims).
4. **SEC-9 (LIMITS half).** `SECURITY.md` says since 6.72.1 that gates and the `/pharn-regress` base install run with
   the full process environment and that the base install runs the BASE commit's lifecycle scripts; `LIMITS.md` says
   neither. Verified: `run-gates.mjs` `gateEnv()` copies `process.env`; `stage-regress.mjs` runs the install through
   the same `spawnGate()`; no `--ignore-scripts` anywhere in the install table.

## Approach

1. **SEC-11 (protect, HUMAN).** In the `isWrite` branch, before PASS 1: if any `extractPaths()` entry contains
   `\0`, call the existing `denyMalformedHookInput("a path contains a NUL byte")` — fixed text, the path never
   echoed. Enforce is not changed (the brief's premise that it already rejects a NUL write path is half true; a
   follow-up is named, not built — P7: its NUL verdicts are scope verdicts and nothing writes such a path).
2. **TST-12 (enforce, HUMAN).** In `judge()`, out-of-root branch, after `otherTree` is computed: in a posture that
   is not the install one (`!install`), a target strictly inside `ownScratchpadDir(session)` — the SAME rule (2), no
   new shape — that is in no other git tree and holds no backslash ambiguity is allowed, in every dev/unsignalled
   mode (safe-set and scoped: a scope is root-relative and has no jurisdiction there). The memory folder is NOT
   added (follow-up). The install posture is unchanged: under a scope or an open run its scratchpad stays denied
   (named as a follow-up asymmetry). The dev out-of-root body gains ONE bullet, only when this call's payload names
   a scratchpad the rule accepts (L27: present in its own case, absent otherwise) — so the golden dev body, which
   carries no session fields, stays byte-identical. Header comments updated where they said "only toward deny".
3. **SEC-13 (THREAT-MODEL §5, HUMAN).** Items (4) and (5) in the existing style, each with where it is bounded.
4. **SEC-9 (LIMITS §9, HUMAN).** One bullet, matching SECURITY.md's wording. Plus TST-12's restatement in LIMITS
   §7 (the "only verdict changes … toward deny" sentence becomes false otherwise — L64).
5. **apply.py** (stdlib): pins every target's sha256 before and after, refuses on any mismatch before writing, every
   edit an exact single-occurrence replacement, writes all, prints a summary, deletes itself. `HUMAN-PATCH.md` is
   rendered from it. Verified (L26) by running it in a disposable `git worktree add --detach` outside this worktree,
   then the hook suites and `npm run check` there; the disposable worktree is removed. Never run in this worktree.
6. **Order (L68).** Tests + script + records + restatements are committed first; the maintainer runs the script;
   the agent commits the four applied files as their own commit, then runs every gate on the committed tree.

## Applied lessons

- L26 — the patch is verified at a real repo path: apply.py runs in a disposable `git worktree` of this branch, where
  ESLint/Prettier/markdownlint resolve the repo's own config, and `npm run check` runs there — never a loose copy.
- L27 — the dev out-of-root body names the scratchpad only when this call's payload names one the rule accepts; a
  test asserts the bullet present with the fields and absent without them, and the golden body stays byte-equal.
- L37 — every quantified sentence written (the §5 items, the LIMITS bullets, the guide, the hook comments) is probed
  against the patched hook in the disposable worktree before the after-hashes are pinned.
- L64 — the same probe covers each restatement: the CHANGELOG entry, `.dev/guides/writes-scope.md`,
  `pharn/floor/README.md`, `docs/limitations.md`, LIMITS §7, and the enforce header's posture paragraph.
- L68 — the human apply lands as its own commit before any gate run that reconciles; the maintainer is told the
  order in the hand-off.

## Files

- `.dev/features/audit-low-human-patch/PLAN.md` — this plan
- `.dev/features/audit-low-human-patch/apply.py` — the maintainer-run, sha256-pinned, self-deleting patch
- `.dev/features/audit-low-human-patch/HUMAN-PATCH.md` — its readable twin, rendered from it
- `.claude/hooks/protect-trusted-paths.test.cjs` — SEC-11 tests
- `.claude/hooks/enforce-writes-scope.test.cjs` — TST-12 tests
- `.dev/guides/writes-scope.md` — TST-12 restatement (dev/unsignalled posture, the scratch remedy)
- `pharn/floor/README.md` — TST-12 restatement (the dev posture's verdict changes)
- `docs/limitations.md` — TST-12 restatement (out-of-project paths in the other postures)
- `.dev/floor/stage-load-budget.test.mjs` — only if the trusted-doc growth crosses a stage-load ceiling
- `CHANGELOG.md` — the 6.73.1 section
- `SKILLS_VERSION` — 6.73.1 (provisional; renumbered by diff before push)
- `README.md` — the version badge

## Human-applied (never written by the agent; not in the writes-scope)

`.claude/hooks/protect-trusted-paths.cjs` (SEC-11), `.claude/hooks/enforce-writes-scope.cjs` (TST-12), `LIMITS.md`
(SEC-9, TST-12 restatement), `THREAT-MODEL.md` (SEC-13) — by the maintainer's run of `apply.py`.

## Guarantee audit (P0)

- "a payload path holding a NUL byte is denied by protect-trusted-paths" → floor: hook (exit 2), on the
  Write/Edit/MultiEdit/NotebookEdit surface only.
- "this session's own scratchpad is writable in the dev/unsignalled posture" → floor: hook allow, recognised from
  harness-set payload fields whose SHAPE is checked and whose origin is not (`LIMITS.md §7`, unchanged bound).
- "the prose matches the code" → advisory (L37/L64 probes).
- "apply.py refuses on drift" → floor: content-hash (sha256 before and after), for the bytes it was pinned to.

## Trust audit (P2)

- The NUL deny message is fixed text; the payload path is never echoed. The new scratchpad bullet is fixed text;
  no session field reaches a message (the existing ✧ test covers every body; a new case adds the dev posture).
