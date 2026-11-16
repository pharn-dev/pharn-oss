# SHIP — stage-gate-reap (7.15.1)

Started from the "Follow up work" session: close the CORE-76 gate-overlap gap left by PR #443 (7.15.0).

## Stages run, in order

1. `/pharn-dev-plan` → `PLAN.md`. GATE 1: approved by the human on 2026-11-13 ("Approve, script route"). A relayed
   answer briefly moved the build to a main-checkout session; the human confirmed in this session on 2026-11-16 ("Yes,
   build here"). Both are the human's own answers in this session, not a delegated decision.
2. `/pharn-dev-grill` → `GRILL.md`. `check-plan-lessons.mjs` exit 0; 4 advisory concerns (2 important, 2 minor).
3. `/pharn-dev-build` → the plan's 10 `## Files`. `validate.mjs` exit 0 (GREEN, 37 capabilities).
4. `/pharn-dev-regress` → `regression-report.json` / `REGRESSION.md`: `no-regressions` (193 outside test files, base
   and head 0 failures).
5. `/pharn-dev-verify` → `verify-report.json` / `VERIFY.md`: `PASS` (7 gates, every exit 0, `reconcile` included).
6. `/pharn-dev-review` → `REVIEW.md`: 0 floor-gate findings, 4 minor advisory findings.

The run ended at GATE 2.

verdict-grill: exit 0
verdict-build: exit 0
verdict-regress: no-regressions
verdict-verify: PASS
run-ended: GATE 2

changelog-entry: exit 0

lesson: none — the failure behind this increment (a fix tested by calling the callee directly while the production
caller deleted its input first) is the shape L41 and L84 already describe.

deferred: none

## Write route

This desktop worktree session's write hooks judge the main checkout, so every Write/Edit here is denied. As chosen at
GATE 1, every in-repo write went through a scratchpad helper that first runs both real hooks of this worktree
(`protect-trusted-paths.cjs`, `enforce-writes-scope.cjs`, cwd and `CLAUDE_PROJECT_DIR` set to the worktree, a
synthesized Write/Edit payload) and writes only when both exit 0. A probe write to an undeclared `pharn/floor/` path was
denied by it. That the helper carried every write is discipline; verify's `reconcile` gate (exit 0) is the check that
would have reported an escape.

## RED first (GRILL's important P1 concern: recorded here, since `/pharn-dev-build` writes no BUILD.md)

`node --test pharn/floor/stage-gate-reap.test.mjs` against the unchanged stage scripts, before the fix:

```text
✖ 7.15.1 — verify: … no two gates overlap
  AssertionError [ERR_ASSERTION]: pharn-verify: the orphaned first gate was still running after the takeover
✖ 7.15.1 — regress: … no two gates overlap
  AssertionError [ERR_ASSERTION]: pharn-regress: the orphaned first gate was still running after the takeover
```

After the fix: 2/2 pass. A scratch mutant (verify's reap removed, the orphan assertion disabled) showed the no-overlap
assertion fails by itself: `gate start 1 (pid …) ran beside earlier gates [<orphan pid>]`.

## Build decision that departs from the plan

The plan walked each gate directory with `containmentWalk` and refused `path-containment` on a link. That broke an
existing tested behaviour: `stage-regress.test.mjs` "MISS end-to-end evidence-missing — the retained base-gates/ became
a symlink …" expects the link removed, never followed, and the base side run again (it failed: 340/341). The build
instead skips anything that is not a real directory inside `reapLeftoverGate` (lstat), so a link is never read through
and the existing removal deletes it as before; the suites then passed 341/341. REVIEW records it as a minor P6 finding.

## Pointers

- `REVIEW.md`: the four advisory findings (all minor).
- `GRILL.md`: advisory; its two important concerns were acted on (RED-first evidence above; the end-to-end tests use
  event-driven waits with 120 s ceilings and 300 s budgets).

Chain ran; the named floor verdicts are as shown. This is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate.
