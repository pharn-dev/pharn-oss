# REGRESSION — dev-verdict-discipline

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.**

## Round 2 — after the GATE 2 "fix" decision (the report in `regression-report.json`)

- Base: `91075f5738ffc1aafce29cbca857b3b1c025caed` (HEAD, the committed round-2 plan; the working tree held the
  uncommitted round-2 build, so `base = HEAD`).
- Inside (9 paths, `check-regress.mjs scope`, `escaped: []`, `escape_exempt: []`): `pharn/floor/run-gates.mjs` and
  its test, `pharn/floor/check-verify.mjs` and its test, `pharn-dev-plan.md`, `pharn-dev-verify.md`,
  `command-hygiene.test.mjs`, `dev-verify-stamp.test.mjs`, `CHANGELOG.md`.
- Outside gates: 177 outside test files through the per-test reporter, `validate`, the one committed eval pair. Style
  gates skipped on both sides: no shared style config is inside.

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---: | ---: |
| `tests`                                                                                    |    0 |    0 |
| `validate`                                                                                 |    0 |    0 |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` |    0 |    0 |

`regressions: []`, `pre_existing: []`. Per-test: base 5,780 passed, 0 failed, 4 skipped; head 5,783 passed, 0 failed,
1 skipped; `new_failures: []`.

## Round 1 — the first build (superseded)

Base `0f06ebcabe54c667dea6f707d77a39554af3b394`, 14 inside paths, the same three outside gates: `tests` 1 → 0 (one load
failure at base in `pharn/floor/entry-gates.test.mjs`, an untouched file), `validate` 0 → 0, the eval pair 0 → 0;
`no-regressions`, `new_failures: []`.

_Catches what the suite catches, nothing more: a regression no deterministic check covers is invisible here._
