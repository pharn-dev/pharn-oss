# REGRESSION — regress-pre-run-snapshot

- **Base:** `beffa29432f2d409967b96e90f4215a4084e99cd` — HEAD, a working-tree dogfood build (`git status --porcelain`
  non-empty).
- **Inside (25 paths):** the changed set — the plan's `## Files` (with the build amendment adding
  `.dev/floor/command-hygiene.test.mjs`) plus this feature's own `PLAN.md`, which `check-regress.mjs scope` reported in
  `escape_exempt`. `scope` exited **0** with `escaped: []`.
- **Outside gates:**
  - `tests` — the 125 tracked `*.test.mjs` / `*.test.cjs` files outside the changed set, run as one `node --test`
    invocation with the files as an argument vector (a scratch node runner under `.pharn/pharn-dev-regress/`, because
    this worktree session refuses the pinned `xargs` form; the runner passes the same file list the pinned form would);
  - `validate` — `node pharn/floor/validate.mjs .`;
  - the structural gate of the one committed eval pair: `pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json`
    ↔ `.dev/features/trust-fence/findings.json` (both paths checked readable first).
- **Style gates skipped:** no shared style config (`eslint.config.mjs`, `.prettierrc.json`, `.prettierignore`,
  `.markdownlint-cli2.jsonc`) is inside.
- **A first runner attempt was discarded, not recorded as a verdict:** it read the plan's `## Files` from the
  committed `PLAN.md`, which lacked the build amendment, so `scope` reported `.dev/floor/command-hygiene.test.mjs`
  as escaped. The working-tree `PLAN.md` (the one the build was scoped from) declares it; the re-run read that one.

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
