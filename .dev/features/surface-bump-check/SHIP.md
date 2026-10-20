# SHIP — surface-bump-check

## Stages run, in order

1. `/pharn-dev-plan` → `PLAN.md`; `check-plan-lessons.mjs` exit 0.
2. **GATE 1** — delegated. The batch orchestrator decided under the maintainer's delegation; this is a model decision,
   not a human approval. **APPROVED**, Q1 → (a) add `pharn/floor/*.json` to CLAUDE.md and the constant, keep
   `pharn/floor/README.md` out; Q2 → no, follow-up `dev-ship-surface-bump`. Recorded in `PLAN.md`.
3. `/pharn-dev-grill` → `GRILL.md`; floor verdict (`check-plan-lessons.mjs`) exit **0**. Three advisory concerns, all
   carried into the build (untracked-worktree fixture G7, the `*.test.*` bound in the header, the README-out /
   JSON-in classification tests C3/C4).
4. `/pharn-dev-build` → `validate` exit **0** (`FLOOR: GREEN — 37 capabilities checked`).
5. `/pharn-dev-regress` → `regression-report.json` `.verdict` = **`no-regressions`** (`tests` red on both sides,
   `pre_existing`; see `REGRESSION.md`).
6. `/pharn-dev-verify` → `verify-report.json` `.verdict` = **`FAIL`**, `failing_gates: ["test"]`.
7. `/pharn-dev-review` → `REVIEW.md`.

## Where the run ended, and the deviation it took

By this command's Step 2 a verify `FAIL` is a RED-verdict STOP. The batch orchestrator had instructed this run to
continue through review to a pull request, with GATE 2 delegated, so the chain went on past the `FAIL` instead of
stopping. That is a deviation, recorded here as one; the `FAIL` is not re-labelled. The evidence it rests on (advisory,
model judgment): the four failing tests sit in `pharn/floor/entry-base-evidence.test.mjs` and
`pharn/floor/stage-verify.test.mjs`, which this increment does not touch, each measures time, ~15 parallel suites were
running, and those two files pass 61/61 alone (`VERIFY.md`).

**GATE 2** — delegated (orchestrator, under the maintainer's delegation; a model decision, not a human approval).
Fixed in the GATE-2 pass: review R1, a subdirectory target now `HEAD_UNREADABLE` (test R3, with a negative control);
the dry-run claim re-measured with the shipped classifier (unchanged: 33 / 7 / 0 false positives, three controls RED).
Accepted with reasons: the CHANGELOG preamble's prose summary of the surface, and CLAUDE.md growth of 1,284 B (within
the 2,048 B budget). After the fix pass, `origin/main` (6.65.2 → 6.67.1) was merged: one CHANGELOG conflict, resolved
by keeping main's released sections byte for byte and re-dating this PR's `[Unreleased]` entry to 2026-10-20
(`STALE_UNRELEASED` otherwise). Then, on the merged tree:

- `node pharn/floor/validate.mjs .` → exit 0, GREEN.
- `npm run check` → **exit 0**: every chain gate GREEN, `check:reconcile` CLEAN, `npm test` 5717 tests, 5711 pass,
  **0 fail**. This full-suite run is the re-measurement of the `test` gate; it does not overwrite `verify-report.json`,
  whose `FAIL` stands as computed.
- `npm run check:surface-bump` → exit 0, "no product-surface path changed (15 path(s) compared)".

changelog-entry: exit 0

lesson: deferred — batch rule (COMMON.md: no canon promotion in this batch). Candidate: a full-suite gate run while
parallel agents load the machine measures the machine; timing-bound tests failed 6, 3 and 4 times across three runs of
byte-identical outside files and passed 61/61 alone. Remedy shape: the regress/verify runners keep per-test failure
names and re-run only the failing files once, alone, reporting both results (source: `REVIEW.md` § Proposed lesson
candidate). Recorded as `deferred` rather than from Step 2b.4's closed set, at the batch's instruction.

deferred: `dev-ship-surface-bump` (run `check:surface-bump` at `/pharn-dev-ship` Step 2c; GATE 1 Q2).

Pointers: `REVIEW.md` (findings, not restated here), `GRILL.md` (advisory).

chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate.
