# REGRESSION — specified-markers-sweep

- base: `5e0c8e064118e900c0edb3106b1222291c247de6` (working-tree build ⇒ base = HEAD, origin/main 6.72.1)
- verdict source: `pharn/floor/check-regress.mjs verdict` (exit 0), copied verbatim to `regression-report.json`
- orchestration note: the pinned `xargs` / `$VAR` shell forms are refused in this isolated worktree, so the same argv
  (per-test reporter at an absolute path, one argument per test file, no shell) was spawned from a scratch node runner
  under `.pharn/specified-markers-sweep/`. The verdict's inputs are the same exit codes and per-test records.

## Partition

- inside (7): the four `## Files` source paths, `CHANGELOG.md`, and this feature's `PLAN.md` / `GRILL.md`
  (`escape_exempt`: `GRILL.md`, written under the grill stage's own scope). `scope` exit 0 — no path outside the
  declared writes.
- outside: 170 test files, `validate`, and one eval pair (trust-fence). Style gates skipped: no shared style config
  in `inside`.

## Gates (base → head exit codes)

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---: | ---: |
| `tests` (170 outside files, per test: 5821 passed / 0 failed → 5826 passed / 0 failed)     |    0 |    0 |
| `validate`                                                                                 |    0 |    0 |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` |    0 |    0 |

regressions: none · pre_existing: none · per-test `new_failures`: none.

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.** This certifies only the
comparison: `/pharn-dev-regress` catches exactly what its suite catches, nothing more.
