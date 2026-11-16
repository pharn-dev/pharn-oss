# REGRESSION — regress-per-test-product

Base: `0da70efa55b62d3285659aeff4fe5a019a22fae2` (`origin/main` after PR #446, merged into this branch). This is the
second run, over the final tree after the review fix round. The base is passed explicitly: with the build committed, the
dirty-tree rule (`base = HEAD`) would have compared the build with itself. The BASE side ran in a detached temp
worktree, removed afterwards. The first run, against `31f8b691` before the merge and the fix round, was also
`no-regressions` with the same counts (it is superseded by this one).

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature** (`check-regress.mjs verdict`,
exit 0, with `--per-test tests`).

## Scope

- inside: 27 paths. They are the plan's `## Files` paths the build wrote, plus this feature's `PLAN.md`, `GRILL.md`,
  `REGRESSION.md` and `regression-report.json`.
- `check-regress.mjs scope --feature regress-per-test-product`: exit 0, `escaped: []`; `escape_exempt` = those four
  pipeline artifacts.
- outside tests: 189 of the 196 tracked `*.test.mjs` / `*.test.cjs` files (the 7 changed test files are inside).
- outside eval pairs: 1 (`pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` ↔
  `.dev/features/trust-fence/findings.json`).
- style gates: skipped (no shared style config is inside).

## Gates (base exit → head exit)

| gate                                                                                       | base | head | class |
| ------------------------------------------------------------------------------------------ | ---- | ---- | ----- |
| `tests` (189 outside files, through the per-test reporter)                                 | 0    | 0    | ok    |
| `validate`                                                                                 | 0    | 0    | ok    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    | ok    |

- `regressions`: none.
- `pre_existing`: none.

## Per test (`tests`)

- base: 6488 passed, 0 failed, 8 skipped, 0 suite errors.
- head: 6495 passed, 0 failed, 1 skipped, 0 suite errors.
- new failures at head: none; still failing: 0.

The base and head counts differ because the outside test files at the base and on this branch are not the same code:
several of them test modules this feature changed. Also, the base checkout skips 8 tests that the working tree runs,
because it has no `node_modules`. Every one of those tests passed at head.

## Honest residual

`/pharn-dev-regress` catches exactly what its suite catches, nothing more: a regression no deterministic check covers is
invisible here. This verdict certifies the base→head comparison, never that the feature is correct.
