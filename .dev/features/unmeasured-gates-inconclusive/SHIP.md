# SHIP — unmeasured-gates-inconclusive

Gated `/pharn-dev-ship` (no `--loop`), 2026-10-13, branch `fix/unmeasured-gates-inconclusive`. The increment fixes the
2026-10-12 review's LOOP-1: a gate the runner did not measure no longer reads as a failing (or passing) gate.

## Where the run ended

**GATE 2**, reached after every stage. Then: fix the three minor review findings, re-verify, and open a PR.

## The two human gates — delegated

Both gates were **delegated: decided by the orchestrating model under the maintainer's 2026-10-13 delegation**. Neither
is a human approval.

- **GATE 1** — plan approved with the recommended answer (a) to Q1–Q6 (`PLAN.md`, `## Resolved questions (GATE 1)`).
  It added one requirement: a test must pin the SIGTERM-trapping exit-0 gate as `INCONCLUSIVE`, and the CHANGELOG
  must say so.
- **GATE 2** — **fix** review findings 1–3, then PR. Findings 4 and 5 are accepted as stated bounds and are named in
  the PR body. After the fix, `/pharn-dev-verify` is re-run; if it passes, there is no second review.

## Stages and their structural verdicts (verbatim)

| Stage                | Verdict read                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------------- |
| `/pharn-dev-plan`    | `check-plan-lessons.mjs` exit 0 (`applied_lessons` 10 ids)                                        |
| `/pharn-dev-grill`   | `check-plan-lessons.mjs` exit 0; 5 advisory concerns, all taken into `PLAN.md` before the build   |
| `/pharn-dev-build`   | `node pharn/floor/validate.mjs .` exit 0 (`FLOOR: GREEN — 37 capabilities`)                       |
| `/pharn-dev-regress` | `regression-report.json` `.verdict` = `no-regressions`                                            |
| `/pharn-dev-verify`  | `verify-report.json` `.verdict` = `PASS` (iteration 1, merged tree; iteration 2, after the fixes) |
| `/pharn-dev-review`  | no structural verdict (advisory) — see `REVIEW.md`: 0 floor-gate, 5 advisory (all minor)          |

- Pointers: `GRILL.md` (advisory), `REGRESSION.md`, `VERIFY.md`, `REVIEW.md` — cited, not restated.
- `changelog-entry: exit 0`.
- `lesson: skipped` — the candidate (in `REVIEW.md`: "a projection that drops a QUALIFYING field…") was **declined for
  promotion in this batch** by the orchestrating model under the delegation. Parallel PRs would collide on the next
  L-number, and the candidate is close to L29/L31. The draft stays in `REVIEW.md` for the maintainer.
- `deferred: none`.

## Orchestrator decisions and deviations (ADVISORY)

- **Regress was not re-run after the GATE-2 fixes** (orchestrator decision). The fixes are one test-timeout value
  (`check-verify.test.mjs`, 1000 → 3000 ms) and two comment paragraphs (`check-verify.mjs`), plus one test-header
  comment. None of them can flip a gate outside the feature. Verify re-ran the whole suite on the fixed tree.
- **`origin/main` moved mid-run** to `791d205` (6.58.1, #344) after the build commit. It was merged as `1f7fe64`.
  CHANGELOG.md's `[6.58.1]` section is byte-for-byte main's, and this PR's diff against `origin/main` only adds lines.
  Regress compared against `8fe73d1`; verify ran on the merged tree, where reconcile classified #344's three paths
  `merged`.
- **Verify iteration 2's first `lint:md` failed on this run's own scratch file** (`.pharn/…/pr-body.md`, MD032), an
  L61 recurrence. The file was fixed, `lint:md` was re-run alone, and the map was re-assembled. `VERIFY.md` records it.
- **Pinned shell forms are refused in an isolated worktree.** Build Step 2b, regress Steps 1–3 and verify Step 1 ran
  from node runners under `.pharn/` (argv arrays, exit codes only). The regress base checkout was a
  `git clone --shared`, not `git worktree add`.

_chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate._
