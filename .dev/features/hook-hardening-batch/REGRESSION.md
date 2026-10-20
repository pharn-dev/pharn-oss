# REGRESSION — hook-hardening-batch

- base: `ce83d30cb819b8a4a13518e2e0caae546a954acc` (`git merge-base HEAD origin/main`, passed as `--base`). The working
  tree held only this stage's BUILD.md record, and comparing against `HEAD` would have measured that file alone, so the
  feature's fork point was used.
- head: `74638672` plus the uncommitted records (BUILD.md, PLAN.md). That commit carries the five files the maintainer
  applied.
- epoch: the fresh build anchor taken after `74638672` (REVIEW A1).

## Scope (`check-regress.mjs scope`, `--feature hook-hardening-batch`)

- inside: 20 paths (`regression-report.json` lists them). escaped: none. escape_exempt: none.
- **The first run reported 3 escapes:** the three hook files. They were written by the maintainer's `apply.py` run, and
  PLAN.md named them only in prose, not as `## Files` bullets.
  - After the apply, PLAN.md now lists all five maintainer-applied files as bullets, with a dated note on why.
  - Re-run: exit 0, no escape.
  - This is the plan edit the stage warns about: it widens `## Files` after the fact. Read it as data: every path it
    adds was committed in `74638672`, before the anchor, and no write tool can reach any of them.
- outside: 165 test files and one eval pair (`expected-injection-comment.json` ↔ `.dev/features/trust-fence/findings.json`).
  No style gate ran: the inside set touches no shared style config.

## Gates (exit codes)

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---: | ---: |
| `tests` (165 outside test files)                                                           |    0 |    0 |
| `validate`                                                                                 |    0 |    0 |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` |    0 |    0 |

- regressions: none
- pre_existing: none

**REGRESSIONS: none — no deterministically-detectable regression outside the feature** (`check-regress.mjs verdict`,
exit 0, `"verdict": "no-regressions"`). That covers what these gates check, and nothing more. The test commands
themselves were run by a node runner under `.pharn/hhb-tools/` (scratch). It ran the base side in a disposable
`git worktree` at the base, then removed that worktree.
