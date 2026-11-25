# REGRESSION — core-371-floor-only

- base: `d7e2720391b01056ae34c2256c447c924bef0059` (working tree dirty → `base = HEAD`, the plan/grill commit)
- inside (7): `.claude/commands/pharn-grill.md`, `.dev/floor/command-hygiene.test.mjs`, `CHANGELOG.md`, `README.md`,
  `SKILLS_VERSION`, `pharn-install.json`, `.dev/features/core-371-floor-only/BUILD.md` — all declared in `## Files`
  (`check-regress.mjs scope` exit 0, `escape_exempt: []`)
- outside: 205 test files, `validate`, and the one committed eval pair
  (`expected-injection-comment.json` ↔ `.dev/features/trust-fence/findings.json`)
- style gates skipped at both sides: no shared style config is inside.
- captured by an argv-array node runner (no shell variables or `xargs`), the per-test reporter loaded from the working
  tree's absolute path on both sides.

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `tests` (per-test: base 6770 passed / 0 failed / 7 skipped; head 6776 / 0 / 1)             | 0    | 0    |
| `validate`                                                                                 | 0    | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |

regressions: none · pre_existing: none · per-test new_failures: none

REGRESSIONS: none — no deterministically-detectable breakage outside the feature (`check-regress.mjs verdict` exit 0,
`no-regressions`).

Residual: this catches what the outside suite catches, nothing more. The changed test file itself is inside the scope
and is exercised by `/pharn-dev-verify`'s whole-repo `npm test`.
