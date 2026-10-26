# REGRESSION — loop-background-cli

- **Base:** `e9ba9806a5554a3a853ac0b9a47fa07de7f7019e` (`HEAD`; the working tree held changes, so the auto-detect rule
  picks `HEAD`).
- **Inside (changed scope):** the eight `## Files` paths the build wrote (`.claude/commands/pharn-loop.md`,
  `.dev/measurements/loop-interactive-cli-2026-10-26.md`, `CHANGELOG.md`, `README.md`, `SKILLS_VERSION`,
  `docs/limitations.md`, `docs/pipeline.md`, `pharn/floor/stage-agent-core.mjs`), `TRUSTED-DOC-PROPOSALS.md` (declared),
  and this feature's `PLAN.md` and `GRILL.md` (exempt as its stage artifacts).
- **Outside gates:** 174 test files (`node --test` through the per-test reporter), `validate`, and the one committed
  eval pair (`structural:expected-injection-comment`). No style gate: nothing inside touches a shared style config.
- **Scope amendment:** this stage ran `reconcile-baseline.mjs --amend-scope` after its setter (exit 0), which the
  regress command does not name; it adds only this stage's artifact to the epoch's scope.

## A first scope run that stopped, and what was done (the human's decision)

The first `check-regress.mjs scope` run exited **1** with 4 escapes, none written by this build:
`.claude/skills/pharn-ci-cover`, `pharn-ci-explain`, `pharn-ci-install` (symlinks into `../../.agents/skills/`) and
`skills-lock.json`, untracked since 2026-10-20 — the same four this branch's previous regress met (L17's shape).
Asked at that stop, the human chose "Move aside, re-run". The four went to the session scratchpad, `scope` was re-run
(exit **0**, `escaped: []`), and they were moved back at once; the link targets and the file's sha256, taken before
and after, compared equal. The gates below ran after the restore.

**A trusted-doc edit inside the window, undone before any gate read it.** At about 12:51 UTC the human applied the
proposed `pharn/LIMITS.md` / `pharn/THREAT-MODEL.md` patch (`TRUSTED-DOC-PROPOSALS.md`), which L68 says to apply only
after verify. It was reverted with `git apply -R` at 12:54 UTC; `git diff --quiet` on both files was then clean. The
base side ran in its own checkout of `e9ba9806` from 12:46, and the head side started at 13:07:56, so neither read the
edited files.

## Gates (exit codes)

| gate                                    | base | head |
| --------------------------------------- | ---- | ---- |
| `tests` (174 files)                     | 0    | 0    |
| `validate`                              | 0    | 0    |
| `structural:expected-injection-comment` | 0    | 0    |

Per-test records: base 6,087 passed, 0 failed, 6 skipped; head 6,092 passed, 0 failed, 1 skipped; `new_failures: []`.
The skip counts differ between the base checkout (a fresh worktree) and the working tree, as in this branch's previous
run; no test failed on either side. The base side took 21.4 min and the head side 11.8 min on this machine.

- `regressions[]`: none · `pre_existing[]`: none

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.** This certifies only the
comparison: it catches what these gates catch, nothing more.
