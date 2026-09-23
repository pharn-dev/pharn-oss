# VERIFY — markdownlint-no-globs

## Floor gates (exit codes, at HEAD with the feature in the working tree)

| gate                                                                                       | exit |
| ------------------------------------------------------------------------------------------ | ---- |
| `test` (`npm test`: 2891 tests, 2891 pass, 0 fail, **0 skipped**)                          | 0    |
| `validate` (`FLOOR: GREEN`)                                                                | 0    |
| `lint`                                                                                     | 0    |
| `format:check`                                                                             | 0    |
| `lint:md`                                                                                  | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    |
| `reconcile` (`check-bash-reconcile.mjs --require-baseline`: `CLEAN`, 16 reconciled)        | 0    |

`0 skipped` matters here. The new premise test and the catalog style test both skip when the dev
toolchain is absent, and a skip also exits 0 (L37). In this run both EXECUTED. The `reconcile` epoch was
anchored by `/pharn-dev-build`. Its `exempted[]` holds this feature's `REGRESSION.md` and
`regression-report.json` (pipeline artifacts), and `escapes[]` is empty.

## Verdict (deterministic — `pharn/floor/check-verify.mjs`, exit 0)

**VERIFIED: floor gates PASS.**

## Verifiers (advisory)

No verifiers registered — floor gates only (`count-verifiers.mjs`: `{"registered":0}`).

Verified means the named gates passed. It is NOT a guarantee of correctness beyond what those gates
check. Verifier concerns would be advisory help, not assurance, and none exist today.
