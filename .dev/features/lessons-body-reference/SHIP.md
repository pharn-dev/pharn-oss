# SHIP — lessons-body-reference

- date: 2026-09-08
- base commit: `7db7cb9`
- SKILLS_VERSION: `2.8.0` → `3.0.0` (MAJOR)

## What ran, and what did NOT — stated plainly (P0)

This was **not** a full `/pharn-dev-ship` staged chain. The human directed the work conversationally
(doc audit → fix → close the gap) rather than through `/pharn-dev-plan → /pharn-dev-grill → …`, and this
record says so rather than implying six stages executed.

| Stage                | Ran?          | Verdict read                                                                                                         |
| -------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------- |
| discovery            | **yes**       | reported to the human; 6 halt conditions checked, none triggered                                                     |
| `/pharn-dev-plan`    | **partially** | `PLAN.md` authored + self-checked GREEN; GATE 1 satisfied by explicit human direction, not by the command's own halt |
| `/pharn-dev-grill`   | **no**        | the interrogation did not run; `check-plan-lessons.mjs` was run directly (GREEN)                                     |
| `/pharn-dev-build`   | **no**        | edits made directly; the floor was run (`npm run check`)                                                             |
| `/pharn-dev-regress` | **no**        | no `regression-report.json` — see the clean-worktree run below, which is weaker                                      |
| `/pharn-dev-verify`  | **no**        | no `verify-report.json`                                                                                              |
| `/pharn-dev-review`  | **no**        | not run                                                                                                              |

**So no stage `.verdict` file backs this record.** What DOES back it is the aggregate gate, run twice.

## Floor verdicts actually observed

- `node pharn/floor/check-plan-lessons.mjs .dev/features/lessons-body-reference/PLAN.md .dev/memory-bank/lessons-learned.md`
  → **GREEN** (`applied_lessons: L1, L3, L4, L6, L20, L33, L34`; all 7 resolve **and** are referenced in
  the body — the increment's own new sub-check, dogfooded).
- `npm run check` **in the working tree** → **RED at `check:markers`**, and the RED is **not this
  increment's**: `pharn/ARCHITECTURE.md` carries a **staged, uncommitted human edit** that removed the
  `archetype-maps` annotation. That file is hook-protected and human-only; it is untouched here and is
  **not** in this increment's commit.
- `npm run check` **in an isolated `git worktree` at `7db7cb9`** → **all 8 gates GREEN**, `1665/1665`
  tests pass (baseline `1653`). **What that tree contained, precisely** (it is NOT byte-identical to the
  commit, and saying "the tree CI will see" without this note would overstate it): the 12 tracked-file
  diffs **plus** `PLAN.md`, and **not** `SHIP.md` — this record did not exist when the run happened, and
  cannot, since it reports that run's result. The gap is bounded and checkable rather than asserted: both
  omitted paths are `.dev/features/**` markdown, which **no** gate in `scripts.check` reads as input —
  `pharn/floor/validate.mjs` excludes `.dev/` wholesale, and `docs:check` / `check:markers` /
  `check:badge` / `check:contributing` each range over a fixed, named surface that does not include it.
  They ARE linted (`lint:md`, `format:check` are whole-repo), and both were run against them separately —
  `0 issues`. **The authoritative answer is CI on the pushed branch, not this local run.**
- **A second `npm run check` was run after the review-fix commit** and is reported in the same terms.

## Corpus measurement (the P7 evidence, and the migration proof)

- Before: 150 committed `PLAN.md` — 54 GREEN / 96 RED (every RED = the pre-2.0.0 "declares no
  `applied_lessons`"). Of the 54, **52 cite ≥1 id and 0 omit a cited id from the body.**
- After sub-check (D): **no new RED** — 55 GREEN / 96 RED, the +1 being this increment's own plan.
- Six committed **test fixtures** did regress and were migrated exactly as a user would.

## Files committed (12 + this record + the plan)

`pharn/floor/check-plan-lessons.mjs`, `pharn/floor/check-plan-lessons.test.mjs`,
`.claude/commands/{pharn-plan,pharn-dev-plan,pharn-grill,pharn-dev-grill,pharn-ship,pharn-dev-ship}.md`,
`CLAUDE.md`, `CHANGELOG.md`, `SKILLS_VERSION`, `README.md`.

## Standing decision

The chain's floor verdicts are as shown. **This is NOT a judgment that the increment is good or wise** —
that is the human's call. No seal is issued; `PHARN ✓ reviewed` is not applied.

**Named residual:** `/pharn-dev-review`'s four advisory lenses never ran, so no lens-level finding exists
for this increment. The substitute is the human's review of the PR (and CodeRabbit's), which is
advisory-grade and is not equivalent.
