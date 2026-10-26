# REGRESSION — loop-interactive-cli-prep

- **Base:** `e4b1704899f5284608b98caefb7a7f79dff4a383` (`HEAD`; the working tree held untracked files, so the
  auto-detect rule picks `HEAD`).
- **Inside (changed scope):** `.dev/features/loop-interactive-cli-prep/GRILL.md`, `PLAN.md` (both exempt as this
  feature's stage artifacts), `.dev/measurements/loop-interactive-cli-2026-10-26.md` (declared in `## Files`).
- **Outside gates:** 174 test files (`node --test` through the per-test reporter), `validate`, and the one committed
  eval pair (`structural:expected-injection-comment`). No style gate: nothing inside touches a shared style config.

## A first scope run that stopped, and what was done (the human's decision)

The first `check-regress.mjs scope` run exited **1**: it listed `.claude/skills/pharn-ci-cover`,
`.claude/skills/pharn-ci-explain`, `.claude/skills/pharn-ci-install` and `skills-lock.json` as escapes. All four were
untracked before this session began (the session-start `git status`; file times 2026-10-20 11:24); this run never
wrote them. The check compares changed-since-base with `## Files`, so it cannot tell pre-existing untracked files from
build writes (L17's shape). Asked at that stop, the human chose "move aside, re-run": the four paths were moved to the
session scratchpad, `scope` was re-run (exit **0**, `escaped: []`), and they were moved back at once, with the same
`skills-lock.json` sha256 (`ae2ac441…`) and the same three link targets. The gates below ran after the restore.

## Gates (exit codes)

| gate                                    | base | head |
| --------------------------------------- | ---- | ---- |
| `tests` (174 files)                     | 0    | 0    |
| `validate`                              | 0    | 0    |
| `structural:expected-injection-comment` | 0    | 0    |

Per-test records: base 6,087 passed, 0 failed, 6 skipped; head 6,092 passed, 0 failed, 1 skipped; `new_failures: []`.
The skip counts differ between the base checkout (a fresh worktree) and the working tree; no test failed on either
side.

- `regressions[]`: none · `pre_existing[]`: none

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.** This certifies only the
comparison: it catches what these gates catch, nothing more.

**A process slip, stated.** `regression-report.json` was first written with a Bash `cp` of the verdict, which the
write hooks never judge. It was rewritten through the Write tool under this stage's scope, with identical bytes (`cmp`).
