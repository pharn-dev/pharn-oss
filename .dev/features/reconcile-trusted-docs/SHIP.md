# SHIP — reconcile-trusted-docs

Stages run, in order: `/pharn-dev-plan` → GATE 1 → `/pharn-dev-grill` → `/pharn-dev-build` → `/pharn-dev-regress` →
`/pharn-dev-verify` → `/pharn-dev-review` → **GATE 2 (where this run ended)**.

- **GATE 1:** a delegated model decision by the orchestrator, not a human approval. Accepted:
  - CODEOWNERS at all three locations;
  - canon as whole subtrees;
  - `.pharn/writes-scope.json` excluded by name;
  - the untracked-file fix with its bound;
  - the no-baseline L68 consequence.

  Added at the gate: a one-line remedy in each human-only finding, and a non-vacuity test that an untracked file
  outside the control surface is not reported.

- `/pharn-dev-grill` → `check-plan-lessons.mjs` exit **0** (GREEN). The interrogation raised 4 advisory concerns
  (`GRILL.md`). All four are addressed in the build: the promote-outside-a-build case is named in contract §4a;
  the L29 test has an exact-count guard; never_exempt ⊆ always-reconciled is pinned; "tamper-proof" is struck.
- `/pharn-dev-build` → `validate` exit **0** (GREEN).
- `/pharn-dev-regress` → `regression-report.json` `.verdict`: **`no-regressions`**.
- `/pharn-dev-verify` → `verify-report.json` `.verdict`: **`PASS`** (`reconcile` exit 0).
- `/pharn-dev-review` → `REVIEW.md` (advisory; 0 floor-gate findings, 3 advisory, plus the proposed LIMITS.md
  text).
- changelog-entry: exit 0 (against the stack top, `origin/fix/reconcile-merged-paths`)
- lesson: none. No candidate cleared L20's bar.
- deferred: none
- **GATE 2:** a delegated model decision by the orchestrator, not a human approval. The decision was FIX R2, then
  ship.
  - R2 fixed: the HEAD comparison's tracked half is NUL-separated (`-z`). A test with a non-ASCII canon name,
    Bash-edited and baseline-forged, now gives ESCAPE; it fails on the pre-fix form.
  - Fixed in the same function, same defect class: `--no-renames`, because a staged `git mv` of a trusted doc
    listed only the new name. Pinned by a test that fails without the flag.
  - R1: the LIMITS.md text goes to the orchestrator for the human. R3: no action.
  - Verify was re-run after the fix: PASS, `reconcile` CLEAN.

The chain ran, and the named floor verdicts are as shown. This is NOT a judgment that the increment is good or
wise; that is the call to make at the post-review gate.
