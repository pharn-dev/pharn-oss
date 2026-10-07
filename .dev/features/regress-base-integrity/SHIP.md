# SHIP — regress-base-integrity

Run by `/pharn-dev-ship` (gated mode) for brief B1 of the 2026-10-07 production-readiness audit. Both human gates were
**delegated by the maintainer to the orchestrator**: every gate decision below is a **delegated model decision by the
orchestrator, not a human approval**.

## Stages, in order, and where the run ended

1. **`/pharn-dev-plan`** → `PLAN.md`, `check-plan-lessons` exit 0. **GATE 1** — delegated orchestrator decision:
   approved, Q1–Q5 all (a).
2. **`/pharn-dev-grill`** → `GRILL.md`. Floor verdict: `check-plan-lessons` exit **0**. Interrogation: 8 advisory
   concerns (0 blocking-severity, 6 important, 2 minor), all folded into the plan as amendments (new module
   `base-worktree.mjs`, the `base-worktree-unplaceable` code, a link-safe prefix clear, the no-re-capture rule, the
   install question's text, an advisory label).
3. **`/pharn-dev-build`** → `validate.mjs` exit **0** (GREEN).
4. **`/pharn-dev-regress`** → run 1: `.verdict` **`regressions`** (exit 1) — a RED STOP under gated mode. A caller the
   plan had not enumerated (`instruction-files.mjs`, comparing against the renamed `resolveBaseSource` kind) turned 18
   outside tests red. The agent fixed it in scope (PLAN `## Files` widened, setter re-run, reconcile `--amend-scope`) and
   re-ran: run 2 `.verdict` **`no-regressions`** (exit 0). At GATE 2 the orchestrator, by delegated decision, accepted
   that fix-and-re-run; run 1 stays recorded as the stage's first verdict (`REGRESSION.md`).
5. **`/pharn-dev-verify`** → `.verdict` **`PASS`** (`npm test` 5154/5154, validate, lint, format:check, lint:md, the
   structural eval-pair gate, reconcile CLEAN).
6. **`/pharn-dev-review`** → `REVIEW.md`: GREEN, 0 floor-gate findings, 1 important + 13 minor advisory.
7. **GATE 2** — delegated orchestrator decision: **FIX, then ship.** Fixed after GATE 2: quick item 3 names the base
   capture (pinned by a new hygiene test), the CHANGELOG states the `/pharn-ship` capture is an advisory command step,
   the install-bound claim is narrowed to what is closed (non-zero / timed-out install) and names what stays open, the
   `..foo` placement edge, the failed cleanup rendered on the `base-install-unreliable` refusal, four stale comments, a
   test for a pre-run-only run, a non-vacuous redaction check, and the trusted-doc-only refusal stated in the contract.
   Then the stack top (`origin/fix/reconcile-merged-paths`, 6.51.0) was merged in and the version renumbered to
   **6.52.0**; every gate was re-run after the merge (the PR's CI is the final record).

## Structural verdicts read (verbatim)

- `/pharn-dev-grill`: `check-plan-lessons` exit 0
- `/pharn-dev-build`: `validate` exit 0
- `/pharn-dev-regress`: run 1 `regressions`; run 2 `no-regressions`
- `/pharn-dev-verify`: `PASS`

Pointers (cited, not restated): `REVIEW.md` (findings), `GRILL.md` (advisory), `REGRESSION.md` (both runs and the audit
fixtures' before/after table), `VERIFY.md`.

Reconcile after the merge: the epoch anchored at build time predates 6.51.0's `anchored_head`, so the merged
`check-bash-reconcile.mjs` could not classify the stack's upstream files as `merged` and read them as escapes (90
findings, all files the merge brought in). Verify had already read `CLEAN` over the build's own window before the
merge; the baseline was re-anchored after the merge (`--anchor --by pharn-dev-build`, never hand-edited) and reads
`CLEAN` again. Stated because a re-anchor resets the window: writes before it are judged by the earlier `CLEAN` only.

changelog-entry: exit 0

lesson: skipped — a candidate was proposed (REVIEW.md); the orchestrator does not self-approve canon and passes it to
the human.

deferred:

- Lesson candidate for the human (from `REGRESSION.md` run 1): "Renaming a member of a shared decision's return enum is
  an API change: every caller outside the plan's `## Files` that compares against the old literal keeps working and
  silently takes the other branch." type `process`; concepts `[enumeration, referent-binding, shared-parser,
test-blindspot]`. Source: `.dev/features/regress-base-integrity/REGRESSION.md`.

_chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate._
