# SHIP — loop-replan-rounds (7.8.0)

Stages run, in order: `/pharn-dev-plan` → GATE 1 → human trusted-doc patch (commit `8839760`) → `/pharn-dev-grill` →
plan amendment → `/pharn-dev-build` → `/pharn-dev-regress` → `/pharn-dev-verify` → `/pharn-dev-review` → GATE 2.

- **GATE 1 (plan acceptance): the maintainer**, in chat, "Approve as written", 2026-11-11, after answering the plan's
  open questions (two re-plan rounds; archive `PLAN.md` too; keep S16; build now; trusted docs by a patch script).
- **Trusted-doc edits: the maintainer**, who ran the patch script for `pharn/ARCHITECTURE.md`, `pharn/THREAT-MODEL.md`
  and `pharn/LIMITS.md` and committed it (`8839760`) before the build anchored (L68); the plan's `spec_content_hash` was
  re-pinned to the new ARCHITECTURE bytes.
- **Plan amendment after the grill:** `PLAN.md` §7 records it (reconcile exempts the archives, grants for `current` and
  `next`, `next`'s pre-check and roll-back, `replan_from`); it re-passed `check-plan-lessons.mjs` and
  `set-writes-scope.cjs --check --from-plan` before the build anchored.
- **GATE 2 (merge / fix / abandon): the maintainer**, in chat, "Yes, ship it", 2026-11-11 — merge once the pull
  request's CI is green.

verdict-grill: exit 0
verdict-build: exit 0
verdict-regress: no-regressions
verdict-verify: PASS
run-ended: GATE 2

- Grill: advisory, `GRILL.md` (6 concerns: 0 blocking, 4 important, 2 minor; lessons declaration GREEN).
- Regress: `REGRESSION.md` / `regression-report.json` — base 8839760, 183 outside test files, base 6,104 / head 6,110
  passed, `new_failures: []`. The first verdict call used a stale `--inside` file; it was recomputed with this
  feature's scope, and both calls read `no-regressions`.
- Verify: `VERIFY.md` / `verify-report.json` — all eight gates exit 0, `reconcile` included.
- **Fix after GATE 2:** the pull request's pharn-ci diff-coverage gate failed (96.61% against 100%: twelve untested
  lines in `grill-round.mjs`). Three tests were added to `pharn/floor/grill-round.test.mjs`, a declared `## Files`
  path written under the plan's scope, and verify was re-run over that tree (PASS, eight gates; the report above is the
  re-run's). Regress was not re-run: the one changed file is inside the feature, so no outside gate's input changed.
- Review: `REVIEW.md` (GREEN, 0 floor-gate findings, 3 minor advisory).

changelog-entry: exit 0

lesson: none — the run's one slip (a stale `--inside` file from an earlier run in `pharn/.run/pharn-dev-regress/`) was
caught before any report was written and changed no verdict; one occurrence does not meet L20's bar.

deferred: none

Chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate.
