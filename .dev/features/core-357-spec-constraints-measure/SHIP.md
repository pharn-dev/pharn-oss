# SHIP — core-357-spec-constraints-measure (Linear CORE-357; no version bump)

**Stage order:**

1. `/pharn-dev-plan`, then `/pharn-dev-grill`, then GATE 1.
2. One full `/pharn-loop` on a scratch pharn-app worktree with PHARN 7.25.0. It ran outside the chain, as the
   plan's measurement.
3. Plan amended with the run log, before build Step 0.
4. `/pharn-dev-build`, `/pharn-dev-regress`, `/pharn-dev-verify`, `/pharn-dev-review`.
5. Two advisory review findings fixed in iteration 2: a build fix, then regress, then verify.
6. GATE 2.

The run ended at GATE 2.

- **GATE 1 (plan acceptance): approved.** This was the batch orchestrator's model decision under the maintainer's
  delegation. It was not a human approval. It accepted:
  - the run design as written: intent v1, a pharn CLI install of 7.25.0 inside the scratch worktree only, and one
    full `--allow-red-entry` loop;
  - the decision rule;
  - a budget of USD 8, a 120 min ceiling, and one re-run, only for a load-caused void.

  It added two conditions, both met: record the tree's `pharn.config.json` and the installed version before launch,
  and hold one heavy slot for the whole loop.

- **Settings file present for the run (recorded at the orchestrator's request).** The scratch tree carried a copy of
  pharn-app's `.claude/settings.local.json`. Its `permissions.allow` granted `Bash(python3 -)` and
  `Bash(gh pr merge:*)` to the unattended loop. The orchestrator flagged this after the launch and let the run finish.
  - **What the transcripts show:** 0 of the 219 Bash tool calls (main session plus 6 stage agents) match either
    pattern. `gh pr merge` appears only in a pharn-app auto-memory note in the context, and `python3 -` appears
    nowhere.
  - **No re-run** took place, so no re-run carried the file. The worktree, and the copy with it, was removed.
  - **Where it is written down:** the record's §1 and §6.

- **GATE 2 (post-review decision): proceed to a pull request.** This was my model decision under the same delegation,
  not a human approval. The rule was: verify `PASS`, regress `no-regressions`, and zero floor-gate findings in
  `REVIEW.md`. All three held. Nothing is merged.
- **Orchestration deviations (advisory):**
  - Regress and verify ran through scratchpad node runners with argv-array spawns. The pinned compound shell lines
    could not be used, because this isolated worktree's guard refuses them.
  - In iteration 1, the regress base `tests` record came from a first attempt. That attempt's runner crashed after
    that gate, on its own eval-pair parsing bug. Iteration 2 re-measured every gate on both sides, and its report
    replaces iteration 1's.
  - The evidence bundle, `regression-report.json` and `verify-report.json` were written by Bash copies of the scripts'
    output. `verify-report.json` adds the empty `verifiers` block.
  - `--amend-scope` ran after each later stage's setter.

verdict-grill: exit 0
verdict-build: exit 0
verdict-regress: no-regressions
verdict-verify: PASS
run-ended: GATE 2

- **Grill log:** `.dev/features/core-357-spec-constraints-measure/GRILL.md` (advisory). It raised 4 concerns, and all
  were folded into the plan before the run.
- **Review:** `.dev/features/core-357-spec-constraints-measure/REVIEW.md` (GREEN). It has 0 floor-gate findings and 2
  advisory findings, both fixed in iteration 2.

changelog-entry: exit 0

lesson: none — no recurrence-prone process failure. The one surprise is that an uncommitted `pharn update` makes a
user-project loop stop on `reconcile`, and only at verify. That is a product observation, recorded as a follow-up in
the record's §5 for the maintainer. Step 2b's interactive question could not be asked: the run is delegated, and no
human is present.

deferred: none

_Chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate._
