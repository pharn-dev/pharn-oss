# SHIP — gate-run-stamp

A thin, **advisory** roll-up of the `/pharn-dev-ship` run. It records that the chain ran and what each
stage's floor verdict was. It is **not** a judgment that the increment is good.

## Stages, in order

| stage                       | ran | structural verdict read                                          |
| --------------------------- | --- | ---------------------------------------------------------------- |
| `/pharn-dev-plan`           | ✓   | **GATE 1** — human approved (Option B, the full D1–D9 scope)     |
| `/pharn-dev-grill`          | ✓   | `check-plan-lessons.mjs` exit **0**                              |
| `/pharn-dev-build`          | ✓   | `pharn/floor/validate.mjs .` exit **0** (GREEN, 36 capabilities) |
| `/pharn-dev-regress`        | ✓   | `regression-report.json` `.verdict` = **`no-regressions`**       |
| `/pharn-dev-verify`         | ✓   | `verify-report.json` `.verdict` = **`PASS`**                     |
| `/pharn-dev-review`         | ✓   | no structural verdict by design — 0 floor-gate, 5 advisory       |
| `/pharn-dev-memory-promote` | ✓   | `check-provenance.mjs` exit **0**; human accepted                |

**Where the run ended:** **GATE 2** — the post-review human decision. No stage returned a non-GREEN
verdict, so there was no RED-verdict STOP.

## The verdicts, verbatim

- **`/pharn-dev-build`** → `validate` exit `0` — `FLOOR: GREEN — 36 capabilities checked in "."`
- **`/pharn-dev-regress`** → `"verdict": "no-regressions"`, `regressions: []`, `pre_existing: []`, over
  `tests` / `validate` / `structural:*` at base `51b8f47` and at HEAD. Style gates were skipped by the
  deterministic config-touch rule and are absent from **both** maps.
- **`/pharn-dev-verify`** → `"verdict": "PASS"`, `failing_gates: []`, over seven gates: `test`, `validate`,
  `lint`, `format:check`, `lint:md`, `structural:*`, `reconcile`. `reconcile` reconciled **23 changed
  paths with 0 escapes**.

## Pointers (cited, not restated — P4)

- `.dev/features/gate-run-stamp/GRILL.md` — 9 concerns, 2 at blocking severity. **R1** (completeness must
  not become a gate, or `INCOMPLETE` becomes unreachable) and **R2** (an eleventh contract makes
  `pharn/ARCHITECTURE.md §4` stale) were resolved in the plan **before** the build; **R4** and **R5** too.
  **R3, R6–R9** were carried forward as accepted-with-notes.
- `.dev/features/gate-run-stamp/REVIEW.md` — 0 floor-gate findings, 5 advisory. Two want a human's eye:
  the **P3 module-axis debt** in `gate-run-core.mjs` (GRILL R3, now judged rather than deferred again) and
  a **P0 reduction that is right for the wrong reason** in the CLAUDE.md block, a one-sentence fix.
- `.dev/features/gate-run-stamp/architecture-patch/APPLY.md` — the verified one-hunk patch for
  `pharn/ARCHITECTURE.md`, **for a human**. The agent cannot write that file.

lesson: promoted L53

deferred: none — the second candidate surfaced at 2b.1 (a fail-closed refusal must name the input it
actually read) was **fixed in this increment with a test** rather than carried; by L20's bar one
occurrence is not yet a floor-check trigger, and it is recorded in `REVIEW.md` as an observation.

## What this run does NOT assert

`/pharn-dev-ship` added **no** floor primitive. Every guarantee above belongs to a **sub-stage** checker;
this command's act of invoking them and reading their exit codes is **advisory orchestration**. Running
the stages in order is likewise advisory — nothing on the floor forces the sequence.

Specifically **not** established: that the stamp's `fingerprint.final` matches the tree when a verdict is
read (freshness is a later increment); that a stage ran its runner at all; that any stamp is **genuine** —
a self-consistent fabricated stamp passes every check here, and a test builds one to prove it (**L43**).
The `structural:*` gate **keys** also remain model-composed, disclosed in the command's own audit.

**chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or
wise; that is the human's call at the post-review gate.**
