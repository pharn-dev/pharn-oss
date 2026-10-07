# VERIFY — reconcile-trusted-docs

| Gate                                                                                       | Exit |
| ------------------------------------------------------------------------------------------ | ---- |
| `test` (`npm test`, the whole hermetic suite, this feature's tests included)               | 0    |
| `validate`                                                                                 | 0    |
| `lint`                                                                                     | 0    |
| `format:check`                                                                             | 0    |
| `lint:md`                                                                                  | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    |
| `reconcile` (`check-bash-reconcile.mjs --require-baseline`, run last)                      | 0    |

**VERIFIED: floor gates PASS** (`check-verify.mjs` exit 0, `failing_gates: []`).

`reconcile` read `CLEAN`. Ten paths were reconciled, all of them authorized by the build's opening scope snapshot.
Two of this feature's pipeline artifacts were exempted, `merged: []`, and there were no warnings. This run used
the new checker: the always-reconciled surface now includes the trusted docs and canon, and none of them changed.

**Re-run after the GATE-2 R2 fix:** the HEAD comparison now uses `-z` and `--no-renames`. Every gate exited 0
again, the verdict is PASS with the same gate map, and `reconcile` read `CLEAN`.

Verifiers: no verifiers registered — floor gates only.

Verified means the named gates passed. It is not a guarantee of correctness beyond what those gates check;
verifier concerns are advisory help, not assurance.

The gates ran through the scratch node runner under `.pharn/c1/`, with the command's gate set and `reconcile` last.
