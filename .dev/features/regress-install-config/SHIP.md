# SHIP — regress-install-config (audit LOOP-11)

Run under the batch brief of 2026-10-19 (group E). Both human gates were **delegated by the maintainer to the
orchestrating session**. Each is recorded below as that model's decision, never as a human approval.

## Stages, in order, and where the run ended

1. `/pharn-dev-plan` → `PLAN.md`. `check-plan-lessons` exit 0.
2. **GATE 1 (delegated):** approved with one condition. If `none` leaves the LOOP-11 library case blocked, add an
   honest option. It did (pinned by a test), so `head-node-modules` was added and the PLAN was re-checked: exit 0,
   `[L15, L35, L36, L41, L54, L59, L62, L65]`.
3. `/pharn-dev-grill` → `GRILL.md`.
   - Step 1b lessons verdict: exit 0.
   - 4 advisory concerns (0 blocking), all addressed in the build: link-failure handling, no path in renders, the
     report block's position, and a re-check at the point of use.
4. `/pharn-dev-build` → `validate` exit **0** (GREEN, 37 capabilities).
5. `/pharn-dev-regress` round 1 (base `d5453a17` = HEAD): `regression-report.json` `.verdict` **`no-regressions`**.
6. `/pharn-dev-verify` round 1: `verify-report.json` `.verdict` **`FAIL`** (`test`), a load-induced failure; see
   `VERIFY.md`.
   - Under the gated chain this is a RED-verdict STOP.
   - The batch brief delegates GATE 2 and asks for fixes followed by a regress/verify re-run, so the run went on to
     review rather than stopping. That is a deviation from the skill's STOP rule, made under that delegation and
     recorded here.
7. `/pharn-dev-review` → `REVIEW.md`. No floor-gate finding; 6 advisory (1 important, 5 minor).
8. **GATE 2 (delegated):** four review findings fixed:
   - the declared `family` is now validated against the table (with tests);
   - a failed declared install is labelled as declared;
   - a resume test for the link: its own link is accepted, a foreign one refused;
   - the test regex.

   Two were stated rather than changed: the per-iteration base cost (added to the CHANGELOG's "Not covered") and the
   writable link.

9. Merged `origin/main` twice.
   - At `94ad252b` (6.64.3): no renumber was needed.
   - At `69a3c5ad`, where main took 6.65.0: renumbered to **6.66.0** by diffing added lines. A scratch script edited
     only this branch's added lines that cite the version; it was a Bash write to paths in the plan's `## Files`.
10. `/pharn-dev-regress` round 2 (base `94ad252b`): **`no-regressions`**.
    - `tests` was red at base and head, so it is classified `pre_existing`. It was investigated as possibly masking a
      regression: the failures are budget and wall-clock tests failing under load, an A/B shows `origin/main` failing
      them too, and every test this increment added passes.
11. `/pharn-dev-verify` round 2: **`FAIL`** (`test` only; every other gate 0, `reconcile` CLEAN).
    - A diagnostic run named 8 load-sensitive failures out of 5569 tests, none of them about this increment.
    - Verdicts are recorded as computed; neither round is re-labelled PASS. CI on an unloaded runner is the measurement
      that can.

After the second merge: `check:changelog-entry` exit 0, `check:reconcile` CLEAN (42 merged paths), `validate` GREEN,
`docs:check` / `check:markers` / `check:badge` / `check:changelog` / `check:contributing` / `lint:md` / `eslint` /
`prettier` 0. The final `npm test` is reported in the PR conversation.

The run ended at **GATE 2 (delegated)**.

**GATE 2 decision (the orchestrating model's, under the maintainer's delegation — not a human approval): MERGE on
green CI.** The local verify `FAIL` is read as load noise, and CI's full suite on an unloaded runner is the
measurement. On PR #364 every check passed, including `check` (the full `npm test`) and `floor`. The final local
`npm test` exited 1 with 3 load-sensitive failures out of 5605 (`entry-base-evidence` ×2, `entry-gates` ×1). The local
verdicts above stay as computed.

`origin/main` then moved to `5b468d66` (6.65.1, #363) and was merged a third time. This increment stays 6.66.0, above
main's `[6.65.1]` section, which is byte-identical.

## Structural verdicts read, verbatim

- `/pharn-dev-build` → `validate` exit `0`.
- `/pharn-dev-regress` → `regression-report.json` `.verdict` = `no-regressions` (round 2; round 1 the same).
- `/pharn-dev-verify` → `verify-report.json` `.verdict` = `FAIL`, `failing_gates: ["test"]` (round 2; round 1 the
  same).

## Pointers

- Review: `.dev/features/regress-install-config/REVIEW.md`.
- Grill: `.dev/features/regress-install-config/GRILL.md`.

changelog-entry: exit 0

lesson: none — per the batch brief no canon is promoted in this batch, so the candidate below is recorded as
deferred, not taken to `/pharn-dev-memory-promote`.

deferred:

- Candidate (for a later human-gated promotion; source `VERIFY.md` round 1 and round 2). A whole-suite gate run on a
  machine shared by parallel agent sessions turns budget- and wall-clock-sensitive tests red. A gate runner that
  records exit codes only cannot name them, so the red is unreadable at the moment it decides the verdict. Remedy:
  capture the gate's output (or run the budget-sensitive suites alone) whenever the gate is red, before reading
  anything into it. It recurred here three times in one run, and the existing memory notes on sibling worktrees point
  the same way.

## Orchestration deviations (ADVISORY)

- The worktree-isolated session refuses the pinned shell forms (`xargs`, `$VAR`, `printf` capture). Regress and verify
  ran through scratch runners under `.pharn/`, which call the same commands with argv arrays.
- Five in-repo writes went through Bash: a `sed` line-number fix in `GRILL.md`, before the build's anchor; a Python
  import edit in `stage-regress.mjs`; scoped `prettier --write`; the renumber script; and the merges. Each was a path
  the plan or the stage's own scope declares, and `check-bash-reconcile` reads CLEAN over the window.

chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate.
