# SHIP — test-infra-pin-all-gates (audit SEC-4)

Branch `fix/test-infra-pin-all-gates`, cut from `origin/main` at `5b468d66` (6.65.1). Gated mode, no `--loop`.

## Where the run ended

**RED-verdict STOP at `/pharn-dev-verify`** (`verify-report.json` `.verdict` = `FAIL`, `failing_gates: ["test"]`).
`/pharn-dev-review` did not run, so GATE 2 was not reached.

## Stages, in order, and the verdict each one gave

1. `/pharn-dev-plan` → `PLAN.md`; `check-plan-lessons.mjs` exit 0.
   **GATE 1:** delegated to the orchestrating session, which APPROVED it with four answers, recorded in `PLAN.md`
   ("GATE 1 decision"). This was a model decision made under the maintainer's delegation, not a human approval.
2. `/pharn-dev-grill` → `GRILL.md`; Step 1b `check-plan-lessons.mjs` exit 0.
   - The grill raised 4 advisory concerns, none blocking.
   - All four were folded into `PLAN.md` before build Step 0: a closure test, a refusal test, the ceiling-table
     entry, and the wording of the detection bound.
3. `/pharn-dev-build` → `validate.mjs` exit 0 (GREEN).
   - Build Step 0 (setter, then `--anchor`) ran twice. The plan missed `README.md`, whose version badge
     `check:badge` pins to `SKILLS_VERSION`.
   - `README.md` was added to `## Files` before any write to it. Step 0 then re-ran, so the anchored epoch names it.
   - Before that re-anchor, every write had gone through the Edit/Write tools under the plan scope. The exceptions
     were two Bash writes to declared paths: `SKILLS_VERSION`, and one in-place line-number fix to `GRILL.md`.
4. `/pharn-dev-regress` → `regression-report.json` `.verdict` = `no-regressions`. The outside `tests` gate was red
   at both base and head: `pre_existing`, investigated in `REGRESSION.md`.
5. `/pharn-dev-verify` → `verify-report.json` `.verdict` = `FAIL`.
   - `test`: exit 1.
   - Exit 0: `validate`, `lint`, `format:check`, `lint:md`, `structural:…`, and `reconcile` (`CLEAN`, no escapes).

## The STOP, as data

- `VERIFY.md` records two full `npm test` runs, each on a machine at load average 70–150:
  - run 1: 8 of 5,638 failed;
  - run 2: 3 of 5,638 failed.
- All failures sit in `entry-base-evidence`, `entry-gates` and one `stage-verify` budget-clock test. Each is a
  wall-clock budget or background-runner outcome.
- A paired rerun of the two entry files at base `5b468d66` and at HEAD, run concurrently, failed the same three
  tests on both sides.
- This reading is advisory and does not change the verdict. The verdict is `FAIL` until an unloaded `npm test`
  exits 0.

## Pointers

- `GRILL.md` — advisory.
- `REGRESSION.md`, `VERIFY.md`.
- `HUMAN-PATCH.md` — the `LIMITS.md §9` edit, for a maintainer.

changelog-entry: not-reached (pharn-dev-verify)

lesson: not-reached (pharn-dev-verify)

deferred:

- A candidate held for after the STOP, NOT proposed through 2b: the outside `tests` gate is one aggregate exit code.
  A load-induced red at base therefore masks every outside test as `pre_existing`, and only the per-test counts
  showed nothing new broke. Regress has no per-test comparison.

Chain ran; the named floor verdicts are as shown. This is NOT a judgment that the increment is good or wise. That is
the human's call — here the orchestrator's, under delegation.
