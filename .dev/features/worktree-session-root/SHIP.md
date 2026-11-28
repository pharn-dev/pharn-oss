# SHIP — worktree-session-root (both write guards judge the session's worktree)

Stages run, in order: `/pharn-dev-plan` → GATE 1 → `/pharn-dev-grill` → `/pharn-dev-build` (round 1) → independent
review of round 1 (a read-only subagent, while round 1's regress measured) → build round 2 → `/pharn-dev-regress` →
`/pharn-dev-verify` → `/pharn-dev-review` → GATE 2.

verdict-grill: exit 0
verdict-build: exit 0
verdict-regress: no-regressions
verdict-verify: PASS
run-ended: GATE 2

changelog-entry: exit 0

lesson: none — the widening was caught by the review step the chain already runs, by the probing L37 prescribes; no
remedy here reduces to "remember next time".

## Gates and who decided them

- **GATE 1** — the maintainer, relayed by the session that started this one (pharn-ci CORE-409): "Approved + ran it",
  covering the plan, the scratchpad-helper route for in-repo writes, and an admin merge once CI is green.
- **GATE 2** — delegated in the same instruction (PR, merge when green, release 7.26.2). Recorded as a model decision
  under that delegation, not a fresh human approval.

## Writes and the maintainer's patches

- This desktop worktree session's own hooks are the main checkout's 7.26.1 copies, so every Write/Edit here was denied
  as `.claude/worktrees/<name>/…` — the very defect this fixes. Every in-repo write went through a scratchpad helper
  that ran BOTH of the worktree's patched guards exactly as Claude Code runs a hook (process cwd = the main checkout,
  `CLAUDE_PROJECT_DIR` = the main checkout, the worktree in the payload's `cwd`) and wrote only on exit 0: a dogfood of
  the fix. The hook calls are discipline; `reconcile` is the floor over every write (both epochs `CLEAN`).
- The four human-only files changed only through two maintainer patch scripts, each verified on a fresh clone first
  (applies once; a second run refuses), each committed before a build anchor (L68): patch 1 (`b844e094`: both guards,
  `settings.json` `_comment`, LIMITS §7) and patch 2 (`6314c131`: the review fix). Patch 1 was first reported run but
  had not landed (the bytes were checked); the auto-mode classifier refused typing it into the maintainer's Terminal;
  the maintainer ran both by hand.

## Build round 2

The independent review measured a widening in patch 1 (a non-git launch directory under a temp root holding an
installed tree: its own `pharn/floor/x.mjs` and `pharn.config.json` went from exit 2 to 0) and two case-spelling
defects. Round 1's in-flight regress was stopped before it reported, round 1's epoch was reconciled `CLEAN`, patch 2
was committed, and the scope was re-set and re-anchored (`PLAN.md`, "Build round 2"). Regress and verify ran on round
2 only.

## Artifacts

- Grill (advisory): `GRILL.md` — 3 minor concerns; the Stop-guard exclusion is in the CHANGELOG.
- Regress: `REGRESSION.md` / `regression-report.json` — base `6314c131`; the base's red `tests` gate is two
  manifest-drift tests the build's regeneration fixes (investigated).
- Verify: `VERIFY.md` / `verify-report.json` — PASS, 7/7 gates.
- Review (advisory): `REVIEW.md` — GREEN, 0 floor-gate findings; round 1's 6 findings all fixed in round 2.

deferred:

- The `/pharn-loop` Stop guard (`require-loop-record.cjs`) keeps the process-cwd root, so in a desktop worktree session
  it reads the main checkout's markers and is inert (fail-open). Same fix shape (a third `payloadCwd()` copy).

Chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate.
