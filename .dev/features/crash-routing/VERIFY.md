# VERIFY — crash-routing

**VERIFIED: floor gates PASS.** `pharn/floor/check-verify.mjs .pharn/pharn-dev-verify/results.json --feature
crash-routing` exit 0, `verdict: "PASS"`, `failing_gates: []` (`verify-report.json`, the helper's fields verbatim).

## Gates

| gate                    | exit |
| ----------------------- | ---- |
| `test` (`npm test`)     | 0    |
| `validate`              | 0    |
| `lint`                  | 0    |
| `format:check`          | 0    |
| `lint:md`               | 0    |
| `structural:<expected>` | 0    |
| `reconcile`             | 0    |

- `test`: 3,307 tests, 3,307 passing — the hermetic suite with this increment's new and changed tests in it.
- `structural:<expected>`: the one committed eval pair,
  `pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` ↔
  `.dev/features/trust-fence/findings.json`. This increment ships no eval pair of its own; its feature-specific
  signal is its own `*.test.mjs`, collected by `npm test`.
- `reconcile`: `check-bash-reconcile.mjs --base . --require-baseline` → `CLEAN`, `escapes: []`. The epoch was anchored
  at the build (after its setter) and amended twice (the re-set build scope after the grill, and the regress scope).
  The build's Bash writes (`cp` into `loop-fresh-core.mjs`, the heredoc appends to four test files, the in-scope
  `sed`/node edits, the formatter pass) all landed on declared paths.

## Iteration 2 (after the review fixes) — the standing verdict

Re-run over the fixed tree with the same gate set: every gate exit 0 — `test` 3,308 / 3,308 (the review-fix tests
included), `validate`, `lint`, `format:check`, `lint:md`, `structural:<expected>`, and `reconcile` `CLEAN`,
`escapes: []` (the epoch now carries a third amendment: the build scope re-set for the fixes). `check-verify.mjs` →
**`PASS`**, `failing_gates: []`, exit 0 — the same helper fields as iteration 1, so `verify-report.json` is unchanged.

## Verifiers (advisory layer)

`node pharn/floor/count-verifiers.mjs .` → `{"registered":0,"verifiers":[]}` — no verifiers registered, floor gates
only.

_verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance._
