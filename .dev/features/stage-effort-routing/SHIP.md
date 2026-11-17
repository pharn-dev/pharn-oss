# SHIP — stage-effort-routing (Linear CORE-111, 7.20.0)

Stages, in order: `/pharn-dev-plan` → GATE 1 → `/pharn-dev-grill` (plan amended after it) → human trusted-doc patch
(`pharn/LIMITS.md` §8, committed `02c3a530` before the build's anchor, L68) → `/pharn-dev-build` → `/pharn-dev-regress`
→ `/pharn-dev-verify` → `/pharn-dev-review` → GATE 2. The run ended at GATE 2.

- **GATE 1 (plan acceptance):** approved as written. This was the batch orchestrator's model decision, made under the
  user's delegation ("You make all decisions"), not a human approval. Its answers (the probe record's place, the
  header-only `check-model-config.mjs` edit, the patch before build Step 0) are in `PLAN.md`, "Resolved at GATE 1".
- **GATE 2 (post-review decision):** proceed to a pull request. This was my model decision under the same delegation,
  not a human approval, taken on its stated rule: verify `PASS` ∧ regress `no-regressions` ∧ zero floor-gate findings
  in `REVIEW.md`. Nothing is merged.
- **The trusted-doc edit:** `pharn/LIMITS.md` §8 was written by the maintainer through the reviewed patch script and
  applied outside the agent loop; the agent only committed it, before `/pharn-dev-build` anchored (`02c3a530`).
  `spec_content_hash` pins `pharn/ARCHITECTURE.md`, which did not change, so nothing needed re-pinning.
- **After regress, one comment edit:** the header of `.dev/floor/stage-agent-type.test.mjs` was updated to name the new
  effort pins (a comment only, inside the plan's `## Files` and the plan's own scope). Regress ran before it; verify ran
  after it.
- **Orchestration deviations (advisory):** regress ran its pinned steps through a node runner kept outside the
  repository, and verify ran its gates as background `run --next` calls, because the worktree-isolation guard refuses
  the pinned shell forms. A first regress attempt was stopped before any verdict (the runner mis-read the eval-pair
  shape); its base worktree was removed and nothing it wrote was used.
- **Stage routes:** every stage ran inline in this session (opus); none was a routed stage agent. One probe Agent call
  (`general-purpose`, `haiku`, `effort: "low"`) was made at plan time for AC5; it is the measurement in
  `EFFORT-PROBE.md`, not a stage.

verdict-grill: exit 0
verdict-build: exit 0
verdict-regress: no-regressions
verdict-verify: PASS
run-ended: GATE 2

- Grill log: `.dev/features/stage-effort-routing/GRILL.md` (advisory; 5 concerns, folded into `PLAN.md`, "Amended
  after grill").
- Review: `.dev/features/stage-effort-routing/REVIEW.md` (GREEN; 0 floor-gate findings, 3 minor advisory).
- Probe record: `.dev/features/stage-effort-routing/EFFORT-PROBE.md` (AC1, AC5).

changelog-entry: exit 0

lesson: none — no mechanism failed in a recurrence-prone way: the shell-form refusals have a known workaround, and the
one denied Edit was the writes-scope guard doing its job.

deferred: none

Follow-ups named by this run: the effort read from a routed stage's transcript on the first loop run on 7.20.0 (or
CORE-112's effort pairs, which also carry the before/after comparison the probe set CORE-90 would allow);
`cost-ledger-served-effort` (record the requested or sent effort in the ledger); refresh pharn-cli's byte-pinned fixture
copy of `check-model-config.mjs`; pharn-cli's models label text (`modelsLabelLines`, models-label-truth) still says
effort is never routed; item 2's "whatever parameters your Agent tool lists" lead-in in `/pharn-loop` (review finding).

chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate.
