# SHIP — reconcile-symlink-hash

`/pharn-dev-ship` ran the gated chain in a dedicated worktree (`.claude/worktrees/reconcile-symlink-hash`, branch
`fix/reconcile-symlink-hash` from `origin/main` at `7e9ed52`). The worktree was made at the user's request ("pracuj
na osobnym worktree").

## Delegation, stated first

On 2026-09-24 the user asked for the fix ("tak, napraw to w pharn-oss") and then, mid-run: "jak skończysz zrób PR i
zmerguj jak będą zielone checki. potem skasuj worktree i brancha i daj mi znać że DONE". Both human gates were
therefore **decided by the model under explicit user delegation**. They are recorded here as model decisions, never
as human approvals.

## Stages, in order

1. `/pharn-dev-plan` wrote `PLAN.md` (`spec_content_hash` `edc3d07d…5d2c`, `applied_lessons`
   `[L1, L2, L17, L29, L34, L52, L54, L57]`, lessons-index freshness gate GREEN). `check-plan-lessons.mjs` exited
   `0`. **GATE 1 was approved by the model under the delegation above.**
2. `/pharn-dev-grill`: Step 1b `check-plan-lessons.mjs` exited **`0`**, so the chain proceeded. The 5 plan scanners
   reported nothing. There were 4 advisory concerns (2 important, 2 minor), all answered in the build (`GRILL.md`,
   `REVIEW.md`). The one with substance was F1: the adopted digest decoded the link text as UTF-8, so the build hashes
   the raw bytes instead.
3. `/pharn-dev-build`: scope set from the plan (8 paths), baseline anchored (2140 paths), spec hash matched.
   `validate` exit **`0`** (`FLOOR: GREEN — 36 capabilities`).
4. `/pharn-dev-regress`: `regression-report.json` `.verdict` = **`"no-regressions"`** (base `7e9ed52`; outside gates
   `tests` / `validate` / one `structural:*`, all `0 → 0`).
5. `/pharn-dev-verify`: `verify-report.json` `.verdict` = **`"PASS"`**. Seven gates: `test`, `validate`, `lint`,
   `format:check`, `lint:md`, `structural:*` and `reconcile`, all exit `0`, with `reconcile` `CLEAN` against this
   build's own anchor. No verifiers are registered.
6. `/pharn-dev-review` wrote `REVIEW.md`: GREEN, 0 floor-gate findings, 4 minor advisory findings. See that file;
   they are not restated here (P4).

The run ended at **GATE 2**. The GATE-2 decision, **merge**, was also taken by the model under the same delegation.
The PR merges only once its CI checks are green.

**`main` moved during the run, and the bump moved with it.** The PR opened `CONFLICTING`: `main` had taken 6.17.0
(`8ba9308`, #258). The branch merged `origin/main`, and `SKILLS_VERSION`, the badge, the CHANGELOG heading and the
two docs that name the version were re-bumped to **6.17.1**. Against the build's epoch, `check-bash-reconcile.mjs`
then reported 32 escapes. A set comparison showed every one of them is a path the merge changed, and none falls
outside that set (`VERIFY.md`). A fresh epoch was anchored as a build Step 0, and the stages were re-run on the
merged tree:

- `validate` exit **`0`**;
- `regression-report.json` `.verdict` = **`"no-regressions"`**, base `8ba9308`;
- `verify-report.json` `.verdict` = **`"PASS"`**, 7/7 gates, 3060 tests, `reconcile` `CLEAN`.

The CHANGELOG entry check was also re-run against the new `main`.

**Orchestration deviations, recorded (advisory).** This session's worktree-isolation guard refuses shell forms with
computed arguments. So regress and verify captured their exit codes with scratch Node runners (`capture.mjs` under
`.pharn/pharn-dev-regress/` and `.pharn/pharn-dev-verify/`, gitignored). Those runners execute the pinned commands
with argv arrays, and they write each map from the recorded statuses, so no value was typed by hand. The regress
baseline ran in a detached worktree at the base SHA and was removed before the HEAD run.

changelog-entry: exit 0

lesson: skipped. A candidate cleared L20's bar: L54's follow-semantics mechanism recurred at a third floor site
(`REVIEW.md`, "Proposed lesson candidate"). **Declined by the model under explicit user delegation (2026-09-24).** A
canon write is withheld from a delegated run, because the model never self-promotes (`pharn/ARCHITECTURE.md §5`).
The candidate is left for a human to take to `/pharn-dev-memory-promote`.

deferred: none

Chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate.
