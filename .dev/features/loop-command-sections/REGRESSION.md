# REGRESSION — loop-command-sections (CORE-109)

- Base: `259f27ddbb706d124626305ff36334e4abf9ef44` (auto-detected: the tree was clean, so the base is
  `git merge-base HEAD origin/main`, the 7.18.0 tip this branch was cut from).
- Head: the working tree at `9c8878dd` (the build commit).
- Run through a node runner that executes `/pharn-dev-regress` Steps 1–3's pinned argv without shell word-splitting
  (the isolated worktree refuses the pinned `xargs` form). The per-test reporter is the working tree's
  `.dev/floor/node-test-results-reporter.mjs`, by absolute path, on both sides. The base side ran in a detached
  `git worktree` of the base SHA, removed afterwards. A first attempt crashed in the runner itself (it read an eval
  pair as a string), after the base suite, before any verdict; it was fixed and the whole run repeated from Step 1.

## Partition

- inside (8 paths changed since the base): this feature's PLAN, GRILL and BUILD records, and the plan's declared files.
  `scope` exited 0 (no escape); `escape_exempt`: this feature's `PLAN.md` and `GRILL.md`.
- outside: 195 test files, `validate`, and the one committed eval pair
  (`pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json`). Style gates skipped: no shared
  style config is inside.

## Gates (base → head exit codes)

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `tests` (195 outside files, per test)                                                      | 0    | 0    |
| `validate`                                                                                 | 0    | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |

Per test (`tests`): base 6542 passed / 0 failed / 7 skipped; head 6543 passed / 0 failed / 6 skipped; 0 suite errors on
either side; new failures at head: none; still failing: 0.

regressions: none · pre_existing: none

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.** This certifies the comparison
only: it catches what the outside suite, `validate` and the eval pair catch, nothing more (P0). The feature's own test
file, `.dev/floor/command-hygiene.test.mjs`, is inside and is judged at `/pharn-dev-verify`.
