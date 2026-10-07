# PLAN — widening-wording

- feature: widening-wording
- applied_lessons: none

Two optional sentences 6.54.0 (reconcile-scope-widening) left for a human: the writes-scope hook's deny bullet that says
"re-run the scope-setter" now also names verify's consequence, and LIMITS.md §6 states the 6.54.0 rule beside the
6.52.0 `merged` sentence. Both files are protected, so they are applied by the maintainer with a sha256-pinned Python
script that deletes itself. The agent updates the three golden tests that pin the deny body byte for byte, and the
release records. Light path under the maintainer's 2026-10-07 delegation (a model decision, not a human approval).

## Files

- `.claude/hooks/enforce-writes-scope.test.cjs` — **EDIT.** The three D1 golden deny bodies gain the new sentence.
- `.dev/features/widening-wording/PLAN.md` — **NEW.** This file.
- `CHANGELOG.md` — **EDIT.** Opens `## [6.54.1]`.
- `SKILLS_VERSION` — **EDIT.** `6.54.0` → `6.54.1` (patch: shipped prose).
- `README.md` — **EDIT.** The version badge.

Applied by the human with the script, not by the agent: `.claude/hooks/enforce-writes-scope.cjs`, `LIMITS.md`.
