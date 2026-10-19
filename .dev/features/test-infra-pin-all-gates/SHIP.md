# SHIP — test-infra-pin-all-gates (audit SEC-4)

Branch `fix/test-infra-pin-all-gates`, cut from `origin/main` at `5b468d66` (6.65.1). Main was later merged in at
`fed364dc` (6.67.1), and the release renumbered 6.66.0 → **6.68.0**. Gated mode, no `--loop`.

## Where the run ended

The chain first ended at a **RED-verdict STOP at `/pharn-dev-verify`** (`verify-report.json` `.verdict` = `FAIL`,
`failing_gates: ["test"]`). It was handed to the orchestrating session.

That session chose to continue past the verify FAIL. This was a **model decision made under the maintainer's
delegation, not a human approval**. Its stated grounds:

- the paired base/HEAD rerun fails the same timing tests on both sides;
- all six touched suites pass;
- CI's full suite, on an unloaded runner, is the measurement for `test` — the same call made for #360 and #363–#366.

The verify verdict is still `FAIL` in `verify-report.json`. It was not overridden or rewritten. `/pharn-dev-review`
then ran, and **GATE 2** was reached.

## Stages, in order, and the verdict each one gave

1. `/pharn-dev-plan` → `PLAN.md`; `check-plan-lessons.mjs` exit 0.
   - **GATE 1:** delegated to the orchestrator, which APPROVED it with four answers, recorded in `PLAN.md` ("GATE 1
     decision"). This was a model decision under delegation.
2. `/pharn-dev-grill` → `GRILL.md`; Step 1b `check-plan-lessons.mjs` exit 0.
   - 4 advisory concerns, none blocking.
   - All four were folded into `PLAN.md` before build Step 0.
3. `/pharn-dev-build` → `validate.mjs` exit 0 (GREEN).
   - Build Step 0 (setter, then `--anchor`) ran twice. The plan missed `README.md`, whose version badge
     `check:badge` pins to `SKILLS_VERSION`.
   - `README.md` was added to `## Files` before any write to it. Step 0 then re-ran, so the anchored epoch names it.
   - Before that re-anchor, every write went through the Edit/Write tools under the plan scope. The exceptions were
     two Bash writes to declared paths: `SKILLS_VERSION`, and one line-number fix to `GRILL.md`.
4. `/pharn-dev-regress` → `regression-report.json` `.verdict` = `no-regressions`.
   - The outside `tests` gate was red at both base and head: `pre_existing`, investigated in `REGRESSION.md`.
5. `/pharn-dev-verify` → `verify-report.json` `.verdict` = `FAIL`.
   - `test`: exit 1. The evidence that the red comes from load is in `VERIFY.md`.
   - Exit 0: `validate`, `lint`, `format:check`, `lint:md`, `structural:…` and `reconcile` (`CLEAN`).
6. `/pharn-dev-review` → `REVIEW.md`: GREEN, 0 floor-gate findings, 2 advisory findings.
   - One important P0 finding: the "pinned set IS the discovered set" claim was over-quantified, because an excluded
     gate stays pinned. It was probed, then fixed at all four restatements (module header, contract, CHANGELOG,
     guide).
   - One minor finding in HUMAN-PATCH.md, about which sentences a test backs. Fixed.

## GATE 2 (delegated to the orchestrator)

The orchestrator's standing instruction, a model decision under the maintainer's delegation:

- fix every blocking or High review finding, and anything cheap and clearly right. Both findings were fixed;
- re-run `validate`, the touched suites, format/lint/lint:md and `docs:check`;
- merge `origin/main`, renumber, run `check:changelog-entry`, commit, push and open the PR.

Re-run after the review fixes and the merge with `origin/main` (6.67.1):

| gate                                                                                  | exit                                                |
| ------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `validate`                                                                            | 0                                                   |
| `docs:check`, `check:badge`, `check:changelog`, `check:markers`, `check:contributing` | 0                                                   |
| `format:check`, `lint`, `lint:md`                                                     | 0                                                   |
| `check:reconcile`                                                                     | 0 (`CLEAN`; 85 paths the merge brought in `merged`) |
| touched suites + `command-hygiene`, `stage-load-budget`, `command-family` (577 tests) | 0                                                   |

The full `npm test` was not re-run after the merge, on the orchestrator's call: CI measures it.

## Pointers

- `GRILL.md` — advisory.
- `REGRESSION.md`, `VERIFY.md`.
- `REVIEW.md` — findings quoted as DATA there; not restated here.
- `HUMAN-PATCH.md` — the `LIMITS.md §9` edit. It stays in the PR; group O folds it into the maintainer's apply
  script.

changelog-entry: exit 0

lesson: deferred — not proposed through `/pharn-dev-memory-promote` in this batch (orchestrator instruction).
Candidate:

- `/pharn-dev-regress`'s outside `tests` gate is one aggregate exit code. A load-induced red at base therefore marks
  every outside test `pre_existing`, so a NEW outside failure at head is invisible to the verdict. Here only the
  per-test counts (5,629 pass, failures in two timing files) showed nothing new broke.
- The remedy would be a per-test comparison of base and head records. Source: `REGRESSION.md`, `VERIFY.md` of this
  feature.

deferred: none beyond the candidate above.

Chain ran; the named floor verdicts are as shown. This is NOT a judgment that the increment is good or wise. That is
the human's call — here the orchestrator's, under delegation.
