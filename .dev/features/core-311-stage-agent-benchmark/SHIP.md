# SHIP — core-311-stage-agent-benchmark (Linear CORE-311)

Stages run, in order: `/pharn-dev-plan` → GATE 1 → `/pharn-dev-grill` → (the two loop runs and their measurement) →
`/pharn-dev-build` → `/pharn-dev-regress` → `/pharn-dev-verify` → `/pharn-dev-review` → GATE 2.

verdict-grill: exit 0
verdict-build: exit 0
verdict-regress: no-regressions
verdict-verify: PASS
run-ended: GATE 2

changelog-entry: exit 0

lesson: skipped

deferred: the fresh-session `instructions` check (REVIEW.md "Proposed lesson candidate"), not promoted

## The gates, and who decided them

- **GATE 1** (plan acceptance) was decided by the orchestrator session under the maintainer's standing delegation
  ("You make all decisions, do not ask me"). It is a model decision, not a human approval. The orchestrator approved the
  one-axis design and later amended the base. After the 10:14 reboot, run 2 used `8c896454`, the base of CORE-310's
  re-run, and the PLAN records it under "GATE-1 amendment". It also approved the second attempt at run 2 (about USD 6)
  once the first proved void.
- **GATE 2** (merge / fix / abandon) was delegated to this agent by the batch brief, so it is a model decision as well.
  Decision: open the pull request without fixing the three minor advisory findings in `REVIEW.md`. None changes a
  figure or a verdict. Fixing them would re-run regress and verify, about 35 minutes of whole-suite runs under the
  shared heavy lock, which other batch tasks are waiting on. The merge itself stays the maintainer's.
- **Lesson (Step 2b):** the step asks a human, and under the delegation there is none to ask. A canon write needs
  `/pharn-dev-memory-promote`'s own human accept, which a model never gives itself, so the candidate is `skipped` and
  listed under `deferred`.

## Stops and re-runs inside the chain (each a re-run of the stage, never a skip)

- **Regress** after the origin/main merge first read `regressions: ["tests"]`. The new head failure was
  `pharn/floor/entry-gates.test.mjs` "CLI cache (AC3)…", under a 1-minute load near 136 from other sessions. It was
  re-run at load 3–13 and read `no-regressions`. Both results are in `REGRESSION.md`.
- **Verify** first read `FAIL` (`format:check`). Two files outside this increment failed under the main checkout's
  stale prettier 3.9.10, which this worktree resolved for want of its own `node_modules`. After `npm ci` installed the
  locked 3.10.1, a re-run from `init` read `PASS`. Both are in `VERIFY.md`.
- **The build epoch** was re-anchored after merging origin/main (#468, CHANGELOG conflict resolved by keeping both
  entries), as the orchestrator directed.

## Pointers

- The record: `.dev/measurements/stage-agent-benchmark-2026-11-23.md`.
- The review: `REVIEW.md` (advisory; three minor findings).
- The grill: `GRILL.md` (advisory; six concerns, answered in the PLAN's GATE-1 amendment).
- Defects the runs showed, each its own task under CORE-293: CORE-346 (reconcile false escape for a pre-anchor
  deletion) and CORE-347 (a pinned AC test that fails typecheck is caught only after the build).

_Chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate._
