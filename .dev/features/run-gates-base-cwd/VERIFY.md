# VERIFY — run-gates-base-cwd

| gate                                                                                       | exit |
| ------------------------------------------------------------------------------------------ | ---- |
| `test`                                                                                     | 0    |
| `validate`                                                                                 | 0    |
| `lint`                                                                                     | 0    |
| `format:check`                                                                             | 0    |
| `lint:md`                                                                                  | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    |
| `reconcile`                                                                                | 0    |

**VERIFIED: floor gates PASS** (`check-verify.mjs` exit 0). `npm test` ran 2511 tests, all passing, none
skipped. `reconcile` is `CLEAN`: 7 paths were reconciled and there are 0 escapes.

**Iteration 2** (after the GATE-2 header fix): all seven gates re-ran, every one exited 0 again, 2511/2511
tests passed, and `reconcile` is `CLEAN` with 0 escapes. The verdict JSON is byte-identical to
iteration 1, so `verify-report.json` is unchanged.

## Verifiers (advisory)

No verifiers are registered, so only the floor gates ran.

---

Verified means the named gates passed. This is NOT a guarantee of correctness beyond what those gates
check. Verifier concerns are advisory help, not assurance.
