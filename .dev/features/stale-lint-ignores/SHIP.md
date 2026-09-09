# SHIP — stale-lint-ignores

A thin, **advisory** roll-up of a `/pharn-dev-ship` run. Nothing reads this file.

## Stages run, in order

`/pharn-dev-plan` → **[GATE 1 — human approved]** → `/pharn-dev-grill` → `/pharn-dev-build` →
`/pharn-dev-regress` → `/pharn-dev-verify` → `/pharn-dev-review` → **GATE 2 (where this run ends)**.

The run ended at **GATE 2**, not at a RED-verdict STOP. No stage returned a non-GREEN verdict.

## Structural verdicts read, verbatim

| stage                | verdict source                       | value                                    |
| -------------------- | ------------------------------------ | ---------------------------------------- |
| `/pharn-dev-grill`   | `check-plan-lessons.mjs` exit code   | **0** (GREEN)                            |
| `/pharn-dev-build`   | `pharn/floor/validate.mjs` exit code | **0** (`FLOOR: GREEN — 36 capabilities`) |
| `/pharn-dev-regress` | `regression-report.json` `.verdict`  | **`no-regressions`**                     |
| `/pharn-dev-verify`  | `verify-report.json` `.verdict`      | **`PASS`** (`failing_gates: []`)         |

Each was read as a proceed input; none was re-decided by judgment. The spec-hash pin
(`69c8395365abb719cc3132ffa7a7607051b1e04ca3a3fa70ee563b86b857f18e`) was recomputed at plan, grill and
build and matched every time.

## Pointers (cited, not restated — P4)

- `.dev/features/stale-lint-ignores/REVIEW.md` — the four-lens review (**GREEN, 0 floor-gate findings, 2
  advisory**) and the deferred lesson candidate.
- `.dev/features/stale-lint-ignores/GRILL.md` — the advisory interrogation (**5 concerns: 0 blocking, 3
  important, 2 minor**) plus the GATE-1 resolutions, recorded there because `PLAN.md` is outside every
  later stage's writes-scope.
- `.dev/features/stale-lint-ignores/VERIFY.md` — including the change-sensitive probe run at the real
  path, which the gate map structurally cannot make.
- `.dev/features/stale-lint-ignores/REGRESSION.md` — including the two declared orchestration deviations.

## Lesson

`lesson: none` — the increment's best output (a proposed floor check must pass a **discriminability**
test, not only L35's necessity test) does not meet L20's bar: nothing failed, no run was misled, and the
two entries cost measurably zero, so there is no first occurrence to be the second of.

`deferred: the discriminability-before-necessity rule for a proposed floor check — recorded verbatim in REVIEW.md § "Proposed lesson candidate", with its reopen condition (a second instance: a proposed checker over a gitignored or generated zone where absence is the normal state).`

## Scope discipline

One file changed: `.markdownlint-cli2.jsonc` (+10 / −15). `check-regress.mjs scope` returned
`escaped: []`, with `escape_exempt` naming exactly this feature's own stage artifacts. No
`CHANGELOG.md`, no `SKILLS_VERSION` — `.markdownlint-cli2.jsonc` is repo-meta, outside the
product surface, so per CLAUDE.md's SKILLS_VERSION discipline this increment bumps nothing.

## Standing decision

The chain ran; the named floor verdicts are as shown — **this is NOT a judgment that the increment is
good or wise; that is the human's call at the post-review gate.** No merge, no push, no commit, no
`PHARN ✓ reviewed` seal was issued by this run.
