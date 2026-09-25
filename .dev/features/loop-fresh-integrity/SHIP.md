# SHIP — loop-fresh-integrity

`/pharn-dev-ship` roll-up (gated mode, advisory). Two verified findings from the 2026-09-24 review, fixed in one
increment and released as **6.20.6**. The plan named 6.20.4; two other groups' PRs merged first, and the rebase took
the next free patch.

## Stages that ran, in order, and where the run ended

| stage              | structural verdict read                                                                      |
| ------------------ | -------------------------------------------------------------------------------------------- |
| /pharn-dev-plan    | GATE 1 (delegated, below); `check-plan-lessons.mjs` exit 0                                   |
| /pharn-dev-grill   | `check-plan-lessons.mjs` exit 0 → proceed; interrogation advisory ([`GRILL.md`](./GRILL.md)) |
| /pharn-dev-build   | `validate` exit **0** (GREEN)                                                                |
| /pharn-dev-regress | `regression-report.json` `.verdict` = **`no-regressions`** (final, base `7bcd7a8`)           |
| /pharn-dev-verify  | `verify-report.json` `.verdict` = **`PASS`** (final, post-rebase)                            |
| /pharn-dev-review  | no structural verdict; [`REVIEW.md`](./REVIEW.md): GREEN, 0 floor-gate findings              |

The run ended at **GATE 2**. Two stages were iterated inside the approved plan's `## Files` before it, and each
iteration is recorded in its stage's report, never hidden:

- **regress iteration 1: `regressions ["tests"]`.** A `.dev/floor/command-hygiene.test.mjs` pin requires check-loop-fresh
  to carry the literal `"--feature", ctx.feature, "--ac-gate"]`, and the build's argv spread broke that literal (L45).
  Fixed by two literal argv arrays, then re-run: `no-regressions`.
- **verify iteration 1: `FAIL ["lint:md"]`.** The build's own note, `BUILD.md`, had an MD038 violation, because the L13
  format pass on that artifact was skipped. Fixed and re-run: `PASS`.
- **post-rebase.** The branch was rebased onto `7bcd7a8`, and a new reconciliation epoch was anchored after the setter
  (the build epoch would misread groups A and C's upstream files as escapes; it had already run CLEAN). Regress then
  ran `no-regressions`. Verify ran `FAIL ["lint:md"]` once, on the agent's own `.pharn/` scratch draft, which was
  deleted; it then ran `PASS`, and `npm run check` exited 0 (3,240 tests, 0 failing).

Deciding to fix and re-run rather than stop at those REDs was a model decision under the delegation below. So was
fixing the one should-fix review finding (ambiguous "REVIEW finding N" cites) before the PR.

## Delegated gates (model decisions — NOT human approvals)

Both human gates were delegated by the user's instruction of 2026-09-24, quoted verbatim: _"fix all findings, if you
can ship some of them at one run do it, if you can ship some of them simultaniuslly in worktrees do it. each fix needs
to be fixed by using pharn-dev-ship command and needs to ends by merged pull request. you merge pull requests when the
CI are green."_

- **GATE 1 (plan):** approved by the orchestrator under that delegation, with three corrections, all applied in
  `PLAN.md`: the CHANGELOG date is 2026-09-25; the moved-tree rule must accept both check-verify `--ac-gate`
  precedences, with four explicit tests; and `rerunChecker` stays untouched.
- **GATE 2 (merge / fix / abandon):** decided by the model under the same delegation: **merge once CI is green.** The
  floor verdicts are green (validate 0, regress `no-regressions`, verify `PASS`), and review has no blocking finding.
  The one should-fix finding was fixed. The orchestrator merges; this run does not.

## Lines

- changelog-entry: exit 0
- lesson: none — no finding met L20's bar. Both mid-run REDs are single occurrences of classes canon already names (L45
  pinned invocations, L13 formatting a stage's own artifact), and REVIEW.md proposed no candidate. Nothing was written
  to canon.
- deferred: none

## Follow-ups this increment names but does not fix (stated in headers, contract and CHANGELOG [6.20.6])

- `loop-fresh-load-crash`: check-loop-fresh's own load failure exits node's 1, its RERUN code, with no JSON. The
  review's cited trigger (an unloadable `test-infra-core.mjs`) lands here, not at check I.
- `nested-child-crash`: an input-dependent crash of `check-plan-spec-agree.mjs` over AC-TESTS.md, one level below
  check-test-stage's children, still reads as `RED mapping-red`.

No trusted doc needed a change, so there is no `PROTECTED-FOLLOWUPS.md`.

chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate.
