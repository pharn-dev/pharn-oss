# REGRESSION — build-regress-spec-unread

- **Base:** `031c5638107d9b3bae791f882b649830ffb4fe28` (the working-tree dogfood build, so base = HEAD).
- **Inside (7 paths):** `.claude/commands/pharn-build.md`, `.claude/commands/pharn-regress.md`, `CHANGELOG.md`,
  `README.md`, `SKILLS_VERSION`, plus this feature's `PLAN.md` and `GRILL.md`. The last two are listed in
  `escape_exempt`, and `escaped` is empty.
- **Outside:** 91 test files, 1 eval pair (`expected-injection-comment.json` ↔
  `.dev/features/trust-fence/findings.json`, path confirmed readable before its exit code was recorded),
  and `validate`.
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
