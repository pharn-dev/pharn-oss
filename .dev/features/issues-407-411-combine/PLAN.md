# PLAN — issues-407-411-combine

- spec_content_hash: d5a974303fd0b9568945c60423ae5a89c57d7b65f5baa03657e317fbe64f33a5
- applied_lessons: [L29]
- increment: Bring the three `/pharn-dev-ship` increments of the 2026-11-02 batch (#408 `reconcile-state-root`, #409
  `ac-tests-style-gate`, #410 `stage-wait-capped`) into `fix/issues-407-411` next to the hand-made #407/#411 fix,
  resolve the overlaps, record GATE 2's lesson decisions, and make one review wording correction. No new behaviour.
- layer(s): none new; every path below was already built, regressed, verified and reviewed in its own increment.
- constitution_refs: [P0, P6]
- approval: NOT a `/pharn-dev-plan` output and not grilled. It exists so the merge's writes come from a declared
  `## Files` list (fix #7) and the local reconcile epoch has a scope to judge the merged paths against.

## Live state measured this run (P6)

- `fix/issues-407-411` = `0b18864b`; `origin/main` = `4faed62e` (unmoved since the branch was cut).
- The three increment branches, each one commit on `0b18864b`: `worktree-agent-aef1df03c5d5e7115` (`18c8f62b`, #408),
  `worktree-agent-aa474e50f31e373a0` (`dfb86c7f`, #409), `worktree-agent-a363a98d67021448d` (`340d874e`, #410).
- Each reached GATE 2 with `verify-report.json` `PASS`, `regression-report.json` `no-regressions`, and
  `check:changelog-entry` exit 0 (read from each worktree this run).
- Paths touched by more than one increment: `CHANGELOG.md` (all three), `.dev/floor/command-hygiene.test.mjs` and
  `.claude/commands/pharn-loop.md` (#409 and #410).

## What this increment does

1. Merge the three branches. Resolve `CHANGELOG.md` by keeping every `### Fixed` bullet under `[7.2.0]`; resolve the
   other two overlaps by keeping both sides (#409 edits `pharn-loop.md`'s frontmatter, #410 its body).
2. GATE 2 decisions, the human's (2026-11-02), recorded in each `SHIP.md`: #408 Promote, #409 Promote, #410 Skip. The
   two promotions run through `/pharn-dev-memory-promote` after this branch merges, so canon is written outside every
   build window; the `promoted L<n>` lines are recorded by that change.
3. #409 REVIEW finding 1 (important, P0): `pharn-test.md` Step 3b's "Never pin tests that fail a style gate" is wider
   than the check, which pins failing tests in its NOTE cases. Narrow the sentence to what the step refuses.
4. `npm run docs:generate`, then the full gates.

## Files

- `.dev/features/issues-407-411-combine/PLAN.md`
- `.claude/commands/pharn-loop-close.md`
- `.claude/commands/pharn-loop.md`
- `.claude/commands/pharn-test.md`
- `.dev/features/ac-tests-style-gate/GRILL.md`
- `.dev/features/ac-tests-style-gate/PLAN.md`
- `.dev/features/ac-tests-style-gate/REGRESSION.md`
- `.dev/features/ac-tests-style-gate/REVIEW.md`
- `.dev/features/ac-tests-style-gate/SHIP.md`
- `.dev/features/ac-tests-style-gate/VERIFY.md`
- `.dev/features/ac-tests-style-gate/regression-report.json`
- `.dev/features/ac-tests-style-gate/verify-report.json`
- `.dev/features/reconcile-state-root/GRILL.md`
- `.dev/features/reconcile-state-root/HUMAN-PATCH.md`
- `.dev/features/reconcile-state-root/PLAN.md`
- `.dev/features/reconcile-state-root/REGRESSION.md`
- `.dev/features/reconcile-state-root/REVIEW.md`
- `.dev/features/reconcile-state-root/SHIP.md`
- `.dev/features/reconcile-state-root/VERIFY.md`
- `.dev/features/reconcile-state-root/regression-report.json`
- `.dev/features/reconcile-state-root/verify-report.json`
- `.dev/features/stage-wait-capped/GRILL.md`
- `.dev/features/stage-wait-capped/PLAN.md`
- `.dev/features/stage-wait-capped/REGRESSION.md`
- `.dev/features/stage-wait-capped/REVIEW.md`
- `.dev/features/stage-wait-capped/SHIP.md`
- `.dev/features/stage-wait-capped/VERIFY.md`
- `.dev/features/stage-wait-capped/regression-report.json`
- `.dev/features/stage-wait-capped/verify-report.json`
- `.dev/floor/command-hygiene.test.mjs`
- `.dev/guides/floor-ac-tests.md`
- `.dev/guides/floor-checks.md`
- `.dev/guides/floor-orchestration.md`
- `CHANGELOG.md`
- `README.md`
- `docs/guarantees.md`
- `docs/limitations.md`
- `pharn/floor/ac-style-core.mjs`
- `pharn/floor/ac-style-core.test.mjs`
- `pharn/floor/check-ac-style.mjs`
- `pharn/floor/check-ac-style.test.mjs`
- `pharn/floor/check-bash-reconcile.mjs`
- `pharn/floor/check-bash-reconcile.test.mjs`
- `pharn/floor/reconcile-baseline.mjs`
- `pharn/floor/reconcile-baseline.test.mjs`
- `pharn/floor/reconcile-ignore.json`
- `pharn/floor/stage-agent-core.mjs`
- `pharn/floor/stage-agent-core.test.mjs`
- `pharn/floor/stage-agent.mjs`
- `pharn/floor/stage-agent.test.mjs`
- `pharn/floor/worktree-fingerprint.mjs`
- `pharn/pharn-contracts/cost-ledger.md`
- `pharn/pharn-contracts/reconciliation-record.md`

## Applied lessons

- L29: the overlap set is computed (`git diff --name-only` per branch, counted), not assumed from the agents' reports;
  `## Files` is that union plus the two files this increment edits itself.
