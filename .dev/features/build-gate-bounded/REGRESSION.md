# REGRESSION — build-gate-bounded

- base: `f6174aee68b2a58f72baaa6898ffac7d04586185` — the `feat/gate-exclusion-config` tip this branch merged (GATE 1
  Q1). Passed as `--base`: `git merge-base HEAD origin/main` would put that branch's own changes inside this feature.
- head: `ce7568d` (the build commit; the working tree was clean apart from this stage's own artifacts)
- driver: `.pharn/pharn-dev-regress/run.mjs`, a node runner for Steps 1–3. The isolated worktree refuses the pinned
  `xargs`/`$VAR` shell forms, so the outside test list is passed to `node --test` as an argv array and never
  word-split (L5/L16). The verdict is `pharn/floor/check-regress.mjs verdict`'s, copied verbatim into
  `regression-report.json`.

## Partition (`check-regress.mjs scope --feature build-gate-bounded`, exit 0)

- inside: 21 paths. Every one is declared in the PLAN's `## Files`, so `escaped` is empty and `escape_exempt` is
  empty.
- outside tests: 127 `*.test.mjs` / `*.test.cjs` files, run in one `node --test` call on each side.
- outside eval pairs: 1 —
  `pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` ↔
  `.dev/features/trust-fence/findings.json`. Both paths were confirmed to resolve before the run.
- style gates: skipped on both sides. No shared style config (`eslint.config.mjs`, `.prettierrc.json`,
  `.prettierignore`, `.markdownlint-cli2.jsonc`) is inside.

## Gates (exit codes)

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `tests` (the 127 outside test files)                                                       | 0    | 0    |
| `validate`                                                                                 | 0    | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |

- head `tests`: 4,066 tests, 4,066 pass. base `tests`: 4,066 tests, 4,063 pass, 3 skipped (the three style probes skip
  in the base worktree, which has no `node_modules`).
- regressions: none
- pre_existing: none

## A first run whose head red did not reproduce (recorded, not dropped)

The first run of the same driver (same base, same tree) recorded head `tests` = **1** (base 0) and a
`regressions` verdict. Its test output was not captured (the first driver sent it to `/dev/null`). Investigated rather
than recorded:

- the same 127-file list re-run alone at head: 4,066 / 4,066 pass, exit 0;
- the driver re-run in full with each side's output kept (`.pharn/pharn-dev-regress/{base,head}-tests.log`): head
  4,066 / 4,066 pass, exit 0 — the verdict above.

So the first red is unattributed: a timing-sensitive test under load is the likely class, and nothing in this
increment's inside set is in the outside list. The driver now keeps each side's test output, so a red is never again
recorded blind. Stated rather than hidden: this verdict is the second of two runs.

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.**

_/pharn-dev-regress catches exactly what its suite catches, nothing more — but deterministically. This is not a
claim that nothing broke._
