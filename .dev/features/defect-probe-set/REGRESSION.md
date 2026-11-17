# REGRESSION — defect-probe-set

This is the second run. The first (base `ff937bd7`, same partition) also read `no-regressions`, with one test red on
both sides under a host load average of 250–400. Review then found an unquoted model name in the kit's command line;
the fix (`.dev/floor/defect-probe-kit.mjs` and its test, both in `## Files`) went in, and this stage was re-run on the
fixed tree.

- Base: `ff937bd734c2056e4b068d4dc0395b4a578fec3f` (HEAD; the build is an uncommitted working tree, so `base = HEAD`).
- Inside (38 paths): the plan's 34 `## Files` paths plus this feature's own four stage artifacts, which `scope
--feature` lists in `escape_exempt` (`REGRESSION.md`, `regression-report.json`, `VERIFY.md`, `verify-report.json`).
  `scope` exit 0: nothing escaped the declared writes.
- Outside: every other tracked test file, `validate`, the one committed eval pair, and the three style gates, because
  `inside` touches `.prettierignore`, `.markdownlint-cli2.jsonc` and `eslint.config.mjs`.

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `tests` (per test: base 6,913 passed / 0 failed / 1 skipped; head 6,906 / 0 / 8)           | 0    | 0    |
| `validate`                                                                                 | 0    | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |
| `format:check`                                                                             | 0    | 0    |
| `lint:md`                                                                                  | 0    | 0    |
| `lint`                                                                                     | 0    | 0    |

- `regressions[]`: none. `pre_existing[]`: none. `per_test.new_failures`: none.
- Head skipped 7 more tests than base. These are the seven style-probe tests (`capability-catalog-core`,
  `command-hygiene` ×2, `render-regression`, `render-review` ×2, `render-verify`), which skip when the checkout has no
  `node_modules` of its own. This worktree resolves its devDependencies from the main checkout's `node_modules`, in a
  parent directory. The base worktree got a `node_modules` symlink to that directory so its style gates could run, so
  those seven tests ran there. The cause is the environment, not this change, and it is stated here.
- Orchestration deviation (advisory): Steps 1–3 ran through a scratch node runner under `pharn/.run/pharn-dev-regress/`
  with `spawnSync` argv arrays, because this isolated worktree refuses the pinned `xargs` / `git worktree` shell forms.
  The runner ran the same gates, the same reporter and the same `check-regress.mjs scope` / `verdict` lines. The base
  side used a symlinked `node_modules` instead of `npm ci`; the lockfile is unchanged by this increment.

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.** This certifies only the
comparison: it catches what the suite catches outside the feature, nothing more.
