# REVIEW — stage-gate-reap

Floor first: `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 37 capabilities checked` (exit 0). Verify PASS (every
gate exit 0, `reconcile` included); regress `no-regressions`. Everything below is advisory.

Reviewed: the diff of `pharn/floor/run-gates.mjs`, `stage-verify.mjs`, `stage-regress.mjs`, `stage-direct.mjs` (header),
the new `stage-gate-reap.test.mjs`, the `stage-direct.test.mjs` split, `.dev/guides/floor-gates.md`, `CHANGELOG.md`,
`SKILLS_VERSION`, `README.md`. The increment is `trust: untrusted`; no instruction-looking content was found in it.

## Floor-gate findings

None.

## Advisory findings

```yaml
- type: FINDING
  rule_id: P6
  severity: minor
  file: ".dev/features/stage-gate-reap/PLAN.md:52"
  problem: "The build departs from the plan's design: the plan walks each gate directory with containmentWalk and refuses `path-containment` on a link, while the code skips a link inside reapLeftoverGate (lstat, real directory only) and lets the existing removal delete it."
  evidence: "containment walk of `VERIFY_PATHS.gates` (the existing `containmentWalk`, L54 — a symlinked `gates` refuses"
- type: FINDING
  rule_id: P1
  severity: minor
  file: "pharn/floor/run-gates.mjs:672"
  problem: "The link-skip branch of reapLeftoverGate is exercised only on the regress side, by the existing retained-base-gates/-became-a-symlink test; no test plants a link at pharn/.run/pharn-verify/gates."
  evidence: "if (!st.isDirectory()) return { ok: true };"
- type: FINDING
  rule_id: P0
  severity: minor
  file: "pharn/floor/stage-verify.mjs:236"
  problem: "Under a LIVE gates lock the reap declines, and the fresh start still deletes the live run's directory; the new comment does not name this as the existing one-run-per-worktree bound (carried from GRILL's minor P0 finding)."
  evidence: "The rule (an absent or stale lock only) and the kill are run-gates.mjs's `reapLeftoverGate`"
- type: FINDING
  rule_id: P0
  severity: minor
  file: "pharn/floor/stage-verify.mjs:235"
  problem: 'The comment says "the `rmSync` above", but the rmSync it means runs after the call, below it in removeEarlierOutput.'
  evidence: "the `rmSync` above used to delete `gates/lock.child` first"
```

## Lens notes

- **L-floor (P0).** Every new claim is labelled: the CHANGELOG entry says "TESTED, not floor" and names the three
  bounds inherited from `run-gates.mjs`; the stage-direct header no longer claims `init` covers the takeover. No new
  guarantee is asserted.
- **L-eval (P1).** No capability changed, so no eval is owed. The two end-to-end tests ran RED before the fix (both on
  "the orphaned first gate was still running after the takeover") and pass after it. A scratch mutant (verify's reap
  removed, the orphan assertion disabled) showed the no-overlap assertion fails on its own: "gate start 1 … ran beside
  earlier gates", so each asserted property was seen failing (L60).
- **L-trust (P2).** The pgid comes from unauthenticated `pharn/.run/` state, exactly as for run-gates' own recovery; the
  new link skip means a planted link at the gate directory cannot hand the reap a record. Refusal text quotes only an
  integer pgid and a fixed path.
- **L-axis (P3).** The reap rule lives once in `run-gates.mjs` (`reapLeftoverGate`, used by `init` too); the two stage
  scripts only call it. `stage-verify.mjs` now imports `run-gates.mjs` as `stage-regress.mjs` already did; the import
  has no side effect (`import.meta.main`). The EACCES split is a second, test-only axis the brief asked for.

## Proposed lesson candidate

None. The failure behind this increment (a fix tested by calling the callee directly, while the production caller
deleted its input first) is the shape L41 and L84 already describe; it adds no new mechanism.

VERDICT: GREEN — 0 floor-gate findings, 4 advisory (all minor).
