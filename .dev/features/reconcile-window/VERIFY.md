# VERIFY — reconcile-window

Gates run once at HEAD (`1b12a681` plus the regress artifacts), each recorded by exit code (runner:
`/pharn-dev-verify` Step 1's gate set, exit codes only).

| gate                                                                                       | exit |
| ------------------------------------------------------------------------------------------ | ---- |
| `test` (`npm test`: 6219 tests, 6218 pass, 0 fail, 1 skipped)                              | 0    |
| `validate` (`node pharn/floor/validate.mjs .`)                                             | 0    |
| `lint`                                                                                     | 0    |
| `format:check`                                                                             | 0    |
| `lint:md`                                                                                  | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    |
| `reconcile` (`check-bash-reconcile.mjs --require-baseline`)                                | 0    |

Reconcile: `CLEAN`, epoch `2026-11-03T12:58:20.713Z` (anchored by `pharn-dev-build`), 16 reconciled, 0 escapes, 0
merged, 0 warnings. Exempted as pipeline artifacts: `REGRESSION.md`, `regression-report.json`.

**VERIFIED: floor gates PASS** (`check-verify.mjs` exit 0, `"verdict": "PASS"`, `failing_gates: []`).

Verifiers: no verifiers registered — floor gates only (`count-verifiers.mjs`: `{"registered":0,"verifiers":[]}`).

Verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance.
