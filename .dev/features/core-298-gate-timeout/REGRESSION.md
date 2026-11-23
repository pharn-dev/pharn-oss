# REGRESSION — core-298-gate-timeout

- Base: `ed2032e0df6f20d27d3ac1639f39fdbe1dfac106` (the grill commit, the last commit before the build; passed as an
  explicit base, the build being committed at `97d0b5f4`).
- Inside (21 paths, all declared in `PLAN.md` `## Files`; `scope` exit 0, `escaped: []`): the three CLIs and their
  tests, `stage-exit-core.mjs` and its test, the two core headers, the two contracts, the three commands,
  `docs/pipeline.md`, `.dev/guides/floor-gates.md`, `CHANGELOG.md`, `README.md`, `SKILLS_VERSION`,
  `pharn-install.json`.
- Outside gates: `tests` (200 outside test files, per-test record), `validate`, one structural eval pair
  (`trust-fence`). Style gates skipped: no shared style config is inside.

## Gates (run 2, the standing verdict)

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `tests`                                                                                    | 0    | 0    |
| `validate`                                                                                 | 0    | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |

Per-test: base 6829 passed / 0 failed / 9 skipped; head 6830 passed / 0 failed / 8 skipped; `new_failures: []`.

regressions: none · pre_existing: none

## Run 1 (recorded verbatim, superseded by run 2)

Run 1 (head side 00:20–00:33, machine load rising to ~150 from other sessions) read `regressions`: `tests` base 0 →
head 1, one new failure:

```text
pharn/floor/entry-gates.test.mjs::CLI cache (AC3): a green clears the slot; a timed-out, a style-only or a peeked red is never recorded
```

That file is outside this change and the test exercises a timeout path. Run in isolation it passed 3 of 3 at load ~121.
Per `/pharn-dev-ship`'s STOP rule (an environmental red is re-run once the environment is fixed; both results
recorded), the whole stage was re-run with both sides started only at load < 40 and no other `node --test` running
(base at load 25, head at load 9): `no-regressions`, as above. The run-1 maps are kept under
`pharn/.run/pharn-dev-regress/run1/`.

## Deviations (advisory orchestration)

- The pinned `cat outside-tests.txt | xargs node --test …` was run as one argv array from a small node runner
  (`regress-side.mjs` in the session scratchpad): this isolated worktree refuses `xargs` / `$VAR` shell forms. Same
  reporter, same absolute destination, same file list (`scope.json` `outside_tests`), `NODE_TEST_CONTEXT` removed.
- Step 0 also ran `reconcile-baseline.mjs --amend-scope` after the setter (not prescribed by this command; it adds this
  stage's scope to the open epoch and changes no verdict).

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.** This certifies only the
comparison: it catches what the outside suite catches, nothing more.
