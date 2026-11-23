# SHIP — lean-stage-agent (Linear CORE-107, 7.19.0)

Stages, in order: `/pharn-dev-plan` → GATE 1 → (human trusted-doc patch, committed `bb0b7215`; `spec_content_hash`
re-pinned) → `/pharn-dev-grill` → `/pharn-dev-build` → `/pharn-dev-regress` → `/pharn-dev-verify` → `/pharn-dev-review`
→ GATE 2. The run ended at GATE 2.

- **GATE 1 (plan acceptance):** approved as written. This was the batch orchestrator's model decision, made under the
  user's delegation ("You make all decisions"), not a human approval. The answers it gave (patch before build, no AC2
  threshold, no scope guard, claims sentence in both close parts) are in `PLAN.md`, "GATE 1 — resolved".
- **GATE 2 (post-review decision):** proceed to a pull request. This was my model decision under the same delegation,
  not a human approval, taken on its stated rule: verify `PASS` ∧ regress `no-regressions` ∧ zero floor-gate findings
  in `REVIEW.md`. Nothing is merged.
- **Build deviation:** `README.md` (the version badge) was missing from `## Files`. It was added after a `CLEAN`
  reconcile preview, and build Step 0 was re-run (a second anchor). See `PLAN.md`, "Build deviation".
- **Orchestration deviations (advisory):** regress ran its pinned steps through a scratch node runner, and verify ran
  its gates as background `run --next` calls, because the worktree-isolation guard refuses the pinned shell forms.

verdict-grill: exit 0
verdict-build: exit 0
verdict-regress: no-regressions
verdict-verify: PASS
run-ended: GATE 2

- Grill log: `.dev/features/lean-stage-agent/GRILL.md` (advisory; 3 concerns, followed up in `REVIEW.md`).
- Review: `.dev/features/lean-stage-agent/REVIEW.md` (GREEN; 0 floor-gate findings, 3 minor advisory).

changelog-entry: exit 0

lesson: none — the README miss is an instance of L1 (meta-docs a change invalidates), and a deterministic gate
(`check:badge`) caught it during the build; no new mechanism failed.

deferred: none

Pending, outside this run: AC2 and the live half of AC3 wait on the probe kit (a fresh session). AC5 waits on
pharn-cli's `cli-install-agents`.

Follow-up, 2026-11-16 (`.dev/features/lean-stage-agent-probe/`): the probe ran in a fresh session. AC2 measured
(`pharn-stage` first request 44.6% of `general-purpose`'s, n = 1 per type, the same instruction files), AC3 live
observed (the Write was denied by the writes-scope guard), AC1's binding confirmed (probed SHA-256 = `PINNED_SHA256`):
`.dev/features/lean-stage-agent/MEASUREMENTS.md`. AC5 is still pending on `cli-install-agents`.

Follow-up, 2026-11-23 (Linear CORE-311): AC5's two arms ran in the measured project, whose install now carries the
definitions. One full loop had every routed stage on `pharn-stage`; one had them on `general-purpose`, with the same
base, intent and instruction files. First request 33,011 against 60,207 tokens, no stage used or needed a dropped
tool, and the verdicts differed for reasons outside the type (n = 1 per arm):
`.dev/measurements/stage-agent-benchmark-2026-11-23.md`.

_Chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate._
