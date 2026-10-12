# SHIP — loop-no-prompts

- Stages run, in order: `/pharn-dev-plan` → GATE 1 → `/pharn-dev-grill` → `/pharn-dev-build` → `/pharn-dev-regress` →
  `/pharn-dev-verify` → `/pharn-dev-review` → GATE 2.
- GATE 1: the person answered the plan form, then said "get all recommended answers" — plan approved with the
  recommended options (stop at entry in plan mode; `allowed-tools` on `/pharn-loop` only).
- Grill: `check-plan-lessons.mjs` exit 0 (FLOOR); 5 advisory concerns (`GRILL.md`).
- Build: `validate` exit 0 (GREEN, 37 capabilities).
- Regress: `regression-report.json` `.verdict` = `no-regressions`.
- Verify: `verify-report.json` `.verdict` = `PASS`. The first gate run recorded `test: 1` with its output discarded;
  full re-run 5305 / 0 is the recorded exit (`VERIFY.md` states this).
- Review: `REVIEW.md` — 0 floor-gate findings, 4 advisory.
- changelog-entry: exit 0
- lesson: none — no candidate cleared L20's bar; the one surprise (verify discards `npm test` output, so a one-off red
  cannot be diagnosed) is a first occurrence. Step 2b.3's form was not shown: the person asked for the run to finish
  through a merged PR without further interaction.
- deferred: verify-test-output-discarded — keep `npm test`'s output from the verify gate run so a red can be
  attributed.
- GATE 2: delegated by the person in chat ("when done create PR and merge it") — a model action under that
  delegation, not a human review.

chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate.
