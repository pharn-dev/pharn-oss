# SHIP — plan-instruction-file-rule

Gated `/pharn-dev-ship`, worktree `.claude/worktrees/plan-instruction-file-rule`, base `d40667d` (6.35.2).

## Where the run ended

**GATE 2.** Every stage ran, in order:

- `/pharn-dev-plan` → **GATE 1**, approved by the human ("Approve as written");
- `/pharn-dev-grill`;
- `/pharn-dev-build`;
- `/pharn-dev-regress`;
- `/pharn-dev-verify`;
- `/pharn-dev-review`.

## Structural verdicts (verbatim)

- `/pharn-dev-grill`: `check-plan-lessons.mjs` exit **0** (GREEN, 7 cited ids). Its advisory findings F1 and F2 were
  addressed in the build; see BUILD.md.
- `/pharn-dev-build`: `validate.mjs` exit **0** (`FLOOR: GREEN — 36 capabilities checked`).
- `/pharn-dev-regress`: `regression-report.json` `.verdict` = **`"no-regressions"`**.
- `/pharn-dev-verify`: `verify-report.json` `.verdict` = **`"PASS"`**: 7 gates at exit 0, `reconcile` `CLEAN`.

Review: [REVIEW.md](REVIEW.md), GREEN, 0 floor-gate findings and 4 advisory findings (cited there, not restated).
Grill: [GRILL.md](GRILL.md), advisory.

changelog-entry: exit 0

lesson: promoted L68

deferred: none

## For the human at GATE 2

- **`main` moved during the run.** `origin/main` is at 6.36.0 (#307, `dae61b2`), so this branch's 6.35.3 is stale. The
  branch needs `git merge origin/main` and a renumber to **6.36.1**. The literal `6.35.3` appears in `SKILLS_VERSION`,
  the README badge, the CHANGELOG heading and its entry, the test comment and the §3e text. `CHANGELOG.md`, `README.md`
  and `SKILLS_VERSION` will conflict. The `pharn-plan.md` edits are in different regions (Step 3 here, Step 4c on
  `main`). Step 2c's GREEN was computed against the merge-base `d40667d`, before that renumber.
- **`LIMITS.md` §3e is not on the branch yet.** It was applied mid-run and then reverted, so verify's reconcile gate
  stayed clean (L67). Until it is re-added, CHANGELOG 6.35.3's "applied by a human" is false (REVIEW advisory 1). The
  text is in PLAN.md, "The `LIMITS.md §3` text".
- **A parallel session** (`instruction-growth-gate`, same base) is building the instruction-growth floor gate that this
  entry calls unbuilt (REVIEW advisory 4).
- **PENDING, not done:** the post-merge dogfood. The next pharn-starter `/pharn-plan` that changes no convention should
  name no instruction file in `## Files`.

## After GATE 2 — the human chose "fix"

The human chose **fix**. The orchestrator committed (`aa8e0e9`), opened PR #310 and merged `origin/main` twice, because
main kept moving:

- **First merge, `7e0e18a`:** brought in 6.36.0 (#307) and 6.37.0 (#308), and renumbered this increment to 6.37.1.
- **Second merge:** brought in 6.38.0 (#311, the `instruction-growth` gate) and renumbered to **6.38.1**.
  - #311 promoted its own **L67**, so this run's lesson was renumbered to **L68**. Canon was first reset to
    `origin/main`'s exact bytes (`cmp` equal). L68 was then re-checked by `check-provenance.mjs` (GREEN) and appended
    with Edit under the promote scope, and the index was regenerated (`check-lessons-index` GREEN).
  - #311 also added `LIMITS.md` **§3e**, about the instruction set and its gate. This increment's bound therefore
    becomes **§3f**, still the human's edit.
  - The CHANGELOG no longer calls the deterministic backstop unbuilt: it names the 6.38.0 `instruction-growth` gate,
    which bounds per-change growth, never whether a plan names `CLAUDE.md`.
- Both merges kept main's released CHANGELOG sections and canon byte-for-byte. Renumbered lines were found by diffing
  the added lines against `origin/main`.
- The run records above keep the numbers they had when written (6.35.3, 6.36.1, L67).
- The gates were re-run after the merge (see the PR).

Chain ran; the named floor verdicts are as shown. This is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate.
