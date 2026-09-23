# SHIP — markdownlint-no-globs

**Where the run ended:** GATE 2, the post-review decision. Merge, fix or abandon is the human's call.

## Stages run, in order

1. `/pharn-dev-plan`: `PLAN.md`, approved at **GATE 1** ("Approve as written"; open question 1 resolved
   as "Include it"). The approval and the grill-driven refinements are recorded in the plan's last two
   sections.
2. `/pharn-dev-grill`: `GRILL.md`. **Verdict read:** `check-plan-lessons.mjs` exit **0**. There were 9
   advisory concerns (5 important, 4 minor). They gated nothing, and the ones inside `## Files` were
   carried into the build.
3. `/pharn-dev-build`: **Verdict read:** `node pharn/floor/validate.mjs .` exit **0**
   (`FLOOR: GREEN — 36 capabilities`). Step 2b's pinned format block ran WITH the new flag and printed
   `Linting: 12 files` for the 12 scoped `.md` paths.
4. `/pharn-dev-regress`: **Verdict read:** `regression-report.json` `.verdict` = **`"no-regressions"`**.
5. `/pharn-dev-verify`: **Verdict read:** `verify-report.json` `.verdict` = **`"PASS"`**
   (2891/2891 tests, 0 skipped, reconcile `CLEAN`).
6. `/pharn-dev-review`: [`REVIEW.md`](./REVIEW.md) is GREEN with 0 floor-gate findings and 3 advisory
   findings (1 important, 2 minor). See the file; they are not restated here. Grill log:
   [`GRILL.md`](./GRILL.md) (advisory).

After the promotion below, `npm run check` was re-run over the whole tree. It exited **0**, and
reconcile was `CLEAN` with `docs/lessons-index.md` exempted as a generated artifact.

## Recorded lines

changelog-entry: exit 0

lesson: promoted L57

deferred: none

## For the human at GATE 2

- **REVIEW's important finding should be settled before merge**, because the CHANGELOG entry freezes on
  merge. The `[6.13.1]` Fix bullet's breakdown adds up to eleven, not ten. The correct split is seven dev
  format steps plus `/pharn-ship`'s `BRIEFING.md` step running `--fix`, and the dev and product
  memory-promote checks, which are read-only.
- Named follow-up, deferred and not built: `prettier --check .` also descends into a nested
  `.claude/worktrees/` (measured). `eslint .` was not measured.
- Nothing is committed, pushed or merged. The working tree holds the increment, this feature's
  artifacts, canon L57, and the regenerated `docs/lessons-index.md`.

The chain ran, and the named floor verdicts are as shown. This is NOT a judgment that the increment is
good or wise; that is the human's call at the post-review gate.
