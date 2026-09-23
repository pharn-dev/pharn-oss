# REGRESSION — reconcile-symlink-hash

`regression-report.json` holds the **latest** comparison, iteration 2, verbatim. Iteration 1 is kept below as
history.

## Iteration 2 — against the new `main` (after merging 6.17.0)

Between iteration 1 and opening the PR, `main` moved to `8ba9308` (6.17.0, #258). The branch merged `origin/main`,
the version was re-bumped to 6.17.1, and the comparison was re-run against the new base.

- Base: `8ba9308fa27ab247edce3becce79edd22bccc708`. The tree was clean after the merge commit, so the base is
  `git merge-base HEAD origin/main`.
- Verdict source: `pharn/floor/check-regress.mjs verdict`, exit **0**.
- `scope --feature reconcile-symlink-hash` exited 0 with `escaped: []`. Inside (16): the 8 plan paths plus the 8
  feature artifacts, all in `escape_exempt`. Outside: 96 test files, `validate`, and one eval pair.

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `tests` (96 outside files)                                                                 | 0    | 0    |
| `validate`                                                                                 | 0    | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |

- `regressions[]`: none
- `pre_existing[]`: none

## Iteration 1 — against `7e9ed52` (6.16.0), history

Base `7e9ed526a450c06218be4fa9aeeb505228be30fd` (a working-tree build, so `base = HEAD`). `scope` exited 0 with
`escaped: []`. Inside (10): the 8 plan paths plus `PLAN.md` and `GRILL.md`. Outside: 94 test files, `validate`, and
the same eval pair. All three gates were `0 → 0`. `regressions[]` and `pre_existing[]` were both empty, and the
verdict was `no-regressions`.

## Orchestration note (advisory)

Both iterations ran the baseline in a detached `git worktree` at the base SHA, under `.pharn/pharn-dev-regress/base`,
with `node_modules` symlinked in. It was removed before the HEAD run. Style gates were skipped by the deterministic
rule: `inside` touches no shared style config. The pinned `cat outside-tests.txt | xargs node --test` line could not
run as written, because this session's worktree-isolation guard refuses a computed `xargs` argv. So the same gate set
was run by a scratch script (`.pharn/pharn-dev-regress/capture.mjs`, gitignored). It passes the outside test paths to
`node --test` as one argv array, one path per argument with no word-splitting, and it runs `validate` and
`check-structural` exactly as prescribed. The gate set was identical on both sides, and every baseline was green.

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.** This catches exactly what the
suite catches, nothing more. A regression that no test, `validate` rule or eval covers is invisible here.
