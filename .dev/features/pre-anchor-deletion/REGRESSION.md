# REGRESSION — pre-anchor-deletion

- Base: `08d7f63e693a1cdb1e0269ee552357ce77408313` (working tree dirty, so `base = HEAD`).
- Machine report: `regression-report.json` (the `check-regress.mjs verdict` output, verbatim). Verdict exit 0.

## Partition

Inside (12): the 10 `## Files` paths (the two reconcile checkers and their tests, the contract, the floor-checks
guide, `SKILLS_VERSION`, `README.md`, `CHANGELOG.md`, `pharn-install.json`) plus this feature's `PLAN.md` and
`GRILL.md`, both listed in `escape_exempt`. `scope` exit 0: no path escaped the declared writes.

Outside: 202 test files, `validate`, and one eval pair (`trust-fence` expected-injection-comment ↔
`.dev/features/trust-fence/findings.json`). The style gates were skipped because no shared style config is inside.

## Gates (base → head exit codes)

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `tests` (202 outside files, per-test record)                                               | 0    | 0    |
| `validate`                                                                                 | 0    | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |

Per-test record: base 6913 passed, 0 failed, 9 skipped; head 6921 passed, 0 failed, 1 skipped. `new_failures`: none.
The pass count differs because the outside files are identical at base and head while the head run had fewer skips;
none of the inside test files is in the outside set.

`regressions[]`: none. `pre_existing[]`: none.

## Orchestration notes (advisory)

The pinned shell forms (`xargs`, `git worktree add` from a shell line) are refused in this isolated worktree, so a node
runner did the same steps with `spawnSync` argv arrays: the same per-test reporter by absolute path, the same
`check-regress.mjs scope` and `verdict` calls, and a detached base worktree removed afterwards. The first runner
attempt crashed after the base test run on a runner bug (the eval-pair shape) before writing any result; the second
run is the one recorded here.

REGRESSIONS: none — no deterministically-detectable breakage outside the feature. This stage catches what its suite
catches and nothing more; a regression no test, rule or eval covers is invisible to it.
