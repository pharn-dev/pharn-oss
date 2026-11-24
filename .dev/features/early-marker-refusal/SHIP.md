# SHIP — early-marker-refusal (CORE-343)

Stages run, in order: `/pharn-dev-plan` → GATE 1 → `/pharn-dev-grill` → `/pharn-dev-build` → `/pharn-dev-regress` →
`/pharn-dev-verify` → `/pharn-dev-review` → GATE 2. The run ended at GATE 2.

- **GATE 1:** a model decision under delegation (orchestrator), not a human approval. The orchestrator approved the plan
  on all four open decisions: refusal exit 2; S9; the ship check at Step 2.1 after GATE 1, with the text saying why it
  cannot run earlier; the minor 7.24.0 bump. One condition: the new grant goes only into `/pharn-loop`'s own
  `allowed-tools`, never `.claude/settings.json`. It did; no protected file was touched.
- **Build restart:** the first build pass anchored without `pharn-install.json` in `## Files`. The pass's diff was saved,
  the tree restored, the plan amended, Step 0 re-run (setter, then anchor), and the diff re-applied inside the new
  window (PLAN.md, "Build restart (recorded)").
- **Verify ran twice.** Both runs read PASS. Review fixed one stale sentence in `.claude/commands/pharn-ship-stages.md`
  (the run-marker heading's "immediately after the base capture") and the install manifest was regenerated. The verdict
  below is the second run's, on the final tree.
- **GATE 2:** a model decision under delegation (orchestrator → this agent: fix blockers, otherwise proceed). No
  floor-gate finding; the one advisory finding was fixed.

verdict-grill: exit 0
verdict-build: exit 0
verdict-regress: no-regressions
verdict-verify: PASS
run-ended: GATE 2

changelog-entry: exit 0

lesson: none — the one slip (a generated path missing from `## Files` before the anchor) is already covered by
CLAUDE.md's "declare every path before build Step 0" and the 6.54.0 plan-widened rule; no new mechanism failed. Step
2b's question could not be asked (no human in this delegated run), so nothing was taken to promotion.

deferred: none

Pointers: `.dev/features/early-marker-refusal/REVIEW.md` (GREEN, 0 floor-gate findings), `GRILL.md` (advisory, 4
concerns dispositioned in PLAN.md), `REGRESSION.md`, `VERIFY.md`.

Chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate.
