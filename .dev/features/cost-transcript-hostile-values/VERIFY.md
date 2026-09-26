# VERIFY — cost-transcript-hostile-values

**VERIFIED: floor gates PASS** (`pharn/floor/check-verify.mjs`, exit 0; `failing_gates: []`).

## Gates

| gate                                                                                       | exit | what it ran                                                              |
| ------------------------------------------------------------------------------------------ | ---- | ------------------------------------------------------------------------ |
| `test`                                                                                     | 0    | `npm test` — 3,651 tests, 3,651 passed, 0 failed                         |
| `validate`                                                                                 | 0    | `node pharn/floor/validate.mjs .` — GREEN                                |
| `lint`                                                                                     | 0    | `npm run lint`                                                           |
| `format:check`                                                                             | 0    | `npm run format:check`                                                   |
| `lint:md`                                                                                  | 0    | `npm run lint:md`                                                        |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | `check-structural.mjs` against `.dev/features/trust-fence/findings.json` |
| `reconcile`                                                                                | 0    | `check-bash-reconcile.mjs --base . --require-baseline` — `CLEAN`         |

**Reconcile, in detail.** The epoch is `2026-09-26T18:24:34.596Z`, anchored by `pharn-dev-build`. It reconciled 20
paths and found 0 escapes. The three exempted paths are this feature's pipeline artifacts (`BUILD.md`,
`REGRESSION.md`, `regression-report.json`). `CLEAN` means no escape was **detected** in the anchor→reconcile
window, not that none occurred (`pharn/pharn-contracts/reconciliation-record.md`).

The gate set is exactly `npm run check`'s four suite and style gates, plus `validate`, the one committed eval pair
and `reconcile`. This increment ships no eval pair of its own; its own correctness signal is its tests inside
`npm test`: `cost-hostile-input.test.mjs` (41) and `cost-value-core.test.mjs` (6).

## Verifiers (ADVISORY)

No verifiers registered — floor gates only (`node pharn/floor/count-verifiers.mjs .` →
`{"registered":0,"verifiers":[]}`).

_Verified = the named gates passed. This is NOT a guarantee of correctness beyond what those gates check. Verifier
concerns are advisory help, not assurance._
