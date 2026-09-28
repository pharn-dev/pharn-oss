# REGRESSION — regress-base-reuse

- **Iteration:** 3. It re-runs after the GATE-2 review fixes. Iteration 1 over the build and iteration 3 over the
  fixed tree both read `no-regressions`. Iteration 2, after the lint fix, was stopped once its regress half finished
  (`no-regressions`), because the review fixes changed the tree.
- **Base:** `a2b5f6be027a69c0abd69f373cfb7ba0660b536d`. This is HEAD: a working-tree dogfood build, so
  `git status --porcelain` was non-empty.
- **Inside (27 paths):** the changed set. That is the plan's `## Files` set plus this feature's own pipeline
  artifacts (`PLAN.md`, `GRILL.md`, `REGRESSION.md`, `regression-report.json`), which are escape-exempt and reported
  in `escape_exempt`. `check-regress.mjs scope` exited **0** with `escaped: []`.
- **Outside gates:**
  - `tests` — the 120 tracked `*.test.mjs` / `*.test.cjs` files outside the changed set, run through the pinned
    `cat outside-tests.txt | xargs node --test` form;
  - `validate` — `node pharn/floor/validate.mjs .`;
  - the structural gate of the one committed eval pair: `pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json`
    ↔ `.dev/features/trust-fence/findings.json` (both paths were checked readable first).
- **Style gates skipped:** no shared style config (`eslint.config.mjs`, `.prettierrc.json`, `.prettierignore`,
  `.markdownlint-cli2.jsonc`) is inside.

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---: | ---: |
| `tests`                                                                                    |    0 |    0 |
| `validate`                                                                                 |    0 |    0 |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` |    0 |    0 |

`regressions: []` · `pre_existing: []`

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature** (`check-regress.mjs verdict`,
exit 0). The machine report is `regression-report.json`, the helper's JSON verbatim.

_This catches what the outside suite catches, nothing more. It certifies only the base→head comparison of these
gates, never that the increment is correct. The changed files' own tests are `/pharn-dev-verify`'s job._
