# REGRESSION — swallowed-exception-expected-fix

Re-run after the GATE 2 fix round (A1–A3). It replaces the first run's report, made at `ea09d57`, which was also
`no-regressions` over the same three gates.

- Base: `5bc02bb7e21df3b7bf341a2be2206e4f10ff5923` (`git merge-base HEAD origin/main`; the working tree was clean, so
  the base is the fork point, not `HEAD`). HEAD: `2d91080` (the fix-round commit).
- Verdict helper: `node pharn/floor/check-regress.mjs verdict` → exit 0. The machine report is
  `regression-report.json` (the helper's stdout, verbatim; sha256 `4d99e7f4…92bb3fc30`).

## Inside / outside partition (`check-regress.mjs scope`, exit 0)

Inside (13 paths, `git diff --name-only <base>`; no untracked files):

- Seven feature artifacts under `.dev/features/swallowed-exception-expected-fix/` (`GRILL.md`, `PLAN.md`,
  `REGRESSION.md`, `REVIEW.md`, `VERIFY.md`, `regression-report.json`, `verify-report.json`), all in `escape_exempt`
  as this feature's own stage artifacts.
- `.dev/floor/eval-expected-satisfiable.test.mjs`
- `CHANGELOG.md`, `README.md`, `SKILLS_VERSION`
- `pharn/pharn-review/swallowed-exception/evals/expected/expected-intentional-comment.json` and `.md`

Declared (`## Files`, read with `pharn/floor/plan-files-core.mjs`): the six non-exempt paths above. `escaped`: none.

Outside gates (the same set at base and HEAD):

- `tests`: one `node --test` over the 161 outside test files (162 tracked `*.test.mjs` / `*.test.cjs`, minus the new
  test, which is inside).
- `validate`: `node pharn/floor/validate.mjs .`.
- `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` ↔
  `.dev/features/trust-fence/findings.json`, both confirmed readable before the run.
- Style gates skipped: no shared style config (`eslint.config.mjs`, `.prettierrc.json`, `.prettierignore`,
  `.markdownlint-cli2.jsonc`) is inside.

## Per-gate exit codes

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `tests`                                                                                    | 0    | 0    |
| `validate`                                                                                 | 0    | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |

`regressions[]`: none. `pre_existing[]`: none. The outside suite ran 5,542 tests on both sides, 0 failed (6 skipped at
the base, which has no `node_modules`; 1 at HEAD).

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.** This certifies only the
comparison: `/pharn-dev-regress` catches what its suite catches, nothing more.

## Orchestration notes (advisory)

- The isolated-worktree shell guard refuses the pinned `$(…)`, `$VAR` and `xargs` forms and any `git` call inside
  `node -e`. The lists were captured with plain `git ls-files` / `git diff --name-only` redirects into
  `.pharn/pharn-dev-regress/`, and the scope, the gate runs and the verdict were run by node with `spawnSync` argv
  arrays (`.pharn/pharn-dev-regress/run-gates.mjs`, one `node --test` over the whole outside list, equivalent to the
  pinned `cat outside-tests.txt | xargs node --test`). The base checkout was a detached `git worktree` at the base SHA
  in the session scratchpad, removed after its run.
