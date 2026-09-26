# VERIFY — cost-transcript-hostile-values

**VERIFIED: floor gates PASS** (`pharn/floor/check-verify.mjs`, exit 0; `failing_gates: []`).

This is the third run. It covers the final tree: the GATE 2 fix pass, the merge of `main` (6.26.0), and the second fix
iteration for the re-review's F1–F5. The first run, on `b9b6a03`, and the second, before F1–F5, were also PASS, and
this one supersedes both. `verify-report.json` already held this verdict: the gate set and every exit code are the
same. The counts below are this run's. The reconcile gate judged the same epoch as the second run and again found 11
paths and 0 escapes.

## Gates

| gate                                                                                       | exit | what it ran                                                              |
| ------------------------------------------------------------------------------------------ | ---- | ------------------------------------------------------------------------ |
| `test`                                                                                     | 0    | `npm test` — 3,831 tests, 3,831 passed, 0 failed                         |
| `validate`                                                                                 | 0    | `node pharn/floor/validate.mjs .` — GREEN                                |
| `lint`                                                                                     | 0    | `npm run lint`                                                           |
| `format:check`                                                                             | 0    | `npm run format:check`                                                   |
| `lint:md`                                                                                  | 0    | `npm run lint:md`                                                        |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | `check-structural.mjs` against `.dev/features/trust-fence/findings.json` |
| `reconcile`                                                                                | 0    | `check-bash-reconcile.mjs --base . --require-baseline` — `CLEAN`         |

**Reconcile, in detail.** The epoch is the fix pass's, anchored by `pharn-dev-build` at `2026-09-26T22:18:11.368Z`,
after the merge commit, so `main`'s merged files are outside its window. It was amended once, when the plan declared
`render-verify.test.mjs`. It reconciled 11 paths and found 0 escapes. The four exempted paths are this feature's
pipeline artifacts. `CLEAN` means no escape was **detected** in the anchor→reconcile window, not that none occurred
(`pharn/pharn-contracts/reconciliation-record.md`).

This increment ships no eval pair of its own. Its own correctness signal is its tests inside `npm test`:
`cost-hostile-input.test.mjs` (43) and `cost-value-core.test.mjs` (6).

## Verifiers (ADVISORY)

No verifiers registered — floor gates only (`node pharn/floor/count-verifiers.mjs .` →
`{"registered":0,"verifiers":[]}`).

_Verified = the named gates passed. This is NOT a guarantee of correctness beyond what those gates check. Verifier
concerns are advisory help, not assurance._
