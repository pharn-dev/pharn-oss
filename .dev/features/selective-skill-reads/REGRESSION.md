# REGRESSION — selective-skill-reads

Re-run after the GATE-2 fix round (review A1, A2, A3, A5, A7). It replaces the first run, whose verdict was also
`no-regressions`.

- base: `c441b0965825f9e2e2f8d5e2ef543cc4991ed56a` (`HEAD`; the working tree held the uncommitted build, so the
  base rule picked `HEAD`)
- inside: 74 changed paths. That is the 68 declared `## Files` (the fixtures now at `<case>/skills/...`) plus this
  feature's `PLAN.md`, `GRILL.md`, `REVIEW.md`, `REGRESSION.md`, `VERIFY.md`, `regression-report.json` and
  `verify-report.json`, which `check-regress.mjs scope --feature` lists in `escape_exempt`. `escaped: []`.
- outside gates: 142 outside test files, `validate`, and the trust-fence eval pair. Style gates were skipped on both
  sides because no shared style config is inside (`eslint.config.mjs`, `.prettierrc.json`, `.prettierignore` and
  `.markdownlint-cli2.jsonc` are untouched).

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---: | ---: |
| `tests` (142 outside files, `cat outside-tests.txt \| xargs node --test`)                  |    0 |    0 |
| `validate`                                                                                 |    0 |    0 |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` |    0 |    0 |

- regressions: `[]`
- pre_existing: `[]`

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.** The verdict comes from
`check-regress.mjs verdict` (`no-regressions`, exit 0) and is copied verbatim into `regression-report.json`
(same SHA-256 as the helper's output).

Residual: this stage catches exactly what its suite catches. A behaviour that no test, rule or eval covers is
invisible to it, so this verdict does not mean "nothing broke".

Orchestration note (advisory): the base side ran in a fresh detached worktree at the base SHA. Both sides ran as
background Bash calls, and each result map was read from disk after its call exited 0. Nothing was re-run.
