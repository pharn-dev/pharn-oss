# SHIP — reconcile-scope-widening

Stages run, in order: `/pharn-dev-plan` → GATE 1 → `/pharn-dev-grill` → `/pharn-dev-build` → `/pharn-dev-regress` →
`/pharn-dev-verify` → `/pharn-dev-review` → **GATE 2 (where this run ended)**.

- **GATE 1** was a delegated model decision by the orchestrator, not a human approval. It approved option A with the
  wider rule: a non-command `set_by`, and the snapshot must also cover the path. It added three things:
  - the cheap path named in the remedy;
  - the contract states the re-plan RED and the loop's STOP_TERMINAL, and where the reason is visible;
  - version 6.54.0, kept above 6.53.1.
- `/pharn-dev-grill` → `check-plan-lessons.mjs` exit **0** (GREEN). Three advisory concerns (`GRILL.md`):
  - the command-origin assumption is now stated;
  - the existing amendment fixtures were audited, and one test, which used a PLAN set_by, was re-pointed to a command
    origin;
  - "wherever the checker runs" is stated in the contract.
- `/pharn-dev-build` → `validate` exit **0** (GREEN). Build Step 0 was re-run once, after the restatement sweep added
  two paths. See VERIFY.md's disclosure.
- `/pharn-dev-regress` → `regression-report.json` `.verdict`: **`no-regressions`**.
- `/pharn-dev-verify` → `verify-report.json` `.verdict`: **`PASS`** (`reconcile` exit 0).
- `/pharn-dev-review` → `REVIEW.md`: advisory, with 0 floor-gate findings and 3 advisory. It includes proposed text
  for the protected hook and LIMITS.md.
- changelog-entry: exit 0 (against origin/main at 6.53.1; this branch has not merged main yet)
- lesson: none — no candidate cleared L20's bar.
- deferred: none
- **GATE 2:** a delegated model decision by the orchestrator, not a human approval. The decision was FIX A1 and
  A3, then ship.
  - A1: the command-origin test is now exact (one segment under `.claude/commands/`, `.md`, normalized). Its test,
    `.claude/commands/../../x/PLAN.md` → plan-origin and widened, fails under the old prefix rule.
  - A3: the null-snapshot legacy case is pinned.
  - A2 and the LIMITS.md §6 sentence are packaged by the orchestrator for the human.
  - Verify was re-run after the fixes: PASS, `reconcile` CLEAN.

The chain ran and the named floor verdicts are as shown. This is NOT a judgment that the increment is good or wise;
that is the call at the post-review gate.
