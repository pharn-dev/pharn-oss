# REGRESSION — s14-gates-exclude-remedy

- base: `27d6f27526c059055122d8a1129930cf133b0602` (working-tree dogfood build → `base = HEAD`)
- inside (7): `.claude/commands/pharn-loop.md`, `.dev/features/s14-gates-exclude-remedy/GRILL.md`,
  `.dev/features/s14-gates-exclude-remedy/PLAN.md`, `CHANGELOG.md`, `README.md`, `SKILLS_VERSION`,
  `pharn/floor/entry-gates.test.mjs`
- escaped: none · escape_exempt: this feature's `PLAN.md`, `GRILL.md`
- outside: 182 test files, `validate`, one committed eval pair
- style gates: skipped — no shared style config is inside

## Gates (exit codes, base → head)

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `tests`                                                                                    | 0    | 0    |
| `validate`                                                                                 | 0    | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |

Per test: base 6417 passed / 0 failed / 9 skipped; head 6425 passed / 0 failed / 1 skipped; `new_failures`: none.

regressions: none · pre_existing: none

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.**

This catches what the suite catches, nothing more: a regression no deterministic check covers is invisible here.
