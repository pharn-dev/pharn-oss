# SHIP — stage-load-budget

- Stages run, in order: `/pharn-dev-plan` → GATE 1 → `/pharn-dev-grill` → `/pharn-dev-build` → `/pharn-dev-regress` →
  `/pharn-dev-verify` → `/pharn-dev-review` → GATE 2 (fix) → `/pharn-dev-build` (re-anchored) → `/pharn-dev-regress` →
  `/pharn-dev-verify`. **The run ended at a RED-verdict STOP: the fix pass's `/pharn-dev-verify` returned `FAIL`.**
- GATE 1: delegated — decided by the orchestrating model under the maintainer's 2026-10-13 delegation, not a human
  approval. It approved the plan as written (keep L5; +10%/512 headroom; a PR-only CI growth step with the default
  2,048 B budget; no `SKILLS_VERSION` bump), plus one addition: the L3/L5 failure messages name the table and the
  exact row.
- Grill: `check-plan-lessons.mjs` exit 0 (FLOOR); 4 advisory minor concerns (`GRILL.md`).
- First pass:
  - Build: `validate` exit 0.
  - Regress: `regression-report.json` `.verdict` = `no-regressions` (base `8fe73d1`).
  - Verify: `verify-report.json` `.verdict` = `PASS` (after the 6.58.1 merge).
  - Review: `REVIEW.md` had 0 floor-gate findings and 4 advisory, one at blocking severity (P3).
- GATE 2: delegated — decided by the orchestrating model under the maintainer's 2026-10-13 delegation, not a human
  approval. Decision: **fix, then the merge path.** The fix had three items:
  1. move W1–W3 into `.dev/floor/instruction-growth-wiring.test.mjs`;
  2. the CHANGELOG names exactly which rules print the row;
  3. CONTRIBUTING lists all four per-PR CI bounds.

  The P1 minor is kept as a known residual.

- Fix pass:
  - Build: `PLAN.md` `## Files` amended before a re-anchor (`reconcile-baseline.mjs --anchor`, 8 paths); `validate`
    exit 0.
  - Regress: `regression-report.json` `.verdict` = `no-regressions` (base `e401ac0`; 155 outside test files 0 → 0).
  - Verify: `verify-report.json` `.verdict` = **`FAIL`**, `failing_gates: ["test"]`. The run was at HEAD `06ad659`,
    after merging `origin/main` 6.59.0 (#345).
    - The failure: 1 of 5336 tests, `pharn/floor/stage-regress.test.mjs:2207`.
    - Four full runs each failed a different timing-dependent test in `stage-regress.test.mjs` or
      `entry-gates.test.mjs`, under a load average of 110–150 from other sessions.
    - Each failing test passed when re-run alone. None is in a file this increment changes. The STAGE_LOAD_CEILINGS
      totals stayed within every ceiling after 6.59.0 (the tightest headroom is `pharn-verify`'s 2,390 B).
    - `VERIFY.md` holds the run table. That attribution is advisory; the floor verdict is `FAIL`.
  - Review: not re-run. The orchestrator's GATE-2 decision asked for one only if the fix changed more than the three
    items, and it did not.
- changelog-entry: exit 0 (re-run after the 6.59.0 merge: GREEN against merge-base `f37eabe`).
- lesson: declined — not a value in Step 2b.4's closed set; the orchestrator's GATE-2 decision, recorded as given.
  The candidate in `REVIEW.md` is L22 recurring (pinned shell forms refused in an isolated worktree turn into per-run
  runners that diverge), and parallel PRs would collide on the next L-number.
- deferred:
  - `dev-runners-isolated-worktree` — shipped runners for the dev regress/verify (and build Step 2b) procedures, so
    an isolated worktree does not re-implement them per run.
  - `stage-load-dedupe-control` — the known residual: L4's "each path counts once" control exercises a `Set`, not
    `loadSet` (an over-count only).
  - `stage-regress-load-flakes` — the timing assertions in `stage-regress.test.mjs` and `entry-gates.test.mjs` fail
    under heavy machine load (fixture gates at 30 s, kill-timing windows). Observed four times in this run, outside
    this increment.
- Decision after the RED-verdict STOP: delegated — decided by the orchestrating model under the maintainer's
  2026-10-13 delegation, not a human approval. Push and open the PR now; verify is not re-run.
  - **The local floor verdict is `FAIL`** (`failing_gates: ["test"]`).
  - Four full runs, at a load average of 110–150, each failed a **different** timing-dependent test. None of those
    tests is in this increment's files, and each passed when run alone afterwards.
  - **The merge decision rests on CI's `check` and `floor` jobs on an unloaded runner.** The orchestrator merges
    only if both are green.

Orchestration deviations (advisory): this isolated worktree's shell refused the pinned `xargs`, `$(…)` and `$?` forms.
So `/pharn-dev-build` Step 2b, `/pharn-dev-regress` Steps 1–3 and `/pharn-dev-verify` Step 1 ran through gitignored node
runners, each recorded in its stage artifact. `origin/main` moved three times during the run: `8fe73d1`, `791d205`
(6.58.1) and `f37eabe` (6.59.0). Each was merged, and the two `CHANGELOG.md` conflicts were resolved with the released
sections byte-identical and this entry under `[Unreleased]`.

chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate.
