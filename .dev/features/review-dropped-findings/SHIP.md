# SHIP — review-dropped-findings

Branch `fix/review-dropped-findings`; audit 2026-10-12 LOOP-7 / ENF-12 (the remainder still open at 6.72.0).

## Stages run, in order

1. `/pharn-dev-plan` → `PLAN.md`. `check-plan-lessons` exited 0, citing L6, L25, L29, L34, L36, L41, L60 and L62.
2. **GATE 1: APPROVED. This was a MODEL decision by the batch orchestrator, made under the maintainer's delegation,
   not a human approval.** The orchestrator's answers:
   - no automatic retry;
   - minor bump, 6.73.0;
   - the raw free text is included, but quoted as one capped line by the checker (condition 3);
   - every caller of `merge-findings.mjs` handles exit 3 (condition 4: the sweep found `/pharn-review` Step 5 to be
     the only caller).

   All four are recorded in `PLAN.md`.

3. `/pharn-dev-grill` → `GRILL.md`. The lessons-declaration check exited 0 (the floor verdict). Three advisory
   concerns were raised. The build addressed two: U+2028/U+2029 are escaped, and `out.json` is written before the
   report. The third, the unexpanded-glob input, is left as named behavior.
4. `/pharn-dev-build`: `validate` exit **0** (GREEN).
5. `/pharn-dev-regress`, run 1: `regressions` (`tests`) — a REAL one. `PIPELINE_ARTIFACTS` lacked the new
   `merge-report.json`. **Plan amendment A1 (a model decision under the same delegation):**
   - the open epoch was reconciled first, and came back CLEAN;
   - the name was added to the four parity-bound stores (`check-regress.mjs`, `reconcile-ignore.json`,
     `worktree-fingerprint.mjs`, `.prettierignore`) and to one test;
   - the build was re-scoped and re-anchored.

   Run 2 found `regressions` (`lint`), a harness artifact: the stage's own scratch runner under `.pharn/`. With the
   runner fixed, that run read `no-regressions`.

6. A verify run was started and then stopped before it finished, so the GATE-2 review fix could land first. The
   `source`/`path` fix is in `REVIEW.md`. After that fix, the work was committed and `origin/main` was merged in
   (6.72.1 + 6.72.2).
7. `/pharn-dev-regress`, run 3 (base `01b0c9c`): `regression-report.json` `.verdict` = **`no-regressions`**.
8. `/pharn-dev-verify`: `verify-report.json` `.verdict` = **`PASS`** on all seven gates, including `reconcile` CLEAN.
9. `/pharn-dev-review` → `REVIEW.md`: 0 floor-gate findings and 4 advisory ones. 2 were fixed and 2 deferred, with
   the follow-ups `merge-source-quoting` and the `.pharn/` eslint scope.
10. **GATE 2 was delegated to the orchestrator.** Every blocking or High finding was fixed (there were none at floor
    grade; the one important finding was fixed). The decision to open the PR was a model decision under the
    delegation, not a human approval.

## Standing verdicts

- `/pharn-dev-build` → `validate` exit `0`
- `/pharn-dev-regress` → `no-regressions`
- `/pharn-dev-verify` → `PASS`
- changelog-entry: exit 0
- lesson: deferred. Candidate: "`eslint .` lints the gitignored `.pharn/` scratch tree. A stage's node runner placed
  there, which is the documented workaround for an isolated worktree's refused shell forms, turns the repo `lint`
  gate red with a defect in no repo file. Either put the runner where eslint does not look, or ignore `.pharn/` in
  `eslint.config.mjs`." Source: `REGRESSION.md`, run 2. Not promoted: this batch promotes no canon.
- deferred: `merge-source-quoting`, the raw `sources[].source` in the merged `findings.json` (`REVIEW.md`, advisory
  P2 minor).

Pointers: `REVIEW.md` (findings, not restated here) and `GRILL.md` (advisory).

The chain ran, and the named floor verdicts are as shown. This is NOT a judgment that the increment is good or wise;
that is the human's call at the post-review gate.
