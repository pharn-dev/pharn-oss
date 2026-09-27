# SHIP — shell-sink-validation

- run: `/pharn-dev-ship "no model-typed value derived from untrusted input reaches a shell line before tested code has
validated it"`, gated mode (no `--loop`), inline in one isolated worktree.
- stage model: opus for every stage, by the maintainer's instruction for this batch (not a `pharn.config.json` route).
- **Where the run ended: GATE 2**, after a first `/pharn-dev-regress` STOP and a re-run of that stage from its start
  (below).

## The gates — decisions delegated to the orchestrating model by the maintainer (never human approvals)

- **GATE 1 (plan acceptance): APPROVED 2026-09-27 by the orchestrating model under the maintainer's delegation**, with
  corrections: Q1 → (A) tightened (the seven name-taking commands ask for a missing name, or resolve it only through the
  CLI); the `git checkout -` bound stated in the command and pinned by an executed control. Recorded in `PLAN.md`'s
  `gate1` line and `## Amended at GATE 1`.
- **The regress STOP (2026-09-27), decided by the orchestrating model under the same delegation:** the STOP stands as
  recorded, the remedy is a re-run, not a waiver. First three preliminary fixes inside `## Files` — the two claims
  bullets narrowed so only the CLI's output is floor, a directory at the candidate path → stop and ask, and `<M>` named
  out of class in `BUILD.md` with no change — then the re-run once the 1-minute load average read below 25.
- **GATE 2 (merge / fix / abandon): MERGE, decided 2026-09-27 by the orchestrating model under the maintainer's
  delegation**, after review findings 1 (the directory rule's `--model-approve` route in `pharn-spec.md`) and 2 (the
  CHANGELOG line) were fixed; findings 3 and 4 recorded only; `lesson: none` accepted. Version renumbered to 6.31.0
  (#290 took 6.29.0; #291 is open as 6.30.0 and merges first).

## Stages that ran, and each structural verdict read, verbatim

1. `/pharn-dev-plan` → `PLAN.md`; `check-plan-lessons.mjs` exit **0** (GREEN, 21 cited ids).
2. `/pharn-dev-grill` → `GRILL.md`; the proceed/stop read, `check-plan-lessons.mjs` exit **0**. Its 7 advisory concerns
   gated nothing; all seven were folded into the plan (`## Amended after grill`).
3. `/pharn-dev-build` → the 19 planned files + `BUILD.md`; `node pharn/floor/validate.mjs .` exit **0** (GREEN).
4. `/pharn-dev-regress` (first run, load 78–123) → `.verdict` **`regressions`** (two wall-clock tests in untouched files).
   **STOP**, then the fixes above; `validate` exit **0** again after them.
5. `/pharn-dev-regress` (re-run from its start, begun at load 23.17) → `regression-report.json` `.verdict`
   **`no-regressions`** (exit 0; `tests`, `validate`, the structural pair all 0 → 0).
6. `/pharn-dev-verify` → `verify-report.json` `.verdict` **`PASS`** (exit 0; `test`, `validate`, `lint`,
   `format:check`, `lint:md`, the structural pair, `reconcile` all 0).
7. `/pharn-dev-review` → `REVIEW.md`: GREEN, 0 floor-gate findings, 4 advisory (all minor).

## Pointers (cited, not restated — P4)

- `PLAN.md`, `GRILL.md` (advisory), `BUILD.md`, `REGRESSION.md`, `regression-report.json`, `VERIFY.md`,
  `verify-report.json`, `REVIEW.md`.

## Recorded outcome lines

- changelog-entry: exit 0
- lesson: none — the one recurring event (wall-clock tests red under load) is L40's method, already applied; the Write
  tool's link refusal is already answered by a pinned rule, not a "remember next time".
- deferred: none

`changelog-entry: exit 0` was first read against the merge-base `f255f0c`; after `origin/main` (`c1bf663`, which opens
its own `## [6.29.0]`, #290) was merged in and this branch renumbered to 6.31.0, it was re-run against the new
merge-base (the PR description carries that exit).

chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate.
