# SHIP — floor-test-glob-names

Stages run, in order: `/pharn-dev-plan` → GATE 1 → `/pharn-dev-grill` → `/pharn-dev-build` → `/pharn-dev-regress` →
`/pharn-dev-verify` → `/pharn-dev-review` → (review fixes inside `## Files`) → `/pharn-dev-verify` again → GATE 2.

- GATE 1: approved by the user in this session (2026-10-25), "Approve, script route": the plan as written, and
  writes through a scratchpad script that runs this worktree's own two write hooks before each write.
- grill: `check-plan-lessons.mjs` exit 0 (GREEN); interrogation: 8 advisory concerns, 0 blocking —
  `.dev/features/floor-test-glob-names/GRILL.md`.
- build: `node pharn/floor/validate.mjs .` exit 0 (GREEN) — `BUILD.md`.
- regress: `regression-report.json` `.verdict` = `no-regressions` — `REGRESSION.md`.
- verify: `verify-report.json` `.verdict` = `PASS` (second run, after the review fixes; the first was also `PASS`),
  reconcile `CLEAN` — `VERIFY.md`.
- review: `REVIEW.md` — GREEN, 0 floor findings, 8 advisory (6 addressed in this increment).
- changelog-entry: exit 0
- lesson: none — the one recurrence-shaped finding (Step 2b's eslint line aborts on a `(delete)` path) is a first
  occurrence, below L20's bar.
- deferred:
  - `dev-build-format-deleted-paths` — filter `/pharn-dev-build` Step 2b's scope list through an existence test before
    prettier and eslint (apparatus only).
  - `pharn-cli-retire-renamed-floor` — teach pharn-cli to retire a floor file upstream renamed, at a matching record
    hash, the way it retires the old root docs (another repository).

Pending for the human at GATE 2: apply `HUMAN-PATCH.md` (one path in `pharn/LIMITS.md` §9) as its own commit on this
branch before merge, then update the CHANGELOG [7.0.1] "Not covered" sentence that names it.

Chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate.
