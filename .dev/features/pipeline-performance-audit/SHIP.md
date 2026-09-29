# SHIP — pipeline-performance-audit

A `/pharn-dev-ship` roll-up. It records that the chain ran and the floor verdicts it read. It is not an approval.

## Where the run ended

**GATE 2, twice.**

- **The first GATE 2.** The maintainer chose **"Fix, then PR"** (2026-09-29, an interactive form). That is the
  maintainer's decision, not the model's.
- **The fix pass.** One fix build inside the plan's `## Files`, then regress, verify and a fresh re-review.
- **Then a PR, as the maintainer asked.**

### First pass

1. **`/pharn-dev-plan`.** Written in the orchestrator's context (opus). GATE 1: the maintainer approved the plan as
   written, and chose Q1 option (1), "Audit now" (recorded in `PLAN.md`, "Resolved at GATE 1").
2. **`/pharn-dev-grill`.** A fresh opus subagent. Step 1b, `check-plan-lessons.mjs`: **exit 0** → proceed. It raised
   15 advisory concerns (0 blocking): `GRILL.md`.
3. **`/pharn-dev-build`.** Run inline, in the orchestrator's context (opus). `pharn.config.json` routes `build` to
   sonnet; running it inline was the orchestrator's choice, because the build needed the discovery already in that
   context. It was not a config routing. The build wrote:
   - `audit.mjs`;
   - the report `.dev/measurements/pipeline-performance-audit-2026-09-29.md`;
   - the `CHANGELOG.md` entry.

   It addressed the grill's findings inside the plan's files, and disclosed the rule gaps without amending the frozen
   rule. Floor: **`validate.mjs` exit 0** → proceed.

4. **`/pharn-dev-regress`.** Inline. `.verdict` **`no-regressions`** → proceed.
5. **`/pharn-dev-verify`.** Inline. `.verdict` **`PASS`** (7 gates, `reconcile` CLEAN) → proceed.
6. **`/pharn-dev-review`.** A fresh opus subagent. 0 floor-gate findings and 10 advisory findings (F1–F10) in
   `REVIEW.md`.

### Fix pass (after the maintainer's "Fix, then PR")

1. **Fix build.** Inline, under a fresh `--from-plan` scope and a new reconcile epoch. It fixed F1–F10 in `audit.mjs`
   (25 self-tests), the report and the `CHANGELOG.md` entry. Floor: **`validate.mjs` exit 0**.
2. **`/pharn-dev-regress`.** `.verdict` **`no-regressions`**. The HEAD side re-ran. The BASE map was reused from the
   first run, because the base SHA, the outside gate set and the install decision were all unchanged. This is
   disclosed in `REGRESSION.md`.
3. **`/pharn-dev-verify`.** `.verdict` **`PASS`** (7 gates, `reconcile` CLEAN).
4. **Re-review.** A fresh opus subagent. Floor GREEN; F1–F10 **all fixed**; 3 new minor advisory findings (R1–R3,
   `REVIEW.md` "Re-review").
5. **R1–R3 fixed**, as report and CHANGELOG prose, under a fresh `--from-plan` scope and epoch. **Not** re-run after
   this fix: `npm test`, `regress` and a third review. Instead the gates the change can move were run:
   - `format:check` 0, `lint:md` 0, `lint` 0, `check:changelog` 0, `check:changelog-entry` 0;
   - `validate` 0;
   - the two CHANGELOG test files 0;
   - `audit.mjs --self-test` 0;
   - `reconcile` CLEAN (2 paths, no escapes).

   CI runs the full suite on the pull request.

## Structural verdicts read, verbatim

| stage                | read                          | first pass         | fix pass           |
| -------------------- | ----------------------------- | ------------------ | ------------------ |
| `/pharn-dev-grill`   | `check-plan-lessons.mjs` exit | `0`                | (not re-run)       |
| `/pharn-dev-build`   | `validate.mjs` exit           | `0`                | `0`                |
| `/pharn-dev-regress` | `.verdict`                    | `"no-regressions"` | `"no-regressions"` |
| `/pharn-dev-verify`  | `.verdict`                    | `"PASS"`           | `"PASS"`           |

## Pointers

- Review and re-review: `.dev/features/pipeline-performance-audit/REVIEW.md` (advisory).
- Grill: `.dev/features/pipeline-performance-audit/GRILL.md` (advisory).

## Recorded lines

changelog-entry: exit 0

lesson: none — the nearest candidate (REVIEW F6: an orchestrator/agent split read from `sidechain` misreads an
orchestrator that itself runs inside an agent) is a first occurrence with no consumer yet. The remaining findings are
instances of existing lessons (L6 structured location, L40 attribution, L43 agreement). So nothing clears L20's bar.

deferred: none

## Notes for the human

- **A local-only housekeeping step.** The git-ignored `.pharn/pr-body.md` (the merged PR #298's body, from an earlier
  session) was renamed in place to `.pharn/pr-body.md.bak`, so that the whole-repo `lint:md` gate measured this
  increment rather than that file (L61). Nothing was deleted.
- **The commit, branch and PR are made at the maintainer's GATE-2 choice.** No merge and no seal.

Chain ran; the named floor verdicts are as shown. This is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate.
