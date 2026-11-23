# REGRESSION — core-299-reap-start-time

- Base: `9a29df8a710f39dbc8f52acdd9b1a4882bf172a7`, passed as an explicit base. The branch merged `origin/main`
  (302f26f8) and then #464's fix branch (`origin/fix/prettier-3.10.1-format`, 9a29df8a), as the orchestrator
  instructed. 9a29df8a contains `origin/main`, so it is this branch's fork point for everything except this feature.
  Using the auto-detected merge-base (302f26f8) would have counted #464's two reformatted `.dev` files as this build's
  escapes.
- HEAD: the merge commit `a6dbd874` on `fix/core-299-reap-start-time`.
- The partition comes from `check-regress.mjs scope --feature core-299-reap-start-time`, exit 0:
  - `escaped: []`
  - `escape_exempt`: this feature's `PLAN.md` and `GRILL.md`
  - 9 inside paths, 203 outside test files, and 1 outside eval pair
- Advisory orchestration: the harness refuses the pinned `xargs` / `$VAR` forms in this isolated worktree, so a node
  runner at `pharn/.run/pharn-dev-regress/run.mjs` ran the same steps. Those steps are the declared paths via
  `plan-files-core.mjs`, `scope`, then a detached base worktree and HEAD, each running `node --test <outside tests>`
  through `.dev/floor/node-test-results-reporter.mjs` (absolute path, `--test-reporter-destination` per side),
  `validate.mjs .` and `check-structural.mjs` over the trust-fence pair. Only exit codes were recorded. The style gates
  were skipped because no shared style config is inside the change.
- Load rule: both sides ran after load fell below 40 with no other `node --test` running. Load was 11.96 at the start
  of the run and 17.20 at the end.

## Gates (base → head exit codes)

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `tests` (203 outside files, per-test)                                                      | 0    | 0    |
| `validate`                                                                                 | 0    | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |

Per-test counts:

- Base: 7053 passed, 0 failed, 9 skipped.
- HEAD: 7061 passed, 0 failed, 1 skipped.
- `new_failures: []`, `still_failing: 0`.

`regressions: []` · `pre_existing: []`

## Verdict (`check-regress.mjs verdict`, exit 0)

REGRESSIONS: none — no deterministically-detectable breakage outside the feature.

`regress` catches what its suite catches and nothing more. A broken behaviour with no test, rule or eval is invisible
to it. The outside tests include `run-gates.test.mjs`, whose end-to-end SIGKILL-recovery cases go through the new
start-time check on a real `onSpawn` record and still stop the orphaned gate.
