# SHIP — entry-run-as-base-evidence

Base: `origin/main` `0e38b861f7839a7c19f8bb29756888d84e152568` (SKILLS_VERSION 6.48.0 → 6.49.0), branch
`feat/entry-run-as-base-evidence`. `origin/main` was re-fetched at Step 2c and had not moved.

## Stages run, in order

1. `/pharn-dev-plan` → `PLAN.md`. **GATE 1: the human approved it.** At the first presentation Q1 was answered "Stop:
   rethink scope", and then "propose a proper solution". The revised plan uses the evidence-only `base:test` slot, which
   always runs. The human chose that in an interactive form and approved the revised plan as written.
2. `/pharn-dev-grill` → `GRILL.md`. Lessons declaration: `check-plan-lessons.mjs` **exit 0**. 11 advisory findings, 0
   blocking. Their dispositions (G1–G11) are in `PLAN.md` § Grill amendments.
3. `/pharn-dev-build` → `validate.mjs` **exit 0** (GREEN, 37 capabilities).
4. `/pharn-dev-regress` → `regression-report.json` `.verdict` = **`no-regressions`**. Base was `0e38b86`; 138 outside
   test files, `validate` and one structural pair were all 0 → 0, and the scope check passed (`escaped: []`).
5. `/pharn-dev-verify` → `verify-report.json` `.verdict` = **`PASS`**. All exit 0: `test` 5120/5120, `validate`,
   `lint`, `format:check`, `lint:md`, `structural:…`, and `reconcile` CLEAN.
6. `/pharn-dev-review` → `REVIEW.md`, by an independent Opus reviewer: 0 blocking findings and 7 minor advisory ones
   (F1–F7). Read the file; they are not restated here.

Also run by the orchestrator: `npm run check` **exit 0** (5120/5120) on the built tree before the review, and
`MEASUREMENT.md` (A = main, B = candidate, 3 repetitions).

**Where the run ended: GATE 2.**

**GATE 2 decision (the human, in chat):** "promote lesson … create pull request … do not auto-fix". The review findings
were therefore **not** fixed. They are listed under `deferred:` and in the PR description. The lesson was promoted
without a further question, as instructed ("if there's a lesson to promote do it. do not ask me").

changelog-entry: exit 0

lesson: promoted L71

- L71 says that [[L20]] recurred as an under-grant. The setter silently dropped two glob `## Files` bullets (37 bullets
  → 35 paths), so a fix #7 deny stopped the build midway. Re-probed at Step 2b: the setter still prints `35 path(s)`.
- `/pharn-dev-memory-promote` ran its own floor steps: title shape exit 0, `check-provenance.mjs` GREEN twice, canon
  hash unchanged. The human's accept was given in chat **before** the entry was shown, and the entry's provenance line
  says so.

deferred:

- REVIEW F1 — the claim that a materialization failure "is returned as `log-unverified`" is overbroad. A real write
  error throws, which is fail-closed with no verdict and recoverable by `--resume`. The wording is in
  `entry-base-evidence.mjs:30` and `regression-report.md`.
- REVIEW F2 — the derived stamp gets no `validateStamp` self-check before it is written.
- REVIEW F3 — `--start` ignores what `discardEntryOffer()` returns. Harmless, because the offer binds the stamp by
  digest.
- REVIEW F4 — the G9 disposition promised a `style-unattributed` sentence in `MEASUREMENT.md` and the CHANGELOG, and it
  was not delivered.
- REVIEW F5 — the G11 guard withholds only `base:test`. Other mapped gates can still run while a leftover regress BASE
  checkout exists. This sits inside the named "ignored content" bound.
- REVIEW F6 — the miss-order inversion: `source-unusable` comes after `source-unbound`. Reachable only with a forged
  offer.
- REVIEW F7 — the cost bullet in `.claude/commands/pharn-loop.md` does not mention entry-derived BASE or the slot's cost
  on quick runs.
- L71's remedy (a `/pharn-dev-plan` Step 4 comparison of the setter's set against the `## Files` bullets, plus naming
  each bullet the setter drops) is unbuilt.

Orchestration notes (advisory):

- Regress and verify ran in one background Opus agent in this checkout. The review ran in another. The sibling
  `.claude/worktrees/` caused no failures.
- The writes-scope dropped the plan's glob bullet, so `measure.mjs` and `MEASUREMENT.md` were named explicitly, the
  setter was re-run, and reconcile scope amendment 1 was recorded. Amendments 2 and 3 are the promote and ship scopes.
- `npm run check` initially failed 1 of 5120 tests: `check-quick-scope.test.mjs` pins the `scope-inputs.mjs` import line.
  The fix was a separate import line, and the next full run was green.

_Chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate._
