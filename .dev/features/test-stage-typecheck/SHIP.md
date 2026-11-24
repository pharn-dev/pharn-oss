# SHIP — test-stage-typecheck (CORE-347)

Stages run, in order: `/pharn-dev-plan` → GATE 1 → `/pharn-dev-grill` → `/pharn-dev-build` → `/pharn-dev-regress` (run
twice: the first run read `regressions` on a stale `pharn-install.json`, fixed, re-run in full) → `/pharn-dev-verify` →
`/pharn-dev-review` → GATE 2.

- GATE 1 (plan acceptance): model decision under delegation (orchestrator), 2026-11-24 — approved with three conditions,
  recorded in `PLAN.md` § GATE 1 decision. Not a human approval.
- GATE 2 (post-review decision): model decision under delegation (orchestrator brief: fix blockers, otherwise proceed)
  — `REVIEW.md` has 0 floor-gate findings and 2 minor advisory ones, carried as follow-ups; proceed to a pull request.
  Not a human approval.

verdict-grill: exit 0
verdict-build: exit 0
verdict-regress: no-regressions
verdict-verify: PASS
run-ended: GATE 2

After the PR opened, CI's pharn-ci diff-coverage gate read 99.41% (threshold 100%): `check-ac-types.mjs` lines 94–95,
the invalid-`package.json` branch. One test was added to `pharn/floor/check-ac-types.test.mjs` (a declared `## Files`
path, test-only, no product bytes) covering that branch and the unreadable-log branch `REVIEW.md` named as untested.
The verdicts above are from the run before that addition; CI re-runs the full suite on it.

Pointers: `REVIEW.md` (findings, advisory), `GRILL.md` (advisory), `REGRESSION.md`, `VERIFY.md`.

changelog-entry: exit 0

lesson: none

Why: the one candidate (run `npm run docs:generate` after the build's formatting pass, not before) has a single
occurrence, below L20's bar; recorded in `REVIEW.md` § Proposed lesson candidate. This run is a subagent with no form to
ask through, so no promotion was offered.

deferred: none

_Chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate._
