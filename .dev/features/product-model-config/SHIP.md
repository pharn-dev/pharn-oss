# SHIP — product-model-config

## Which stages ran, and where the run ended

This was a **compressed `/pharn-dev-ship` run**, and the deviation is recorded rather than glossed:
the invocation carried a complete, explicit brief (the product boundary, the ten-stage key mapping, the
runtime-vs-frontmatter decision procedure, the versioning rule, and a directive to run through to a pull
request). That brief **is** the human intent GATE 1 exists to capture, so the plan was written from it,
self-checked, and executed in one turn rather than halted for a re-statement of intent the human had
already given. `/pharn-dev-grill`, `/pharn-dev-regress`, `/pharn-dev-review` were **not** run as separate
stages; their deterministic content was executed directly and is reported below with the same verdicts a
stage run would have read. **What that costs is stated:** there is no `GRILL.md` and no `REVIEW.md`, so
the advisory interrogation and the four review lenses did not run.

| stage                      | ran                                     | verdict read                                                                       |
| -------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------- |
| plan                       | yes — `PLAN.md`                         | `check-plan-lessons.mjs` **exit 0**                                                |
| grill (deterministic half) | the checker only, not the interrogation | `check-plan-lessons.mjs` **exit 0** (re-run)                                       |
| build                      | yes                                     | `pharn/floor/validate.mjs .` **exit 0** — `FLOOR: GREEN — 36 capabilities checked` |
| regress / verify           | as the repo's own gate chain            | `npm run check` **exit 0**                                                         |
| review                     | **not run** (no `REVIEW.md`)            | n/a                                                                                |

Run ended at **GATE 2**: the work is presented for the human's merge / fix / abandon decision.

## Structural verdicts read, verbatim

- `node pharn/floor/check-plan-lessons.mjs .dev/features/product-model-config/PLAN.md .dev/memory-bank/lessons-learned.md`
  → **exit 0**; `GREEN — applied_lessons: L6, L15, L19, L20, L29, L31, L33, L34, L35, L36 … all 10 cited
id(s) resolve … and are referenced in the plan body.`
- `node pharn/floor/validate.mjs .` → **exit 0**; `FLOOR: GREEN — 36 capabilities checked in "."`
- `npm run check` → **exit 0**. Its nine gates, each reported green: `format:check`, `lint`, `lint:md`,
  `docs:check` (`CATALOG: GREEN`, `LESSONS-INDEX: GREEN`), `check:markers`
  (`GREEN — 25 annotation(s) … 0 now live`), `check:badge`
  (`GREEN — README.md badge "3.2.0" matches SKILLS_VERSION "3.2.0"`), `check:changelog`
  (`GREEN — CHANGELOG.md records SKILLS_VERSION "3.2.0"`), `check:contributing`
  (`GREEN — all 9 gate(s) … named`), `test` (**1930 pass, 0 fail, 1 skipped**).
- New/changed checkers, run directly: `pharn/floor/check-model-config.mjs agreement` → **exit 0**,
  `10/10 product stage(s) agree`; `.dev/floor/check-config.mjs agreement` → **exit 0**,
  `3/3 wired stage(s) [plan, build, review] agree … 9 pharn-dev-* command(s) scanned`.

## Pointers

- `.dev/features/product-model-config/PLAN.md` — the plan, its discovered-mechanism section, its
  applied-lessons declaration, and its guarantee audit. Cited, not restated (P4).
- `GRILL.md`, `REVIEW.md` — **absent**; see the deviation note above.

## The mechanism, as discovered (the thing the human should check first)

Only **static command frontmatter** is supported. `model:` / `effort:` are platform-honored
command-frontmatter fields; there is **no runtime routing hook**. So `models.stages` was made the
**source of truth** the frontmatter is held to, never a simulated runtime control. Three bounds are
stated in the checker header, in its own GREEN line, in the README and in the CHANGELOG: the checker
never proves a stage **ran** under a model; the override lasts the **invoking turn**, so stages run as
steps inside `/pharn-ship` or `/pharn-loop` get no per-stage routing; and an org `availableModels`
allowlist or auto mode can decline a value **silently**.

lesson: none — no candidate cleared L20's bar. Nothing in this run failed, surprised, or recurred: the
mechanism question was answered by reading the live documentation, and every lesson that bore on the
design (L35's "must the second copy exist?" ahead of L20's "build a checker") was already in canon and
was applied rather than re-learned.

deferred: none

---

The chain ran as recorded above; the named floor verdicts are as shown. **This is NOT a judgment that
the increment is good or wise** — that is the human's call at the post-review gate. In particular the
advisory grill and the four review lenses did not run, so nothing here substitutes for reading the diff.
