# REGRESSION — gate-exclusion-config

- base: `ea0234b4f57fd9d525b99a2de769a411c542264f` (`git merge-base HEAD origin/main`; the build was committed as
  `9eb4a21`, so the working tree was clean)
- head: `9eb4a21` (the working tree)
- driver: `.pharn/pharn-dev-regress/run.mjs`, a node runner for Steps 1–3. The isolated worktree refuses the pinned
  `xargs`/`$VAR` shell forms, so the outside test list is passed to `node --test` as an argv array and never
  word-split (L5/L16). The verdict is `pharn/floor/check-regress.mjs verdict`'s, copied verbatim into
  `regression-report.json`.

## Partition (`check-regress.mjs scope --feature gate-exclusion-config`, exit 0)

- inside: 42 paths. Every one is declared in the PLAN's `## Files`, so `escaped` is empty and `escape_exempt` is
  empty.
- outside tests: 120 `*.test.mjs` / `*.test.cjs` files, run in one `node --test` call on each side.
- outside eval pairs: 1 —
  `pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` ↔
  `.dev/features/trust-fence/findings.json`. Both paths were confirmed to resolve before the run.
- style gates: skipped on both sides. No shared style config (`eslint.config.mjs`, `.prettierrc.json`,
  `.prettierignore`, `.markdownlint-cli2.jsonc`) is inside.

## Gates (exit codes)

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `tests` (the 120 outside test files)                                                       | 0    | 0    |
| `validate`                                                                                 | 0    | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |

- regressions: none
- pre_existing: none

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.**

_/pharn-dev-regress catches exactly what its suite catches, nothing more — but deterministically. This is not a
claim that nothing broke._
