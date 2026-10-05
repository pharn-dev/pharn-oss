# SHIP — instruction-growth-gate

Gated `/pharn-dev-ship` run in the worktree `.claude/worktrees/instruction-growth-gate` (branch
`worktree-instruction-growth-gate`). The base is `d40667d` (6.35.2). After merging `origin/main` at `e4fb326`, this
increment is numbered **6.38.0**.

## Stages, in order, and where the run ended

1. `/pharn-dev-plan`: [PLAN.md](PLAN.md). **GATE 1:** the human approved it as written, with decisions D1 (C, the
   checker applies BASE_RULE), D2–D4 (as planned) and D5 (include the documented extras).
2. `/pharn-dev-grill`: [GRILL.md](GRILL.md). The independent griller raised 15 advisory concerns, and two test files
   were added to `## Files` after GATE 1.
3. `/pharn-dev-build`: [BUILD.md](BUILD.md).
4. `/pharn-dev-regress`: [REGRESSION.md](REGRESSION.md).
5. `/pharn-dev-verify`: [VERIFY.md](VERIFY.md).
6. `/pharn-dev-review`: [REVIEW.md](REVIEW.md). An independent reviewer found 4 important and 2 minor findings, each
   reproduced.
7. **GATE 2 (the human): "Fix, then merge main".** All six findings were fixed. Each fix has a test and a mutation
   control, and each test turns red with its fix undone. Then `origin/main` (#307 6.36.0, #308 6.37.0) was merged and
   this increment renumbered to 6.38.0.

## Structural verdicts, verbatim

| stage                  | verdict read                         | value                                     |
| ---------------------- | ------------------------------------ | ----------------------------------------- |
| grill                  | `check-plan-lessons.mjs` exit        | `0`                                       |
| build                  | `validate.mjs` exit                  | `0` (`FLOOR: GREEN — 36 capabilities`)    |
| regress                | `regression-report.json` `.verdict`  | `"no-regressions"`                        |
| verify                 | `verify-report.json` `.verdict`      | `"PASS"`                                  |
| full check, pre-merge  | `npm run check` exit                 | `0` (4549/4549 tests)                     |
| full check, post-merge | `npm run check` exit                 | `1` at `check:reconcile` only — see below |
| changelog-entry        | `npm run check:changelog-entry` exit | `0` (post-merge, base `e4fb326`)          |

**The regress and verify verdicts were read on the tree BEFORE the GATE-2 fixes and the merge.** The evidence for the
post-fix tree is:

- the two instruction-files suites (50/50);
- the 6 fix mutation controls;
- the full post-merge `npm run check`. Every gate before `check:reconcile` is green.
- `npm test`, run separately because the chain stops at `check:reconcile`. Its first post-merge run failed four of #307's
  tests, which pinned verify gate sets written before the injected gate existed. Their pins were updated (test-only),
  and the re-run passed: **4649/4649, exit 0**.

**`check:reconcile` RED after the merge is the known local artifact.** All 58 reported paths are files #307/#308 changed
on `main` (set difference against `git diff d40667d origin/main`: 0 others). The build's epoch cannot attribute
`git merge`'s writes. CI has no baseline and reads `NO_BASELINE`. The baseline was neither edited nor deleted.

## Records

- changelog-entry: exit 0
- lesson: promoted L67
- deferred: none

## Delegation and deviations (ADVISORY)

- **Shell forms.** This session is worktree-isolated. The pinned shell forms of regress/verify were refused, so those
  stages ran the same gate sets through scratch node runners with argv arrays; REGRESSION.md and VERIFY.md say so.
- **Discovery update after the merge.** #307 adds a fourteenth `pharn.config.json` reader in `pharn/floor/`,
  `gate-exclusion-core.mjs`. It is closed over its own `gates` key only, so the new top-level `budget` key is
  unaffected, and its exclude list accepts only ALLOWLIST ids, so `instruction-growth` cannot be excluded.
- **Human-only text.** The proposed `LIMITS.md §3e` text is in PLAN.md. A human applies it; the write guard keeps
  LIMITS.md human-only.
- **PENDING:** `--report` in pharn-starter before and after its cleanup, both recorded.

chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate.
