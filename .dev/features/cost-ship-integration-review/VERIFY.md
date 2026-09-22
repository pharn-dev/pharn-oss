# VERIFY — cost-ship-integration-review

| gate                                                                                       | exit |
| ------------------------------------------------------------------------------------------ | ---- |
| `test`                                                                                     | 0    |
| `validate`                                                                                 | 0    |
| `lint`                                                                                     | 0    |
| `format:check`                                                                             | 0    |
| `lint:md`                                                                                  | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    |
| `reconcile`                                                                                | 0    |

**VERIFIED: floor gates PASS.** `reconcile` is `CLEAN`: 2 paths were reconciled, and the only
exemptions are this feature's pipeline artifacts. No verifiers are registered.

The committed `integration-probe.mjs` exits 1 **by design**. It reproduces review finding F1. It is not
a `*.test.mjs`, so it is not one of these gates.

Verified means that the named gates passed. It is NOT a guarantee beyond what those gates check.
