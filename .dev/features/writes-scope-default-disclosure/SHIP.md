# SHIP — writes-scope-default-disclosure

**Where the run ended:** GATE 2 (post-review human decision). No stage returned a non-GREEN verdict, so
no RED-verdict STOP occurred.

## Stages run, in order

`/pharn-dev-plan` → **[human approved at GATE 1, with three corrections]** → `/pharn-dev-grill` →
`/pharn-dev-build` → `/pharn-dev-regress` → `/pharn-dev-verify` → `/pharn-dev-review` → **GATE 2**.

## Structural verdicts read, verbatim

| stage                | verdict source                         | value                                    |
| -------------------- | -------------------------------------- | ---------------------------------------- |
| `/pharn-dev-grill`   | `check-plan-lessons.mjs` exit code     | **0** (GREEN)                            |
| `/pharn-dev-build`   | `pharn/floor/validate.mjs .` exit code | **0** (`FLOOR: GREEN — 36 capabilities`) |
| `/pharn-dev-regress` | `regression-report.json` `.verdict`    | **`no-regressions`** (exit 0)            |
| `/pharn-dev-verify`  | `verify-report.json` `.verdict`        | **`PASS`** (exit 0)                      |

The spec pin held at every re-check: `sha256(pharn/ARCHITECTURE.md)` =
`69c8395365abb719cc3132ffa7a7607051b1e04ca3a3fa70ee563b86b857f18e`, equal to the PLAN's
`spec_content_hash` at plan, at grill (Step 1.2, warn-only) and at build (Step 1.2, blocking).

## Artifacts

- `.dev/features/writes-scope-default-disclosure/PLAN.md` — the approved plan, with the human's three
  GATE-1 decisions recorded under `## Open questions (HALT)`.
- `.dev/features/writes-scope-default-disclosure/GRILL.md` — advisory, 5 concerns (0 blocking-severity,
  2 important, 3 minor). Cited, not restated (P4).
- `.dev/features/writes-scope-default-disclosure/REGRESSION.md` + `regression-report.json`.
- `.dev/features/writes-scope-default-disclosure/VERIFY.md` + `verify-report.json`.
- `.dev/features/writes-scope-default-disclosure/REVIEW.md` — advisory, **GREEN**: 0 floor-gate findings,
  3 advisory. Cited, not restated (P4).

## Post-approval edits to the approved bullet (flagged, with reverts)

Two clauses of the GATE-1-approved bullet text were changed at build, both driven by a **measurement**
the grill produced after approval. Each is a one-clause repair with a one-word revert:

1. "the **only** paths … may write are" → "are **restricted to**" (GRILL G1). The approved universal
   quantifier is measurably false for `.pharn/writes-scope.json` (probed: exit 2). "Restricted to" is an
   upper bound and true, and it does **not** restore the exception sentence the human ruled out at
   GATE-1 decision (2).
2. "writes **exactly the paths**" → "writes **exactly the concrete paths**" (GRILL G2). Probed: a
   `## Files` list of two bullets, one of them a glob, yields `1 path(s)`.

Nothing else in the approved text moved. The human's three GATE-1 decisions were applied unchanged.

## Lesson

`lesson: promoted L37`

The candidate proposed in `REVIEW.md` was **accepted by the human at GATE 2** and promoted through
`/pharn-dev-memory-promote` under that command's own gate: `check-provenance.mjs` GREEN (`id "L37"`
unique, `type "contract"`, 5 concepts), scope pinned to `.dev/memory-bank/lessons-learned.md` alone, the
entry appended, and `docs/lessons-index.md` regenerated with the **narrow** generator
(`node .dev/floor/gen-lessons-index.mjs .`, never `npm run docs:generate` — L22). `check-lessons-index`
is GREEN and the index now reads `37 lessons · 37 tagged · 0 malformed · 0 untagged`.

**`## L37` — A doc stating a guard's bounds must be PROBED against the guard, not read off it — the
universal quantifier is where the drift lands.** Both defects G1 and G2 came from a **correct reading**
of `enforce-writes-scope.cjs`, survived a human plan-gate approval, and fell to a 30-second probe. The
entry states its distinct claim narrowly against L2 (a contract may cite only a live floor op — this
sharpens it: for a _quantified_ claim, reading is not the verification, executing is) and against L36
(there the enumeration was mis-transcribed; here it was transcribed correctly and the quantifier around
it was wrong). The self-skipping-test observation is carried as corroborating evidence in the entry's
`**Why it matters.**`, because it is the same failure on a different surface — a suite that skips still
exits 0, so `check-verify.mjs` cannot see it.

**Two procedural notes, recorded rather than smoothed over.**

- **Step 2b.3's `AskQuestion` form was unavailable** in this agent context, so the accept/deny gate was
  routed to the human through the GATE-2 report and their decision relayed back naming this candidate
  explicitly. That is an **explicit human accept**, which is what Step 5 requires — but the channel
  differed from the prescribed one, and saying so is cheaper than letting a future reader assume the form
  ran.
- **The closed `lesson:` set had no member for the intermediate state** this run passed through — "GATE 2
  reached, candidate proposed, human's answer pending". `skipped` asserts the human _declined_;
  `not-reached` asserts Step 2b did not run; both false. The interim SHIP.md used `error <reason>` with
  its reason stated. Now resolved to `promoted L37`, but the gap is real and is a note for whoever next
  touches `pharn-dev-ship.md`'s outcome enum — the L36 shape, in the very file L36 was promoted from.

## Deferred

`deferred: none` — Step 2b surfaced exactly one candidate and it is carried above, not dropped.

## GATE 2 outcome

The human decided **fix F1, then ship**, and endorsed both post-approval edits above.

- **REVIEW F1 — REPAIRED.** `.dev/features/**` now carries "(present only in PHARN's own repo, never in
  an install)". The human's reasoning is recorded because it is the sharper statement of the finding: a
  disclosure bullet that reproduces the disease it discloses is the P0 failure the finding exists to
  close.
- **All four floor verdicts were re-run over the final bytes** and still stand: `validate` 0,
  `regression-report.json` `no-regressions`, `verify-report.json` `PASS`, and the grill's
  `check-plan-lessons` 0 (unchanged — the PLAN did not move). `npm run check` is exit 0 at
  **1683 pass / 0 fail / 0 skipped**.
- **A real coverage gap was closed in the re-run, and it is the most instructive part of GATE 2.**
  Restoring the `node_modules` symlink raised the suite from `1682 pass / 1 skipped` to
  `1683 pass / 0 skipped`: the test that had been silently self-skipping was
  `style: a spliced README passes the repo's prettier and markdownlint unchanged` — the single most
  relevant test in the suite for a README-only change. `check-verify.mjs` sees exit 0 either way, so the
  first PASS was true but **did not cover** the thing most worth covering. Full analysis in `VERIFY.md`;
  folded into L37 as corroborating evidence.
- The earlier precaution of removing that symlink was **unnecessary**: `node_modules` is excluded via
  `.git/info/exclude:9` (verified live with `git check-ignore -v`), so it could never have appeared in
  the regress partition. The premise was half right and the conclusion wrong, and it cost real coverage.

## Carried unrepaired (recorded, not fixed)

- **REVIEW F2 (`minor`, `README.md:340`)** — "a stage sets the scope in its first step" is advisory
  orchestration sitting one clause from floor-grade claims. Judged minor: "the intended posture" hedges
  it, and the failure direction is safe (a skipped setter denies more, not less).
- **REVIEW F3 (`minor`, `README.md:345`)** — the `--from-plan` remedy is reachable but its precondition
  (the setter has no arbitrary-path mode; a markdown file must exist for it to parse) is unstated.
- **GRILL G3–G5** — `PLAN.md` hygiene: a residual named without a reopen trigger, a determinism-audit
  line calling a prose lookup a "membership test", and README cites pinned by line number that this
  increment's insertion shifts.

## Orchestration deviations (recorded, verdict-neutral)

- `/pharn-dev-regress`'s `tests` gate ran as `npm test`, not the pinned
  `cat outside-tests.txt | xargs node --test` — both that form and the `xargs -0` variant were refused by
  this session's sandbox. `npm test` is the repo's own canonical gate, its universe is equal to the
  70-path outside list here, and it is neither form L5/L16 forbid. Full reasoning in `REGRESSION.md`.
- An untracked `node_modules` **symlink** (harness setup) was removed before the first regress partition
  and **restored at GATE 2** — see the GATE-2 outcome above for why the removal was both unnecessary and
  costly. It is not part of this increment and is not committed (excluded at `.git/info/exclude:9`).

## Standing statement

The chain ran; the named floor verdicts are as shown. **This is NOT a judgment that the increment is
good or wise** — that judgment was the human's, made at GATE 2, and it is recorded above as a decision
rather than inferred from a green run. No seal is issued and nothing is merged; `/pharn-dev-ship` claims
no guarantee of its own — every verdict above belongs to a sub-stage's checker. The commit and PR that
follow this record exist because the human directed them at GATE 2, not because the chain was green.
