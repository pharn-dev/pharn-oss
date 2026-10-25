# SHIP — entry-timeout-unmeasured

A thin, advisory roll-up of the `/pharn-dev-ship` chain for this increment. Each stage ran in an isolated worktree
on `fix/entry-timeout-unmeasured`, driven by a coordinator session.

## Human decisions (both given as chat answers on 2026-10-25)

- **GATE 1 (plan acceptance):** "Approve as planned (Recommended)". This settled the plan's five open questions on its
  recommendations (red-first precedence; `--allow-red-entry` also goes past an unmeasured gate; stop id S14b
  `gates-unmeasured-at-entry`; a minor bump; fold #392's entry in if it merged first). `PLAN.md` "Decisions (resolved
  at GATE 1)" records it.
- **GATE 2 (post-review decision):** "Fix all 8, then PR (Recommended)". The eight advisory findings in `REVIEW.md`
  were fixed in one iteration through the real stages (`PLAN.md` "GATE 2 fix iteration"). This roll-up is written
  after that iteration; merging the PR is the human's call.

## Stages, in order, and where the run ended

1. `/pharn-dev-plan` → `PLAN.md`, then GATE 1.
2. `/pharn-dev-grill` → `GRILL.md` (advisory, 2 minor concerns, both handled in the build). Verdict read:
   `check-plan-lessons.mjs` exit **0**.
3. `/pharn-dev-build` → verdict read: `node pharn/floor/validate.mjs .` exit **0** (GREEN, 37 capabilities).
4. `/pharn-dev-regress` → `regression-report.json` `.verdict`: **`"no-regressions"`**.
5. `/pharn-dev-verify` → `verify-report.json` `.verdict`: **`"PASS"`**.
6. `/pharn-dev-review` → `REVIEW.md` (a separate review stage; 0 floor findings, 8 advisory), then GATE 2.
7. The GATE 2 fix iteration: `/pharn-dev-build` again (re-anchored after merging `origin/main` `30968218`), `validate`
   exit **0**; `/pharn-dev-regress` **`"no-regressions"`** (base `a9e437ba`); `/pharn-dev-verify` **`"PASS"`** (7
   gates at 0, `reconcile` `CLEAN`). Those are the standing verdicts in the two JSON reports.

The run ended at GATE 2's chosen path: fixes done, PR to be opened, not merged.

## After verify: one more merge of `origin/main`

`origin/main` moved to `acb0ebbe` (#395, no version bump) after the fix iteration's verify. The branch merged it; the
only conflict was `CHANGELOG.md`, resolved by moving #395's `[Unreleased]` entry, text unchanged, into `[6.75.0]`.
`git diff 30968218 acb0ebbe --name-only` is `{.dev/features/stage-agent-background-wait/SHIP.md, CHANGELOG.md}`. Local
reconcile after that merge (`check-bash-reconcile.mjs --require-baseline`) exited **0**, `CLEAN`, with no escapes and
`merged: [".dev/features/stage-agent-background-wait/SHIP.md"]`. That set equals the diff minus `CHANGELOG.md`, which
is declared in the plan. So the expected RED on main's own files did not occur: the 6.52.0 `merged` rule reports the
file instead. The build was not re-run for this merge, which touched only `CHANGELOG.md` and main's own record.

## Version

6.75.0 (minor). It was planned as 6.74.0. #393 shipped 6.74.0 first, so the GATE 2 iteration renumbered by diff:
`SKILLS_VERSION`, the README badge, the CHANGELOG section, and the version strings in `entry-gates-core.mjs`,
`entry-gates.mjs`, `entry-gates.test.mjs`, the hygiene comment and the floor-gates guide. Main's released `[6.74.0]` is
byte-for-byte as merged. The earlier stage records keep the number they were written with.

## Deviations

- **Node runners in place of the pinned shell forms.** This isolated worktree refuses the commands' `xargs` / `$VAR`
  forms. So build Step 2b's scoped format pass, regress's partition and per-side gate runs, and verify's gate runs
  went through small node scripts under `.pharn/` that call the same tools with argv arrays: the same per-test
  reporter, checkers and gate set. They are gitignored scratch, not committed.
- **`SKILLS_VERSION` was written through Bash once.** In the first build it was written with `printf` instead of the
  Write tool. The path was declared, so the guards would have allowed it and reconcile did not flag it. The GATE 2
  iteration wrote it (6.75.0) with the Write tool.

## Records

- Review: `.dev/features/entry-timeout-unmeasured/REVIEW.md`; grill: `.dev/features/entry-timeout-unmeasured/GRILL.md`
  (both advisory). The findings are not restated here.

changelog-entry: exit 0

lesson: none — the review proposed none: the one overclaim was a single instance, and L75 already covers the stale-prose
sweep. No candidate was put to a human, and nothing was promoted.

deferred: none

Follow-ups named, none built: `gates-beyond-one-bash-call`, `build-gate-unmeasured`, and the entry check running the
full suite twice on a clean tree (`test` and `base:test`).

chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is the
human's call at the post-review gate.
