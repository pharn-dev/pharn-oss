# VERIFY — spec-template

Feature `spec-template`, verified at HEAD with the build in the working tree. This is iteration 3, after
the fixes to the re-review's findings. Iterations 1 (after the build) and 2 (after the GATE-2 fix round)
were also `PASS` on the same seven gates, and `verify-report.json` holds iteration 3.

## Floor gates (exit codes, iteration 3)

| gate                                                                                       | exit |
| ------------------------------------------------------------------------------------------ | ---- |
| `test` (`npm test`, the whole hermetic suite)                                              | 0    |
| `validate` (`pharn/floor/validate.mjs .`)                                                  | 0    |
| `lint` (`npm run lint`)                                                                    | 0    |
| `format:check` (`npm run format:check`, whole repo)                                        | 0    |
| `lint:md` (`npm run lint:md`, whole repo)                                                  | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    |
| `reconcile` (`check-bash-reconcile.mjs --require-baseline`)                                | 0    |

`reconcile` returned `CLEAN`: 15 paths were reconciled against the build's epoch, whose scope the fix
round amended to the plan's 15 `## Files`, and `escapes: []`. `CLEAN` means no escape was detected, not
that none occurred (`pharn/pharn-contracts/reconciliation-record.md`).

## Verdict (deterministic — `pharn/floor/check-verify.mjs`, exit 0)

**VERIFIED: floor gates PASS** (`failing_gates: []`).

## Verifiers (advisory)

No verifiers are registered, so this run is floor gates only (`count-verifiers.mjs` →
`{"registered":0,"verifiers":[]}`).

## Honest residual

Verified means the named gates passed. This is NOT a guarantee of correctness beyond what those gates
check. In particular:

- the `check-spec` cases prove the template rules behave as their fixtures say;
- the fixtures were written by the same author as the grammar, and no reference parser was used (named
  residual `spec-ac-grammar-differential`);
- a valid AC grammar means a criterion is phrased testably, not that any test for it exists.
