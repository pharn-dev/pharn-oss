# REGRESSION — core-344-no-change-criteria (iteration 2)

Iteration 1 read `regressions`: the README badge and `pharn-install.json` were stale after the bump. Its records are
kept as `REGRESSION.iteration-1.md` and `regression-report.iteration-1.json`. The re-plan is in `PLAN.md`, "Re-plan
after regress STOP".

- base: `08d7f63e693a1cdb1e0269ee552357ce77408313` (the working tree was dirty, so base = HEAD = `origin/main`)
- inside (15): the 7 product files, `SKILLS_VERSION`, `CHANGELOG.md`, `README.md`, `pharn-install.json`, and this
  feature's `PLAN.md`, `GRILL.md` and the two iteration-1 records. The records are declared in `## Files`; `PLAN.md`
  and `GRILL.md` are `escape_exempt`. `escaped: []`
- outside gates: `tests` (204 test files, per-test records), `validate`, and the committed eval pair
  `structural:…/expected-injection-comment.json`. The style gates were skipped: no shared style config is inside.
- How the gates ran: the isolated worktree refuses the pinned `xargs` line, so a scratch node runner (`spawnSync`
  argv arrays) ran the same command. It passed the same files as one argv list, with the absolute per-test reporter
  and destination in the working tree; the base ran in a detached `git worktree`, which was removed afterwards.

| gate                    | base | head |
| ----------------------- | ---- | ---- |
| `tests`                 | 0    | 0    |
| `validate`              | 0    | 0    |
| `structural:…injection` | 0    | 0    |

Per-test (`tests`): base 7081 passed, 0 failed, 9 skipped; head 7089 passed, 0 failed, 1 skipped; `new_failures: []`.

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature** (verdict `no-regressions`).

Residual: this comparison catches what the outside suite catches, nothing more.
