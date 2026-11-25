# SHIP — core-371-followups

Stages run, in order: `/pharn-dev-plan` → GATE 1 → `/pharn-dev-grill` → `/pharn-dev-build` → `/pharn-dev-regress` →
`/pharn-dev-verify` → `/pharn-dev-review` → GATE 2. The run ended at GATE 2.

- GATE 1: orchestrator decision under delegation, 2026-11-25. It approved S1–S5, the 7.25.4 patch bump, and the
  pre-anchor commit of both human patches, with one change: drop `.dev/floor/stage-agent-type.test.mjs` from `## Files`
  (PR #494 owned it). This was not a human approval.
- Human patches:
  - Patch 1 (`.claude/settings.json` `_comment`, post sha256 `f7f867f8…f676a7ad`) and patch 2
    (`.claude/hooks/set-writes-scope.cjs` header comments, post sha256 `9c744813…7645fe6`) were applied by the human
    from scratch scripts this agent wrote and dry-ran.
  - This agent checked both post-image sha256s and `cmp`-ed both files against the dry-run outputs before committing.
  - They were committed as `93be75e0`, with the `pharn-install.json` regeneration as a separate commit. Both landed
    before `/pharn-dev-build` Step 0's anchor (L68), after `origin/main` (60829452, PR #494) was merged in.
- PR #494's `[Unreleased]` entry was moved into this PR's `## [7.25.4]` section, below the new entry.
- GATE 2: orchestrator decision under delegation. The brief said, in advance: "run the rest of the chain, open the PR,
  drive CI green, report; do not merge". This was not a human approval. The three advisory review findings (all minor)
  are presented for that decision and were not fixed in this run.

verdict-grill: exit 0
verdict-build: exit 0
verdict-regress: no-regressions
verdict-verify: PASS
run-ended: GATE 2

changelog-entry: exit 0

lesson: none — one candidate (a presence pin over a descriptive claim froze it when its referent table moved) is a
first observed occurrence and does not clear L20's bar; it is listed below, not dropped.

deferred:

- presence-pin-freezes-descriptive-claim — `REVIEW.md` § Proposed lesson candidate (source: its P1 finding on
  `.dev/floor/command-hygiene.test.mjs:2752`).

Pointers:

- `REVIEW.md`: 0 floor-gate findings, 3 advisory (minor).
- `GRILL.md`: advisory, 2 concerns (minor).
- `REGRESSION.md`: base and head both green over 204 outside test files, `validate` and the trust-fence pair; per-test
  `new_failures: []`.
- `VERIFY.md`: 7 gates, all exit 0; reconcile `CLEAN` (9 reconciled, no escapes).

Chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate.
