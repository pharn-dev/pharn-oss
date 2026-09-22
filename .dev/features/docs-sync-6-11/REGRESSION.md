# REGRESSION — docs-sync-6-11

- **Base:** `0bf10f4b3286c8701e8c151087f8ec4150b693e5` (the working-tree dogfood build, so base = HEAD).
- **Inside (7 paths):** the five declared files (`README.md`, `CLAUDE.md`, `SECURITY.md`, `CHANGELOG.md`,
  `loop-stop-guard/settings-patch/APPLY.md`), plus this feature's `PLAN.md` and `GRILL.md`. The last two
  are listed in `escape_exempt`, and `escaped` is empty.
- **Outside:** 91 test files, 1 eval pair (path confirmed readable before its exit code was recorded), and
  `validate`.
- **Style gates skipped:** `inside` touches no shared style config.

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `tests`                                                                                    | 0    | 0    |
| `validate`                                                                                 | 0    | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |

`regressions[]`: none. `pre_existing[]`: none.

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature** (`check-regress.mjs`
exit 0).

This catches what the suite catches, nothing more. For a prose-only change that means nothing at all
about whether the prose is true.
