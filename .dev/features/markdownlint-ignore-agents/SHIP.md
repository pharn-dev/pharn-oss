# SHIP — markdownlint-ignore-agents

Gated `/pharn-dev-ship` run (no `--loop`) on base `0eb19bea288d0064539f054aa0581194f08db48f`, working tree, uncommitted.
All stages ran inline in one session.

## Stages, in order, and where the run ended

1. `/pharn-dev-plan` → [`PLAN.md`](./PLAN.md). `check-plan-lessons.mjs` GREEN (exit 0). **GATE 1:** the human
   answered "Approve as written" through the interactive form.
2. `/pharn-dev-grill` → [`GRILL.md`](./GRILL.md). Step 1b `check-plan-lessons.mjs` **exit 0** (the proceed/stop input).
   The interrogation is advisory: 3 concerns (0 blocking-severity, 1 important, 2 minor), presented, gating nothing.
3. `/pharn-dev-build` → `.markdownlint-cli2.jsonc`, `.dev/floor/command-hygiene.test.mjs`, `CHANGELOG.md`.
   `node pharn/floor/validate.mjs .` **exit 0** (`FLOOR: GREEN — 36 capabilities`).
4. `/pharn-dev-regress` → [`regression-report.json`](./regression-report.json) `.verdict` **`"no-regressions"`**.
5. `/pharn-dev-verify` → [`verify-report.json`](./verify-report.json) `.verdict` **`"PASS"`**.
6. `/pharn-dev-review` → [`REVIEW.md`](./REVIEW.md). GREEN, 0 floor-gate findings, 3 advisory. The findings are
   in that file and are not restated here.

The run ended at **GATE 2**.

## The prompt's requested confirmation

With `.agents/` present (a gitignored copy of the main checkout's 19 `SKILL.md` files in this worktree),
`npm run lint:md` exits **0**: `Linting: 1470 files`, `Summary: 0 issues in 0 files`. Before the change the same
condition gave exit 1 with 19 MD025 errors (`regression-report.json`: `lint:md` base 1 → head 0).
`.prettierignore` was measured not to need an entry, because prettier 3 reads `.gitignore`.

## Recorded lines

changelog-entry: exit 0

lesson: promoted L61

deferred: none

## Notes for the human at GATE 2

- **`origin/main` moved during the run.** It is now `ee81d47` (PR #274, `SKILLS_VERSION` 6.21.2). None of this
  increment's files overlap #274's, but its new `## [6.21.2]` section sits where this run's `[Unreleased]` entry
  was inserted. Opening a PR needs `origin/main` merged first. The CHANGELOG then keeps #274's section
  byte-for-byte, with this entry in `[Unreleased]` above it. Step 2c's `changelog-entry` GREEN was computed
  against the merge-base `0eb19be`, which is how that check is defined.
- **Environment, outside the diff.** `.agents/` was copied into this worktree for measurement. It is gitignored
  and is still present. `.pharn/pharn-dev-ship/pr-body.md`, the merged PR #273's body left by the previous run
  here, was moved to the session scratchpad; `lint:md` had read it too (one MD038).
- **The promotion widened the diff.** It added `.dev/memory-bank/lessons-learned.md` (L61) and the regenerated
  `docs/lessons-index.md`. Both are apparatus or generated repo-meta, so `SKILLS_VERSION` still does not move.
  `check-bash-reconcile` stayed CLEAN after the promotion, with the canon write amended into the epoch and the
  index exempted by name.

## After GATE 2 — the human said "merge"

- Committed as `eb1b01e`, then merged `origin/main` (`ee81d47`) without a force-push. `CHANGELOG.md`: main's
  `[6.21.2]` section and everything below it are byte-identical to `origin/main`, with this entry in
  `[Unreleased]` above them.
- **Lesson id collision.** #274 had promoted its own L60. Main's L60 was kept byte-for-byte: canon was first
  resolved to exactly `origin/main`'s bytes (`cmp` equal). This run's candidate was then re-run through
  `check-provenance.mjs` as **L61** (GREEN) and appended through the hook-gated Edit tool, with its body
  byte-equal to the accepted candidate. The entry's `promoted:` line records the renumbering.
  `docs/lessons-index.md` was regenerated (61 lessons, `check-lessons-index` GREEN).
- The `lesson:` line above reads the id from the `## L61` heading in canon.

Chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise;
that is the human's call at the post-review gate.
