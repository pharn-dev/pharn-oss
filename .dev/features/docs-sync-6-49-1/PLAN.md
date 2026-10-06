# PLAN — docs-sync-6-49-1

- feature: docs-sync-6-49-1
- applied_lessons: none

A documentation sync after 6.42.0–6.49.0, made outside the `/pharn-dev-*` pipeline at the maintainer's request.
It applies the trusted-doc proposals still pending on `main` and corrects three hand-written sentences that the last
eight merges made stale. The trusted docs are edited by a human running `apply-trusted-doc-edits.py`, never through
the agent's write tools. This file exists so the write scope below is declared, not to drive a build.

## Files

- `CLAUDE.md` — **EDIT.** The `validate.mjs` sentence names both `pharn/pharn-core/` skills.
- `README.md` — **EDIT.** The version badge; the entry gates in the `/pharn-loop` and `/pharn-ship` paragraphs; the
  cost paragraph's per-pass suite claim.
- `CHANGELOG.md` — **EDIT.** Opens `## [6.49.1] - 2026-10-06`.
- `SKILLS_VERSION` — **EDIT.** `6.49.0` → `6.49.1` (patch: corrections to shipped trusted-doc prose).
- `.dev/features/docs-sync-6-49-1/apply-trusted-doc-edits.py` — **NEW.** The human-run patch for the trusted docs
  and the matching `.dev/floor/specified-primitives.json` registration.
- `.dev/features/docs-sync-6-49-1/PLAN.md` — **NEW.** This file.
- `.dev/floor/specified-primitives.json` — **EDIT, by the script.** Registers the `catalogue-installed-skills.mjs`
  citation. Declared here so `check:reconcile` judges the script's write as in scope.

Edited by the human-run script, not by the agent: `LIMITS.md`, `THREAT-MODEL.md`, `pharn/ARCHITECTURE.md`, and the
manifest above.
