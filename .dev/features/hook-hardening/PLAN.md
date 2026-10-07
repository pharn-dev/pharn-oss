# PLAN — hook-hardening

- feature: hook-hardening
- applied_lessons: [L31]

Fixes audit findings P3-Q and P3-R (2026-10-07). Both touch write-guard hook sources, which the agent's write tools may
not edit (CLAUDE.md hard constraint 1), so the source change ships as a HUMAN-RUN Python script with every input and
result pinned by sha256; it deletes itself after a successful apply. The same script applies the trusted-doc text
that 6.50.0–6.53.0 made stale (LIMITS.md §1d, §6, a new §10; THREAT-MODEL.md §2 item 7 and the memory-poisoning row),
drafted by the increments that changed it. The agent writes only the script, the tests, and the records.

- P3-Q: both hooks drain their segment queue with `pending.shift()`, which is O(n) per call, so a payload path far past
  `MAX_RESOLVED_SEGMENTS` stalled the hook quadratically (measured on main: 25k segments 0.5 s, 100k segments killed at
  120 s). The patch reads the queue by index; same segments, same order, same verdict. Patched: 100k segments 0.17 s.
- P3-R: `set-writes-scope.cjs`'s control-surface refusal compared case-sensitively, so `.CLAUDE/hooks/…` was emitted as
  scope (the protect hook still denied the write). The patch folds NFC and case in the membership test only.

Run by the orchestrator on the light path under the maintainer's 2026-10-07 delegation. That choice is a model decision,
not a human approval; applying the hook patch IS the human step.

## Approach

L31: `resolvePhysicalTarget` is a deliberate copy in both hooks, pinned byte-equal by a test; the patch applies the same
edit to both copies, and the builder checked the two function bodies stay identical after patching.

## Files

- `.dev/features/hook-hardening/apply_protected_edits.py` — **NEW, never committed.** The human-run patch (sha256-pinned
  before and after); it deletes itself after applying.
- `.dev/features/hook-hardening/PLAN.md` — **NEW.** This file.
- `.claude/hooks/protect-trusted-paths.test.cjs` — **EDIT.** The lexical-mutant anchor follows the new loop text; a
  long-path timing test.
- `.claude/hooks/enforce-writes-scope.test.cjs` — **EDIT.** A long-path timing test.
- `.claude/hooks/set-writes-scope.test.cjs` — **EDIT.** Case and Unicode variants of every control-surface path refused.
- `.dev/memory-bank/lessons-learned.md` — **EDIT, by `/pharn-dev-memory-promote`.** L72, at the maintainer's request.
- `docs/lessons-index.md` — **EDIT, by `gen-lessons-index.mjs`.** Regenerated after L72.
- `CHANGELOG.md` — **EDIT.** A patch section.
- `SKILLS_VERSION` — **EDIT.** Patch bump (hook sources are product surface).
- `README.md` — **EDIT.** The version badge.

Applied by the human with the script above, not by the agent: `.claude/hooks/protect-trusted-paths.cjs`,
`.claude/hooks/enforce-writes-scope.cjs`, `.claude/hooks/set-writes-scope.cjs`, `LIMITS.md`, `THREAT-MODEL.md`.
