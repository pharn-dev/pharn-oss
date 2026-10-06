# VERIFY — claude-md-bootstrap

Gates run over the working tree with the feature present (2026-10-06):

| gate                                                                                       | exit |
| ------------------------------------------------------------------------------------------ | ---: |
| `test` (`npm test`: 4,877 tests, 0 failed)                                                 |    0 |
| `validate` (`node pharn/floor/validate.mjs .`)                                             |    0 |
| `lint` (`npm run lint`)                                                                    |    0 |
| `format:check` (`npm run format:check`)                                                    |    0 |
| `lint:md` (`npm run lint:md`)                                                              |    0 |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` |    0 |
| `reconcile` (`check-bash-reconcile.mjs --require-baseline`)                                |    0 |

`reconcile` reads `CLEAN`:

- epoch anchored by `pharn-dev-build` at 2026-10-06T07:31:43Z;
- 20 paths reconciled, no escapes;
- the two regress artifacts exempt as pipeline artifacts.

**VERIFIED: floor gates PASS** (`pharn/floor/check-verify.mjs`, exit 0, `failing_gates: []`).

Verifiers: no verifiers registered (`count-verifiers.mjs` → `{"registered":0}`), so the verdict comes from the floor
gates only.

Verified = the named gates passed. This is NOT a guarantee of correctness beyond what those gates check. In
particular, no gate checks whether a reader finds a guide before the action it governs. Verifier concerns are
advisory help, not assurance.
