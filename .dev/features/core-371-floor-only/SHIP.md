# SHIP — core-371-floor-only

Stages run, in order: `/pharn-dev-plan` → GATE 1 → `/pharn-dev-grill` → `/pharn-dev-build` → `/pharn-dev-regress` →
`/pharn-dev-verify` → `/pharn-dev-review` → GATE 2. The run ended at GATE 2.

- GATE 1: orchestrator decision under the user's delegation (the brief `FLOOR-ONLY-C.md`), 2026-11-25: approved as
  written — Fix 1 (remove the unreachable closing sentence), Fix 2 (derive the routing fact in the test), the 7.25.5
  patch bump. This was not a human approval.
- Before planning, Fix 1's precondition was checked against live code: nothing passes `--floor-only` (`ROUTE_POLICY`,
  `INVOCATIONS`, both orchestrator families, every non-test `pharn/floor/*.mjs`, `.claude/agents`, `.claude/hooks`).
- Build environment: the worktree had no `node_modules` and resolved the main checkout's stale prettier 3.9.10, which
  flagged two unrelated `.dev/features/` files; `npm ci` (lockfile, prettier 3.10.1) fixed it before regress and
  verify ran.
- GATE 2: orchestrator decision under delegation. The brief said, in advance: open the PR, drive CI green, report, do
  not merge. This was not a human approval. The three advisory review findings (all minor) are presented and were not
  fixed in this run.

verdict-grill: exit 0
verdict-build: exit 0
verdict-regress: no-regressions
verdict-verify: PASS
run-ended: GATE 2

changelog-entry: exit 0

lesson: none — no new failure mechanism surfaced; this increment is the remedy for the candidate core-371-followups
deferred (a presence pin over a descriptive claim froze it), and a remedy is not a second occurrence by L20's bar.

deferred:

- presence-pin-freezes-descriptive-claim — carried from `.dev/features/core-371-followups/SHIP.md`; now remedied for
  this one pin (`REVIEW.md` here, `BUILD.md` mutation table), still unpromoted.

Pointers:

- `REVIEW.md`: 0 floor-gate findings, 3 advisory (minor).
- `GRILL.md`: advisory, 2 concerns (minor), both taken in the build.
- `BUILD.md`: the scratch-copy mutation measurement (three mutations, each red; restored copy green).
- `REGRESSION.md`: base and head both green over 205 outside test files, `validate` and the trust-fence pair; per-test
  `new_failures: []`.
- `VERIFY.md`: 7 gates, all exit 0, reconcile included.

Chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate.
