# SHIP — loop-6-72-cost-prep

Advisory roll-up of one `/pharn-dev-ship` run, 2026-10-25.

## Where the run ended

**RED-verdict STOP at `/pharn-dev-regress`** (its Step 1.4 scope partition). Stages run, in order:

1. `/pharn-dev-plan` → `PLAN.md`; `check-plan-lessons.mjs` exit 0. **GATE 1 approved by the human** through the
   form, with two open questions answered: install `main`'s tip (6.73.1), and pass the SPEC's Intent instead of
   copying the SPEC into the tree.
2. `/pharn-dev-grill` → `GRILL.md`; `check-plan-lessons.mjs` exit **0** (proceed). Five advisory concerns; the main
   one (the prompt's run-2 reset would delete the installed files) was put to the human, who chose a local commit of
   the install and a copy-then-delete of PHARN's git-dir records.
3. `/pharn-dev-build` → `node pharn/floor/validate.mjs .` exit **0** (`FLOOR: GREEN — 37 capabilities`).
4. `/pharn-dev-regress` → `check-regress.mjs scope` exit **1**: four paths reported `escaped` —
   `.claude/skills/pharn-ci-cover`, `.claude/skills/pharn-ci-explain`, `.claude/skills/pharn-ci-install`,
   `skills-lock.json`. No `regression-report.json` was written; the verdict step was not reached.
5. `/pharn-dev-verify`, `/pharn-dev-review`: not run.

**What the four paths are (evidence for the human, not a re-decision of the verdict).** They are untracked files
present before this session: the session's opening git status lists `?? .claude/skills/` and `?? skills-lock.json`,
their mtimes are 2026-10-20 11:24, and all four are in the reconcile baseline anchored at build Step 0. The three
skill entries are symlinks into `.agents/skills/`. This is `.dev/memory-bank/lessons-learned.md` L17's shape:
`scope` tests changed-since-base, and with `base = HEAD` on a dirty tree, pre-existing untracked files read as
escapes.

## Verdicts read

- `/pharn-dev-grill`: `check-plan-lessons.mjs` exit 0
- `/pharn-dev-build`: `validate` exit 0
- `/pharn-dev-regress`: `check-regress.mjs scope` exit 1 (no `.verdict`)
- `/pharn-dev-verify`: not reached

Pointers: `GRILL.md` (advisory). No `REVIEW.md` exists.

## The measurement-prep outcome (the increment's own result)

`.dev/measurements/loop-6.72-prep.md` records it: baseline `42d419cd`; 6.73.1 installed at `9ee54c8b` (the CLI has
no SHA option); lint, typecheck, format:check and test GREEN at the base; **`build` RED** (four production
environment variables unset), so the request's step-5 STOP applied: **BLOCKED**, no `RUN-PROTOCOL.md` written, the
install not committed, no loop run.

**Later the same day, outside this chain.** On the human's instructions:

- the measurement moved to pharn-starter HEAD;
- that repository's two red gates were fixed in pharn-dev/pharn-starter#257, which the human merged;
- the model picked the feature.

The protocol is now **GO** at pharn-starter `9c6343b7`. Section 8 of `.dev/measurements/loop-6.72-prep.md` records
it. None of that re-ran this chain's stages.

## Process notes

- One write went through Bash rather than Edit: a two-citation correction to `GRILL.md`, made while that file was the
  active writes-scope. In scope, but outside the PreToolUse hooks (L19).
- The session restarted while the base gates ran in the background; `test` was killed before it reported and was
  re-run in the foreground (GREEN).

changelog-entry: not-reached (regress)

lesson: not-reached (regress)

deferred: none

chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate.
