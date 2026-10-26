# SHIP — release-workflow

Stages run, in order: `/pharn-dev-plan` → GATE 1 (approved by the human via the form, 2026-10-26: Q1–Q4 all the
recommended option) → `/pharn-dev-grill` → `/pharn-dev-build` → `/pharn-dev-regress` → `/pharn-dev-verify` (three runs)
→ `/pharn-dev-review`. **The run ended at GATE 2.**

## Structural verdicts, verbatim

- `/pharn-dev-grill` → `check-plan-lessons.mjs` exit `0` (GREEN). Interrogation: 5 advisory concerns (0 blocking),
  all addressed in the build without changing `## Files` (retrying polls, `--jq` filters run through `jq`, the
  ruleset-copy drift stated, no token in the body step, a printed reason per refusal).
- `/pharn-dev-build` → `node pharn/floor/validate.mjs .` exit `0` (`FLOOR: GREEN — 37 capabilities`).
- `/pharn-dev-regress` → `regression-report.json` `.verdict`: `"no-regressions"`.
- `/pharn-dev-verify` → `verify-report.json` `.verdict`: `"PASS"` (run 3). Runs 1 and 2 were `FAIL` — run 1 on
  `format:check`/`lint:md` (this run's own unformatted `PLAN.md`, and a git-ignored legacy `.pharn/` scratch file),
  run 2 on `reconcile` (moving `.pharn/` aside, with the human's approval, also moved the tracked `.pharn/ci.yml`;
  restored byte-identical). Details: `VERIFY.md`.
- `/pharn-dev-review` → `REVIEW.md`: GREEN, 0 floor-gate findings, 5 advisory. See `.dev/features/release-workflow/REVIEW.md`
  and `GRILL.md`.

changelog-entry: exit 0

Also measured, not a stage verdict: `npm run check:surface-bump` exit 0 (no product-surface path changed).

lesson: none — the run's surprises are already canon (L61: a git-ignored file still reddens `lint:md`; L13: format an
artifact after every edit), and the `.pharn/ci.yml` slip is a one-off that reconcile caught as designed.

deferred: none

## Not done here (human-only, in the PR description)

- Watch the merge's own `release` run (it should tag `v7.1.2`); run `workflow_dispatch` on `main` only if it fails.
- A tag ruleset protecting `v*` from deletion and update, leaving creation allowed.
- Optional: split ruleset 18045407 so required status checks have no bypass actor while PR review keeps the owner's.
- Apply `HUMAN-PATCH.md` (LIMITS §11, THREAT-MODEL §4 item 2) as its own PR, with a patch bump.
- The legacy `.pharn/` scratch (minus the tracked `ci.yml`) is in the session scratchpad, `pharn-legacy-dot-pharn/`.

## GATE 2 decision (the human, in chat, 2026-10-26)

"Apply the one-clause CONTRIBUTING fix, then commit on ci/release-workflow, push, and open the PR." The fix (REVIEW
finding `CONTRIBUTING.md:89`) landed after verify; it is one prose clause, re-checked with `format:check`, `lint:md`,
`check:contributing` and `check:reconcile` before the commit, not with a full verify re-run.

chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate.
