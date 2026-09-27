# VERIFY — cost-transcript-hostile-values

**VERIFIED: floor gates PASS** (`pharn/floor/check-verify.mjs`, exit 0; `failing_gates: []`).

This is the fourth run. It covers the final tree: the merge of `main` at 6.27.0 (#283) and the renumber to 6.27.1, on
top of the GATE 2 fix pass and the second fix iteration. The three earlier runs were also PASS, and this one
supersedes them. `verify-report.json` already held this verdict: the gate set and every exit code are the same, so its
bytes did not change. The counts below are this run's.

## Gates

| gate                                                                                       | exit | what it ran                                                              |
| ------------------------------------------------------------------------------------------ | ---- | ------------------------------------------------------------------------ |
| `test`                                                                                     | 0    | `npm test` — 3,913 tests, 3,913 passed, 0 failed                         |
| `validate`                                                                                 | 0    | `node pharn/floor/validate.mjs .` — GREEN                                |
| `lint`                                                                                     | 0    | `npm run lint`                                                           |
| `format:check`                                                                             | 0    | `npm run format:check`                                                   |
| `lint:md`                                                                                  | 0    | `npm run lint:md`                                                        |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | `check-structural.mjs` against `.dev/features/trust-fence/findings.json` |
| `reconcile`                                                                                | 0    | `check-bash-reconcile.mjs --base . --require-baseline` — `CLEAN`         |

**Reconcile, in detail.** The epoch was anchored by `pharn-dev-build` at `2026-09-27T07:52:58.718Z`, after the merge
commit `05ad264` and under the plan's 22-path scope, so the files merged from `main` are outside its window. Since the
anchor, three paths changed, all of them this feature's pipeline artifacts and all exempt: `BUILD.md`,
`REGRESSION.md` and `regression-report.json`. It reconciled 0 paths and found 0 escapes, with no warnings. `CLEAN`
means no escape was **detected** in the anchor→reconcile window, not that none occurred
(`pharn/pharn-contracts/reconciliation-record.md`).

This increment ships no eval pair of its own. Its own correctness signal is its tests inside `npm test`:
`cost-hostile-input.test.mjs` (43) and `cost-value-core.test.mjs` (6). The same suite runs #283's tests over this
increment's code, its `route` tests in `render-cost-ledger.test.mjs` included.

## Verifiers (ADVISORY)

No verifiers registered — floor gates only (`node pharn/floor/count-verifiers.mjs .` →
`{"registered":0,"verifiers":[]}`).

_Verified = the named gates passed. This is NOT a guarantee of correctness beyond what those gates check. Verifier
concerns are advisory help, not assurance._
