# SHIP — ac-tests-agreement

A gated `/pharn-dev-ship` run for review-fix group A: five findings about `/pharn-test`'s lock and mapping checker.

## Stages, in order, and where the run ended

`/pharn-dev-plan` → GATE 1 → `/pharn-dev-grill` → `/pharn-dev-build` → `/pharn-dev-regress` → `/pharn-dev-verify`
→ `/pharn-dev-review` → GATE 2. At GATE 2 the should-fix was applied; then came a rebase onto #267 and a final
regress and verify. The run ended at **GATE 2**.

A usage limit interrupted the build after its code edits and before its lock regression tests. The run resumed from
the worktree state without redoing finished work.

## Structural verdicts (verbatim)

- `/pharn-dev-grill` → `check-plan-lessons.mjs` exit **0** (GREEN). Its 9 interrogation concerns are advisory; see
  `GRILL.md`.
- `/pharn-dev-build` → `node pharn/floor/validate.mjs .` exit **0** (`FLOOR: GREEN — 36 capabilities checked`).
- `/pharn-dev-regress` → `regression-report.json` `.verdict` = **`no-regressions`**. The final run used base
  `22f002a`; the two earlier runs gave the same verdict.
- `/pharn-dev-verify` → `verify-report.json` `.verdict` = **`PASS`** (7 gates, all 0, reconcile `CLEAN`). The final
  run was on `c2bd105`; the two earlier runs gave the same verdict.
- Review: see `REVIEW.md` — 0 floor-gate findings, 4 advisory. Grill: see `GRILL.md`.

changelog-entry: exit 0

## Delegated gates — MODEL decisions under the user's delegation, NOT human approvals

The user's instruction (2026-09-24), which the brief quotes verbatim:

> "fix all findings, if you can ship some of them at one run do it, if you can ship some of them simultaniuslly in
> worktrees do it. each fix needs to be fixed by using pharn-dev-ship command and needs to ends by merged pull
> request. you merge pull requests when the CI are green."

- **GATE 1 (plan approval).** The orchestrating session decided it under that delegation: "GATE 1 approved for group
  A (ac-tests-agreement). Answers: Q1 yes, Q2 yes, Q3 yes."
  - Q1: retire the two private `readValue` copies, moved byte-for-byte, with behaviour preserved.
  - Q2: `assignments.json` and `findings.json` join the lock in `.prettierignore`.
  - Q3: an unreadable SPEC pin becomes `ac-tests-modified`. The `ac-gate-core.mjs` edit stays local, and its header
    is rewritten truthfully.
  - Also: date the section 2026-09-25, and keep the `pharn-test.md` fold wording exact and advisory where it is
    advisory.

  PLAN.md records all of this under "GATE 1 — delegated decision".

- **GATE 2 (merge / fix / abandon).** This session decided it under the brief's delegated rule. The rule reads "merge
  once CI is green" when validate exits 0, regress is `no-regressions`, verify is `PASS`, and every blocking review
  finding is fixed; should-fix findings are fixed too when cheap, followed by a re-run of regress and verify. All three
  verdicts are green and there are 0 blocking findings. The one should-fix (REVIEW finding 1, important) was applied:
  `check-spec.mjs`'s `parseSpec` now imports `FIELD_LINE_RE`, which makes the "same code" comment true and retires the
  key-grammar copy. Regress and verify were then re-run, and re-run again after the rebase. **Decision: merge once CI
  is green.** This session does not merge; the orchestrator does.

## After GATE 2 (recorded, not part of either gate)

- **Rebase.** `origin/main` moved to `22f002a` (#267, 6.20.4). The branch was rebased, and only `CHANGELOG.md`
  conflicted.
  - #267's `[6.20.4]` section was kept verbatim. This increment's section became `[6.20.5] - 2026-09-25` above it.
  - `SKILLS_VERSION` and the badge became 6.20.5.
  - This branch's own "6.20.4" stamps were renumbered, only on lines it added.
  - `docs:generate` changed nothing.
- **Reconciliation.** A second epoch was anchored at the conflict stop, so the resolution edits were reconciled: verify
  on the rebased branch reports reconcile `CLEAN`, 0 escapes.

## Lesson extract (Step 2b)

lesson: skipped — REVIEW.md's Candidate A ("a test's hand-kept list of the modules it copies goes stale on the next
import"; third occurrence of the mechanism) was proposed. It was declined at 2b.3 as a model decision under the
brief's delegation, which forbids promoting to canon without a human accept. It is not written to canon.

deferred: none

## Protected follow-ups

None. The increment needed no trusted-doc, hook or settings change.

---

_Chain ran; the named floor verdicts are as shown. This is NOT a judgment that the increment is good or wise; under
the delegation above, that call is recorded as a model decision, not a human one._
