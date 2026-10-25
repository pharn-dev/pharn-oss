# REGRESSION — loop-cost-6-73-2

**Verdict: `no-regressions`** (`pharn/floor/check-regress.mjs verdict`, exit 0). Machine report:
`regression-report.json`.

- **Base:** `471a54bb` (`HEAD`; the build is in the working tree, so Step 1 resolves `base = HEAD`).
- **Inside (6):** `measure.mjs`, `CHANGELOG.md`, `README.md`, this feature's `PLAN.md` and `GRILL.md`, and
  `.dev/measurements/loop-wall-clock-2026-10-25.md`.
- **Outside gates, base → head:** `tests` 0 → 0 (171 files; per test 5,952 passed / 6 skipped at base, 5,957 passed /
  1 skipped at head, 0 failed both sides); `validate` 0 → 0; `structural:…/expected-injection-comment.json` 0 → 0.
  Style gates skipped: no shared style config changed. Both sides ran in 19 min 59 s in total.

## Scope: four paths left out of `--changed`, and why

The first `scope` call exited **1**, with `escaped` = `.claude/skills/pharn-ci-cover`, `.claude/skills/pharn-ci-explain`,
`.claude/skills/pharn-ci-install` and `skills-lock.json`. None is this build's write:

- all four were untracked in the session's opening `git status` (`?? .claude/skills/`, `?? skills-lock.json`), before
  the plan existed;
- `npm run check:reconcile` at that point read **CLEAN**: 4 paths reconciled (the build's four `## Files`), no
  escapes, and the four paths are in the build epoch's baseline unchanged.

So `scope` was re-run with those four removed from `--changed` (exit 0, `escaped: []`). This is a hand-exclusion, which
the command discourages, and it is recorded here for that reason. The paths are the user's, left untouched.
`check-regress scope` tests changed-since-base, not written-by-the-build (L17), and a pre-existing untracked file
falls in that gap.

The verdict is the helper's. That the four paths were not written by this build is evidenced above, not
floor-guaranteed: the reconcile baseline is unauthenticated state under `.pharn/`.
