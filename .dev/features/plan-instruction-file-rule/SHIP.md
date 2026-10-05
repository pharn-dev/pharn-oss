# SHIP — plan-instruction-file-rule

Gated `/pharn-dev-ship`, worktree `.claude/worktrees/plan-instruction-file-rule`, base `d40667d` (6.35.2).

## Where the run ended

**GATE 2.** Every stage ran, in order:

- `/pharn-dev-plan` → **GATE 1**, approved by the human ("Approve as written");
- `/pharn-dev-grill`;
- `/pharn-dev-build`;
- `/pharn-dev-regress`;
- `/pharn-dev-verify`;
- `/pharn-dev-review`.

## Structural verdicts (verbatim)

- `/pharn-dev-grill`: `check-plan-lessons.mjs` exit **0** (GREEN, 7 cited ids). Its advisory findings F1 and F2 were
  addressed in the build; see BUILD.md.
- `/pharn-dev-build`: `validate.mjs` exit **0** (`FLOOR: GREEN — 36 capabilities checked`).
- `/pharn-dev-regress`: `regression-report.json` `.verdict` = **`"no-regressions"`**.
- `/pharn-dev-verify`: `verify-report.json` `.verdict` = **`"PASS"`**: 7 gates at exit 0, `reconcile` `CLEAN`.

Review: [REVIEW.md](REVIEW.md), GREEN, 0 floor-gate findings and 4 advisory findings (cited there, not restated).
Grill: [GRILL.md](GRILL.md), advisory.

changelog-entry: exit 0

lesson: promoted L67

deferred: none

## For the human at GATE 2

- **`main` moved during the run.** `origin/main` is at 6.36.0 (#307, `dae61b2`), so this branch's 6.35.3 is stale. The
  branch needs `git merge origin/main` and a renumber to **6.36.1**. The literal `6.35.3` appears in `SKILLS_VERSION`,
  the README badge, the CHANGELOG heading and its entry, the test comment and the §3e text. `CHANGELOG.md`, `README.md`
  and `SKILLS_VERSION` will conflict. The `pharn-plan.md` edits are in different regions (Step 3 here, Step 4c on
  `main`). Step 2c's GREEN was computed against the merge-base `d40667d`, before that renumber.
- **`LIMITS.md` §3e is not on the branch yet.** It was applied mid-run and then reverted, so verify's reconcile gate
  stayed clean (L67). Until it is re-added, CHANGELOG 6.35.3's "applied by a human" is false (REVIEW advisory 1). The
  text is in PLAN.md, "The `LIMITS.md §3` text".
- **A parallel session** (`instruction-growth-gate`, same base) is building the instruction-growth floor gate that this
  entry calls unbuilt (REVIEW advisory 4).
- **PENDING, not done:** the post-merge dogfood. The next pharn-starter `/pharn-plan` that changes no convention should
  name no instruction file in `## Files`.

## After GATE 2 — the human chose "fix"

The human chose **fix**. The orchestrator then committed (`aa8e0e9`), opened PR #310 and merged `origin/main`. Main
had moved twice during the run: 6.36.0 (#307), then 6.37.0 (#308). So the renumber target became **6.37.1**, not the
6.36.1 named above.

- The conflicts were in `CHANGELOG.md`, `README.md` and `SKILLS_VERSION`.
- Main's released sections were kept byte-for-byte: the CHANGELOG diff against `origin/main` removes zero lines.
- The renumbered lines were found by diffing the added lines against `origin/main`.
- The run records above still say 6.35.3 / 6.36.1, as written at the time.
- The gates were re-run after the merge (see the PR).
- `LIMITS.md` §3e is still the human's edit, and its version tag reads `6.37.1`.

Chain ran; the named floor verdicts are as shown. This is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate.
