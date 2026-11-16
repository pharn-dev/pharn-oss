# REGRESSION — head-test-single-run (CORE-89)

- Base: `907da87d47e62e1236d80adf338f05e78b535816` (explicit `--base`: the CORE-77 tip this branch was cut from; the
  build is committed, so the base is not HEAD).
- Head: the working tree at `3b7cac55` when the run started. The review fix round (`232af72b`) landed while the HEAD
  side ran; it touched only inside paths (comments, a CHANGELOG sentence, tests, one rendered line), none of the 189
  outside test files and no capability `validate` scans.
- Run through a node runner that executes `/pharn-dev-regress` Steps 1–3's pinned argv without shell word-splitting
  (the isolated worktree refuses the pinned `xargs` form); the per-test reporter is the working tree's
  `.dev/floor/node-test-results-reporter.mjs`, by absolute path, on both sides.

## Partition

- inside (28 paths changed since the base): this feature's PLAN/GRILL, `pharn/LIMITS.md` (the human-applied §9 bullet),
  and the plan's declared files. `scope` reported no escape.
- outside: 189 test files, `validate`, and the one committed eval pair
  (`pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json`). Style gates skipped: no shared style
  config is inside.

## Gates (base → head exit codes)

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `tests` (189 outside files, per test)                                                      | 0    | 0    |
| `validate`                                                                                 | 0    | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |

Per test (`tests`): base 6462 passed / 0 failed / 7 skipped; head 6468 passed / 0 failed / 1 skipped; 0 suite errors on
either side; new failures at head: none; still failing: 0.

regressions: none · pre_existing: none

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.** This certifies the comparison
only: it catches what the outside suite, `validate` and the eval pair catch, nothing more (P0).
