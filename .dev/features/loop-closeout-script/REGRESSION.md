# REGRESSION — loop-closeout-script

**Verdict: `no-regressions`** (`pharn/floor/check-regress.mjs verdict`, exit 0 — a deterministic exit-code
comparison, no LLM judgment).

- **Base:** `43c09ba39c83a0fa228009446012cc11728a97c9` (`git merge-base HEAD origin/main`; the branch has merged
  `origin/main` at that commit, so the fork point is main's tip).
- **Inside (24 paths):** the 24 paths in `regression-report.json` `.inside` — this increment's own files.
- **Scope:** `check-regress.mjs scope --feature loop-closeout-script` exit 0, `escaped: []`; `escape_exempt` lists
  this feature's own `BUILD.md` and `GRILL.md`.

| outside gate                                                                               | base | head |
| ------------------------------------------------------------------------------------------ | ---: | ---: |
| `tests` (127 test files outside the feature, `node --test`)                                |    0 |    0 |
| `validate` (`pharn/floor/validate.mjs .`)                                                  |    0 |    0 |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` |    0 |    0 |

**Style gates skipped** (the deterministic skip rule): `inside` touches no shared style config (`eslint.config.mjs`,
`.prettierrc.json`, `.prettierignore`, `.markdownlint-cli2.jsonc`). The whole-repo `npm run check` (format, lint,
markdownlint, docs, markers, badge, CHANGELOG, contributing, reconcile, 4,739 tests) exited 0 at HEAD before this stage.

**Bounds (P0):** the verdict covers what a deterministic outside gate checks, nothing more. The outside test list was
expanded by a node runner as an argument vector (`.pharn/pharn-dev-regress/gates.mjs`), because the prescribed `xargs`
form is refused in this isolated worktree; both sides ran the identical gate set. `validate` is whole-repo (a named
granularity limit).
