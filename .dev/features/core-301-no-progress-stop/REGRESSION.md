# REGRESSION — core-301-no-progress-stop

- base: `302f26f8800a61554f9a0a8e9e42d2472f1a62dc` (merge-base with `origin/main`, after merging `origin/main` into the
  branch; the tree was clean, so the auto-detect rule gives the merge-base)
- inside (19 paths): the plan's 19 `## Files` minus the two budget tests left unchanged, plus this feature's `PLAN.md`
  and `GRILL.md` (exempt by `--feature`). `check-regress.mjs scope` exit 0: no escape.
- outside: 202 test files, `validate`, and the one committed eval pair
  (`expected-injection-comment.json` ↔ `.dev/features/trust-fence/findings.json`). No shared style config is inside,
  so the style gates are skipped on both sides.

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---: | ---: |
| `tests` (per-test: base 6963 passed / 0 failed / 9 skipped; head 6971 / 0 / 1)             |    0 |    0 |
| `validate`                                                                                 |    0 |    0 |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` |    0 |    0 |

regressions: none · pre_existing: none · per-test new failures: none

**REGRESSIONS: none — no deterministically-detectable regression outside the feature** (`check-regress.mjs verdict`
exit 0, `no-regressions`). This covers the gates named above, never behaviour no test exercises.

## How it was run (advisory orchestration)

The pinned shell forms (`xargs`, `$VAR` capture) are refused in this isolated worktree, so the same commands ran
from a node runner, `pharn/.run/pharn-dev-regress/run.mjs` (gitignored scratch): the pinned declared-paths line,
`check-regress.mjs scope`, `git worktree add --detach` at the base, the per-test reporter over the outside test
files passed as argv, `validate`, `check-structural.mjs` on the pair, and `check-regress.mjs verdict` with
`--per-test tests`. A first run against the pre-merge base `476882bc` crashed in the runner itself (the scope
JSON's eval pairs are objects, not `A::B` strings) after its base side, and produced no verdict; it was fixed and
re-run from the start against the post-merge base.

`origin/fix/prettier-3.10.1-format` (#464) is merged after this run. It reformats two `.dev/` files and touches no
test, so this comparison does not include it; `/pharn-dev-verify` runs over the tree that includes it.
