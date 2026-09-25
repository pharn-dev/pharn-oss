# REGRESSION — review-leftovers-0924

- **Base:** `cf9089763b5b68d820858117b7f79faecc32cb23` (`HEAD`: this is a working-tree build, so
  `git status --porcelain` was non-empty and Step 1 resolves the base to `HEAD`).
- **Inside (18 paths):** `git diff --name-only HEAD` plus untracked files. That is the 15 product/meta files of the
  increment and this feature's `PLAN.md`, `GRILL.md` and `BUILD.md`.
- **Scope check:** `check-regress.mjs scope … --feature review-leftovers-0924` exited **0**. `escaped: []`,
  `escape_exempt: []`: every changed path is in the plan's `## Files`.
- **Outside gates:** 101 test files (`outside_tests`), `validate`, and the one committed eval pair
  `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json`. The style gates were
  **skipped on both sides** (the deterministic rule): no shared style config (`eslint.config.mjs`, `.prettierrc.json`,
  `.prettierignore`, `.markdownlint-cli2.jsonc`) is inside.

## Per-gate exit codes

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `tests` (101 outside files, via the pinned `cat outside-tests.txt \| xargs node --test`)   | 0    | 0    |
| `validate`                                                                                 | 0    | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |

- `regressions[]`: none. `pre_existing[]`: none.
- Counts, for the reader, not the verdict: base 3001 tests, 2999 pass, 2 skipped; head 3001 tests, 3001 pass, 0
  skipped. The two base skips are tests that skip themselves without `node_modules`. The base ran in a fresh
  `git worktree add --detach` checkout with no `npm ci`, as the command prescribes for the stdlib-only core gates. The
  checkout was removed afterwards.

## Verdict (FLOOR — `check-regress.mjs verdict`, exit 0)

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.**

This certifies the comparison only. `/pharn-dev-regress` catches exactly what its suite catches, nothing more; a
breakage no test, rule or eval covers is invisible here. `regression-report.json` is the helper's verdict JSON,
verbatim (`cmp` identical).

## Iteration 2 (after the GATE-2 fix pass)

Same base (`cf90897`), so the baseline capture stands. `scope` exit **0**: `escaped: []`, the same 101 outside test
files. Inside grew to 23, because this feature's own later artifacts (`REGRESSION.md`, `VERIFY.md`, `REVIEW.md` and
the two reports) now sit in the diff. HEAD: `tests` 0 (3001/3001), `validate` 0, the eval pair 0.
`check-regress.mjs verdict` exit **0**, `"no-regressions"`, written verbatim (`cmp` identical).

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.** This certifies the comparison,
nothing more.
