# REGRESSION — regress-head-install-drift

- **Base:** `1b737cd32b5e34a40d6ee6ff9ee56b3b3363d832` — passed explicitly: the stack base this branch was cut on
  (`origin/feat/regress-pre-run-snapshot`, 6.37.0). The build was committed before regress (an isolated worktree is
  deleted on interruption), so the tree was clean and the merge-base with `origin/main` would have counted the
  6.37.0 branch's own changes as inside.
- **Inside (31 paths):** `git diff --name-only <base>` plus untracked — exactly the plan's `## Files` that exist (with
  the build amendment, `.dev/floor/command-hygiene.test.mjs`). `check-regress.mjs scope --feature
regress-head-install-drift` exited **0**: `escaped: []`, `escape_exempt: []`.
- **Outside gates:**
  - `tests` — the 124 tracked `*.test.mjs` / `*.test.cjs` files outside the changed set, as one `node --test`
    invocation with the files as an argument vector (a scratch node runner under `.pharn/pharn-dev-regress/`, because
    this worktree session refuses the pinned `xargs` form; the runner passes the same list the pinned form would);
  - `validate` — `node pharn/floor/validate.mjs .`;
  - the structural gate of the one committed eval pair:
    `pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` ↔
    `.dev/features/trust-fence/findings.json` (both checked readable first).
- **Style gates skipped:** no shared style config (`eslint.config.mjs`, `.prettierrc.json`, `.prettierignore`,
  `.markdownlint-cli2.jsonc`) is inside.
- **A first runner attempt was discarded, not recorded:** it read the scope output's eval pairs as `a::b` strings
  (they are `{expected, actual}` objects) and was stopped before any verdict; its base worktree was removed.

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
