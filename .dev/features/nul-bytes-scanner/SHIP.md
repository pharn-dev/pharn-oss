# SHIP — nul-bytes-scanner

A thin, **advisory** roll-up of the `/pharn-dev-ship` run. It records that the chain ran and what each
stage's floor verdict was. It is **not** a "shipped", an approval, or a `PHARN ✓ reviewed` seal.

## Stages run, in order, and where the run ended

| #   | stage                | outcome                                                                  |
| --- | -------------------- | ------------------------------------------------------------------------ |
| 1   | `/pharn-dev-plan`    | `PLAN.md` written; halted at **GATE 1**                                  |
| —   | **GATE 1**           | plan **accepted** (approver role delegated — see the note below)         |
| 2   | `/pharn-dev-grill`   | `GRILL.md` written; Step 1b floor stop **GREEN**                         |
| 3   | `/pharn-dev-build`   | 5 declared files written; floor **GREEN**                                |
| 4   | `/pharn-dev-regress` | `regression-report.json` + `REGRESSION.md`; verdict **no-regressions**   |
| 5   | `/pharn-dev-verify`  | `verify-report.json` + `VERIFY.md`; verdict **PASS**                     |
| 6   | `/pharn-dev-review`  | `REVIEW.md`; 2 floor-gate findings raised, both repaired and re-verified |
| —   | **GATE 2**           | **the run ended here** — presented for the human decision                |

The run ended at **GATE 2**, not at a RED-verdict STOP. No stage returned a non-GREEN structural
verdict.

## Structural verdicts read, verbatim

Each of these — and **only** these — decided proceed-or-stop. None of them is my judgment.

| stage                | verdict source                         | value read                                     |
| -------------------- | -------------------------------------- | ---------------------------------------------- |
| `/pharn-dev-grill`   | `check-plan-lessons.mjs` exit code     | **0** (declaration well-formed; 8 ids resolve) |
| `/pharn-dev-build`   | `pharn/floor/validate.mjs .` exit code | **0** — `FLOOR: GREEN — 36 capabilities`       |
| `/pharn-dev-regress` | `regression-report.json` `.verdict`    | **`"no-regressions"`**                         |
| `/pharn-dev-verify`  | `verify-report.json` `.verdict`        | **`"PASS"`** (`failing_gates: []`)             |

The spec-hash pin (`bed2c2a5…`) was recomputed at grill and again at build and matched the plan's
`spec_content_hash` both times; `/pharn-dev-build`'s fix #4 gate is where drift would have blocked.

## Pointers (cited, not restated — P4)

- `.dev/features/nul-bytes-scanner/REVIEW.md` — the four lenses, F1–F4, and the proposed lesson
  candidate. **Advisory**; its severities are model-assigned.
- `.dev/features/nul-bytes-scanner/GRILL.md` — 4 interrogation concerns (1 blocking-severity).
  **Advisory**; it gated nothing. Its F1 (a missing positive-detection assertion) was adopted into the
  build, and its F3 was resolved during the grill itself.
- `.dev/features/nul-bytes-scanner/REGRESSION.md`, `VERIFY.md` — the two floor verdicts and their
  honest residuals.

## Review findings that changed the built artifact

Recorded here because a roll-up that showed only green verdicts would misrepresent the run.
`/pharn-dev-review` raised **two floor-gate findings against the shipped file**, both repaired inside the
plan's declared `## Files` and re-verified (`validate` GREEN; 28 scanner + 5 guard tests; eslint and
prettier clean; scanner output still byte-identical to the pre-change baseline):

- **F1 (P0, blocking)** — the new rationale comment claimed the guard "enforces" a printable-ASCII
  source, which the guard's own header explicitly refuses. The increment built to repair an instance of
  L25 had recommitted L25's shape in shipped bytes.
- **F2 (P3, important)** — that same sentence cited `.dev/floor/source-nul-guard.test.mjs`, a path the
  installer never ships, running a prose dependency product → dev (the forbidden direction). Named
  residual `product-cites-dev-path-check`: no deterministic check covers this class today.

## lesson: skipped

A candidate **was** proposed and is preserved verbatim in `REVIEW.md` § "Proposed lesson candidate"
(Candidate A — an increment repairing an instance of a lesson is the one most likely to recommit it,
because executing the remedy requires writing fresh rationale prose about the very property in
question). It was **not** carried to `/pharn-dev-memory-promote`.

**Why, stated precisely rather than dressed as a decline.** Step 2b.3 requires an explicit human answer
and has no headless branch by design. This run's approver role was delegated by the invoking session for
the two `/pharn-dev-ship` gates only; that delegation does **not** extend to a canon write, which
`ARCHITECTURE.md §5` gates on a human and which `THREAT-MODEL.md §2` #3 names as the one attack surface
with no rollback signal. No human was present to answer, so the run takes the direction the command
itself names as fail-safe: it **ends holding an unpromoted candidate**. The candidate is recorded, not
dropped — a human may take it to `/pharn-dev-memory-promote` in a separate, gated run. `REVIEW.md` also
records the counter-argument (one occurrence does not meet L20's second-occurrence bar), so the gate is
not rubber-stamped in either direction.

## deferred: none

No further lesson candidates were surfaced beyond Candidate A.

## Standing decision

**The decision is the human's.** This file records that the chain ran and its floor verdicts are as
shown — this is **NOT** a judgment that the increment is good or wise; that is the human's call at the
post-review gate. Nothing here merges, pushes, or seals.

### A note on the delegated approver role (P0/P6)

Both human gates in this run were exercised by the agent under an explicit delegation from the invoking
session, with no interactive human present. That delegation is **advisory** and the floor cannot verify
it — recorded in the `PLAN.md` `## Open questions` and again here so the audit trail never reads an
agent self-approval as a human approval. Every deterministic verdict above is unaffected: each is a
non-LLM checker's exit code that no approval, delegated or otherwise, could have moved.
