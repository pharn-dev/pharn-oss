# REGRESSION — changelog-sectioning

This is iteration 2. Iteration 1 ran after the first build and also returned `no-regressions`. The review
then found false prose in the generated files, and the fix loop regenerated them, so the comparison was run
again. The base, the outside set and the gate set are the same in both iterations. The base capture is
iteration 1's, reused because base SHA and gate set are unchanged. The HEAD capture is new.

- **Base:** `e8b6da2a845a9d965dd88ec668142a01a1855d6a`. This is the working-tree dogfood build, so base =
  HEAD. It is also the SHA the migration is pinned to.
- **Inside (13 paths):**
  - the seven declared files: `sectionize-core.mjs`, `sectionize.mjs`, their two `*.test.mjs`,
    `overrides.json`, the generated `MIGRATION.md`, and the generated `CHANGELOG.md`;
  - this feature's stage artifacts: `PLAN.md`, `GRILL.md`, `REGRESSION.md`, `regression-report.json`,
    `VERIFY.md` and `verify-report.json`, each listed in `escape_exempt`.

  `escaped` is empty.

- **Outside:**
  - 91 tracked test files. The two new test files are inside and untracked, so they are not counted. Among
    the 91 is `.dev/floor/check-skills-version-recorded.test.mjs`, whose live-repo test reads the new
    `CHANGELOG.md`.
  - 1 eval pair. Its path was confirmed readable before its exit code was recorded.
  - `validate`.
- **Style gates skipped:** `inside` touches no shared style config.

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `tests`                                                                                    | 0    | 0    |
| `validate`                                                                                 | 0    | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |

`regressions[]`: none. `pre_existing[]`: none.

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature** (`check-regress.mjs`
exit 0).

This catches what the suite catches, nothing more. In particular, it does not check whether any entry is
filed under the right version. That is the migration's own concern, reported in `MIGRATION.md` and
`VERIFY.md`.
