# SHIP — spec-pin-kind-ambiguity

`/pharn-dev-ship` in gated mode, run under the delegation below. The run ended at **GATE 2**.

## The delegation, quoted

The user's instruction (2026-09-24), relayed by the orchestrating session in `BRIEF.md`: _"fix all findings, if you
can ship some of them at one run do it, if you can ship some of them simultaniuslly in worktrees do it. each fix needs
to be fixed by using pharn-dev-ship command and needs to ends by merged pull request. you merge pull requests when the
CI are green."_ Both human gates were delegated to the orchestrator session. Both are recorded here as **model
decisions made under that delegation**, never as human approvals.

## Stages, in order

1. **`/pharn-dev-plan`** wrote `PLAN.md` and halted. `check-plan-lessons.mjs` exit 0.
   **GATE 1, a model decision under delegation.** The orchestrator replied "GATE 1 approved for group F
   (spec-pin-kind-ambiguity), as planned". It accepted three decisions: legacy SPECs get the RED too, the RED kind is
   `pin`, and re-approval is not enforced, which is stated. It also gave three build notes: write the uniqueness
   argument once, read the body after the pin's CRLF fold, and treat the version as provisional. Both the approval
   and the notes are recorded in `PLAN.md`.
2. **`/pharn-dev-grill`** wrote `GRILL.md`. **Verdict read (FLOOR): `check-plan-lessons.mjs` exit 0.** It raised 5
   advisory findings (2 important, 3 minor), none of them gating. All 5 were absorbed into `PLAN.md` before the build
   ("Post-grill amendments"), within the approved design. The GATE-1 kind `pin` was kept, and finding 1's alternative
   (a distinct RED kind) is presented below.
3. **`/pharn-dev-build`**. **Verdict read (FLOOR): `node pharn/floor/validate.mjs .` exit 0** (GREEN, 36
   capabilities).
4. **`/pharn-dev-regress`**. **Verdict read (FLOOR): `regression-report.json` `.verdict` = `no-regressions`.** The
   standing run is against base `8eec2d7`: `tests` (101 outside files), `validate` and one structural eval pair, all
   0 → 0.
5. **`/pharn-dev-verify`**. **Verdict read (FLOOR): `verify-report.json` `.verdict` = `PASS`.** All 7 gates were
   exit 0 (`test`, `validate`, `lint`, `format:check`, `lint:md`, `structural:…`, `reconcile`). There are 0 verifiers.
6. **`/pharn-dev-review`** wrote `REVIEW.md` (pointer only, P4). It found 0 floor-gate findings and 3 advisory ones.

## Mid-run events (advisory orchestration, recorded rather than smoothed over)

- **Two rebases, at the orchestrator's instruction.** PR #268 (group A) merged during the build, taking 6.20.5. PR
  #269 (group D) merged after review, taking 6.20.6. Each time, the WIP commit was rebased onto the new `origin/main`.
  The first rebase was clean. The second conflicted in `CHANGELOG.md` only: main's [6.20.6] section was kept
  verbatim, and this entry went above it as [6.20.7] (`check:changelog-entry` exit 0). After each rebase, build
  Step 0 (setter, then anchor) was re-run on the new base, and regress and verify were re-run. `VERIFY.md` states
  what each `reconcile` run did and did not cover. The final run reconciled 0 paths, and it says so.
- **Version renumbered twice: 6.20.5 → 6.20.6 → 6.20.7** (GATE-1 note 3). REVIEW finding 1 caught that the first
  renumber had updated `SKILLS_VERSION`, the badge, the CHANGELOG and the PLAN, but not the 14 in-text version cites.
  Both renumbers then replaced **exact phrases only**, because `check-spec.mjs`, `ac-tests.md` and
  `check-ac-tests.test.mjs` carry legitimate cites from #268/#269 that a blanket replace would have moved. After each
  replace, a check confirmed zero stale cites in the added lines.
- **Pinned shell forms refused.** The pinned `xargs` / `$VAR` / `printf` gate captures are refused in this
  worktree-isolated session. So `.pharn/pharn-dev-build/format-scope.cjs`, `.pharn/pharn-dev-regress/run-regress.cjs`
  and `.pharn/pharn-dev-verify/run-verify.cjs` ran the same commands with `spawnSync` argv arrays and recorded only
  exit codes. This is noted in `REGRESSION.md` and `VERIFY.md`.

## GATE 2, a model decision under delegation

**Decision: merge once CI is green.** The brief's condition holds: validate exit 0, regress `no-regressions`, verify
`PASS`, and no blocking review finding. The two cheap should-fix review findings were fixed:

- **Finding 1:** the 14 stale version cites.
- **Finding 2:** the contract's "`--spec` reads such a SPEC as unusable" now says "a templated SPEC".

Regress and verify were re-run after the fix and again after the second rebase. The orchestrator merges; this run
does not.

**Presented for the orchestrator, not acted on (REVIEW finding 3 / GRILL finding 1).** The layout RED shares the `pin`
kind with the hash-mismatch RED, as GATE 1 decided. So `/pharn-spec`'s re-validate step now tells the two apart by
the checker's fixed detail text. A distinct kind would let the existing "any other kind" branch handle it with no
split. That is a small follow-up if preferred.

- changelog-entry: exit 0
- lesson: none — no candidate cleared L20's bar. The one real miss (a renumber that swept the version files but not
  the increment's own in-text cites) is a first occurrence of L50's referent-sweep shape. `REVIEW.md` records it, so
  a second occurrence can cite it.
- deferred: none

## Standing verdicts, verbatim

- `/pharn-dev-build`: `validate` exit **0**
- `/pharn-dev-regress`: `regression-report.json` `.verdict` = **`no-regressions`** (base `8eec2d7`)
- `/pharn-dev-verify`: `verify-report.json` `.verdict` = **`PASS`**, `failing_gates: []`

Pointers: `GRILL.md` (advisory), `REVIEW.md` (advisory), `REGRESSION.md`, `VERIFY.md`.

_The chain ran, and the named floor verdicts are as shown. This is NOT a judgment that the increment is good or wise.
That call belongs to the post-review gate, held here by the orchestrator under the delegation quoted above._
