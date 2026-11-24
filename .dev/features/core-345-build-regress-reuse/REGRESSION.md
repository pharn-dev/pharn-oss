# REGRESSION — core-345-build-regress-reuse

This is iteration 2's report: the run after the review fixes, with both sides fresh. It supersedes iteration 1's
(see the note at the end).

- base: `08d7f63e693a1cdb1e0269ee552357ce77408313` (working-tree build → `base = HEAD`)
- inside (14): the 7 declared `## Files` (`.dev/guides/floor-gates.md`, `CHANGELOG.md`, `README.md`, `SKILLS_VERSION`,
  `pharn-install.json`, `pharn/floor/gate-reuse-core.mjs`, `pharn/pharn-contracts/gate-run-record.md`) plus this
  feature's own stage artifacts (`PLAN.md`, `GRILL.md`, `REVIEW.md`, iteration 1's `REGRESSION.md`, `VERIFY.md` and
  the two reports), exempt by `--feature`
- outside: 204 test files, 1 eval pair (trust-fence); style gates skipped (no shared style config inside)
- `scope` exit 0 (no path outside the declared `## Files`)

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `tests` (204 outside files, per-test records)                                              | 0    | 0    |
| `validate`                                                                                 | 0    | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |

regressions: none · pre_existing: none · per_test.new_failures: none

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature** (`check-regress.mjs verdict`
exit 0, `no-regressions`). This certifies the comparison only: regress catches what its suite catches, nothing more.

Run note: both sides ran fresh in this iteration, through a scratch runner
(`pharn/.run/pharn-dev-regress/run.mjs`: spawnSync argv arrays, the pinned reporter by absolute path, a fresh base
worktree). Base tests took 862 s and HEAD tests 1,250 s.

**Iteration 1 is superseded.** Its regress also ended `no-regressions`, but its second pass kept the base-side per-test
record from a first pass that had crashed on a runner bug, rather than re-running the base suite. That reuse is
superseded here, and no part of this verdict rests on it. Iteration 1's captures are archived under
`pharn/.run/pharn-dev-regress/iter1/` (git-ignored).
