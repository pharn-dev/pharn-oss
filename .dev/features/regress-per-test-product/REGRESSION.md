# REGRESSION — regress-per-test-product

Base: `31f8b691c8005b22fd5786bc6e6cf4ed79b375b3` (the working tree was dirty, so `base = HEAD`, the branch point on
`origin/main` at 7.16.0). The BASE side ran in a detached temp worktree, removed afterwards.

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature** (`check-regress.mjs verdict`,
exit 0, with `--per-test tests`).

## Scope

- inside: 25 paths (the plan's `## Files` paths written by the build, plus this feature's `PLAN.md` and `GRILL.md`).
- `check-regress.mjs scope --feature regress-per-test-product`: exit 0, `escaped: []`; `escape_exempt` = this feature's
  `GRILL.md` and `PLAN.md`.
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

The base and head counts differ because the 7.16.0 outside tests and this branch's copies of the same files are not the
same code: several outside files test modules this feature changed, and the base checkout skips 8 tests the working
tree runs (it has no `node_modules`). Every one of them passed at head.

## Honest residual

`/pharn-dev-regress` catches exactly what its suite catches, nothing more: a regression no deterministic check covers is
invisible here. This verdict certifies the base→head comparison, never that the feature is correct.
