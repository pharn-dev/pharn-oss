# REGRESSION — entry-gates-ledger-row

- **Base:** `6aa4f59492a7ad4108abd91e65e426b768081afc` (HEAD; a working-tree build, so `base = HEAD` by Step 1's state
  test).
- **Inside (20 paths):** the plan's declared files plus this feature's GRILL.md, PLAN.md and measurement report.
  `scope` exit 0, `escaped: []`, `escape_exempt: [.dev/features/entry-gates-ledger-row/GRILL.md]`.
- **Outside:** 142 test files, 1 eval pair (`expected-injection-comment.json` ↔ `.dev/features/trust-fence/findings.json`).
- **Style gates skipped:** the inside set touches no shared style config (`eslint.config.mjs`, `.prettierrc.json`,
  `.prettierignore`, `.markdownlint-cli2.jsonc`).

| Gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `tests` (142 outside test files, `cat outside-tests.txt \| xargs node --test`)             | 0    | 0    |
| `validate` (`node pharn/floor/validate.mjs .`)                                             | 0    | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |

- `regressions[]`: none · `pre_existing[]`: none

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.** This certifies only the
comparison: the outside gates read the same at base and HEAD. It catches what the suite catches and nothing more, and
it says nothing about the feature's own correctness (that is `/pharn-dev-verify` and `/pharn-dev-review`).
