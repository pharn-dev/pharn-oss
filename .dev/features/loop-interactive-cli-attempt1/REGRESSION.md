# REGRESSION — loop-interactive-cli-attempt1

- **Base:** `e4b1704899f5284608b98caefb7a7f79dff4a383` (`HEAD`; the working tree held changes, so the auto-detect
  rule picks `HEAD`).
- **Inside (changed scope):** `.dev/features/loop-interactive-cli-attempt1/GRILL.md`, `PLAN.md` (both exempt as this
  feature's stage artifacts), `.dev/measurements/loop-interactive-cli-2026-10-26.md` and `CHANGELOG.md` (both declared
  in `## Files`).
- **Outside gates:** 174 test files (`node --test` through the per-test reporter), `validate`, and the one committed
  eval pair (`structural:expected-injection-comment`). No style gate: nothing inside touches a shared style config.

## A first scope run that stopped, and what was done (the human's decision)

The first `check-regress.mjs scope` run exited **1** with 12 escapes, none written by this build:

- `.claude/skills/pharn-ci-cover`, `pharn-ci-explain`, `pharn-ci-install` and `skills-lock.json`, untracked since
  2026-10-20 (the same four the prep increment's regress met);
- the eight artifacts in `.dev/features/loop-interactive-cli-prep/`, written by the previous `/pharn-dev-ship` chain in
  this session and still uncommitted.

The check compares changed-since-base with `## Files`, so it cannot tell pre-existing untracked files from build writes
(L17's shape). Asked at that stop, the human chose "move aside, re-run". The 12 paths went to the session scratchpad,
`scope` was re-run (exit **0**, `escaped: []`), and they were moved back at once. A sha256 list of the regular files
plus the three link targets, taken before and after, compared equal (12 entries). The gates below ran after the
restore.

## Gates (exit codes)

| gate                                    | base | head |
| --------------------------------------- | ---- | ---- |
| `tests` (174 files)                     | 0    | 0    |
| `validate`                              | 0    | 0    |
| `structural:expected-injection-comment` | 0    | 0    |

Per-test records: base 6,087 passed, 0 failed, 6 skipped; head 6,092 passed, 0 failed, 1 skipped; `new_failures: []`.
The skip counts differ between the base checkout (a fresh worktree) and the working tree, as in the prep increment's
run; no test failed on either side. The base side took about 14 minutes and the head side about 9 on this machine.

- `regressions[]`: none · `pre_existing[]`: none

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.** This certifies only the
comparison: it catches what these gates catch, nothing more.
