# REGRESSION — cost-transcript-hostile-values

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.**

This certifies one comparison and nothing more. Every gate outside the feature that passed at the base commit still
passes at HEAD. A regression that no test, rule or eval covers is invisible to it.

## Base and scope

- **Base:** `b9b6a03ad8390c5d42901fae7988c44ca58344ee` (`main`, 6.24.1). The working tree was dirty (a dogfood build),
  so the base is HEAD, by the command's Step 1 rule.
- **Inside (changed):** 23 paths, `git diff --name-only <base>` plus untracked files. They are listed in
  `regression-report.json`.
- **Declared:** the plan's `## Files`, 21 paths.
- **Escaped:** none (`check-regress.mjs scope`, exit 0).
- **Escape-exempt:** `PLAN.md` and `GRILL.md`, this feature's own pipeline artifacts, each written under its own
  stage's scope.

## Gates (outside the feature)

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `tests` — `node --test` over the 106 test files outside the changed scope                  | 0    | 0    |
| `validate` — `node pharn/floor/validate.mjs .`                                             | 0    | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |

- `regressions[]`: none. `pre_existing[]`: none. Verdict `no-regressions`, from `pharn/floor/check-regress.mjs verdict`
  (exit 0).
- **The style gates were skipped, deterministically.** The changed scope touches none of the shared style configs
  (`eslint.config.mjs`, `.prettierrc.json`, `.prettierignore`, `.markdownlint-cli2.jsonc`), so a style result over the
  unchanged outside files cannot flip.
- **Test counts, for the record (not an input to the verdict):**
  - base: 3,407 tests, 3,404 passed, 0 failed, 3 not run;
  - head: 3,407 tests, 3,407 passed.

  The base ran in a detached worktree without `node_modules`, and the three not-run tests skip themselves there. The
  gate's exit code was 0 on both sides.

## How it was run (orchestration, advisory)

- The base side ran in a fresh `git worktree add --detach` at the base commit, removed afterwards; HEAD ran in the
  working tree. The gate set was decided once, from `scope`, and was identical on both sides.
- The outside test list went to `node --test` as an argv array from a node runner, not through the pinned `xargs`
  line, because this isolated worktree refuses that shell form. The command's two failure modes (zsh not
  word-splitting a variable, and GNU-only `xargs -a`) cannot occur with an argv array. The eval pair's two paths were
  confirmed readable before either side ran.

_Residual (P0):_ this stage catches what the suite catches, deterministically, and nothing more. "No regressions"
never means "nothing broke".
