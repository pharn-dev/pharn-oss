# REGRESSION — run-gates-dangling-link-containment

- **Base:** `daaa999de2c18370a6178a52f98db0e99e21a1fe` (the working-tree dogfood build, so base = HEAD).
- **Inside (7 paths):** the five declared files (`pharn/floor/run-gates.mjs`, `pharn/floor/run-gates.test.mjs`,
  `CHANGELOG.md`, `SKILLS_VERSION`, `README.md`), plus this feature's `PLAN.md` and `GRILL.md`. The last two
  are listed in `escape_exempt`, and `escaped` is empty.
- **Outside:** 90 test files (`run-gates.test.mjs` is inside), 1 eval pair (path confirmed readable before
  its exit code was recorded), and `validate`.
- **Style gates skipped:** `inside` touches no shared style config.

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `tests`                                                                                    | 0    | 0    |
| `validate`                                                                                 | 0    | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |

`regressions[]`: none. `pre_existing[]`: none.

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature** (`check-regress.mjs`
exit 0).

This catches what the suite catches, nothing more.
