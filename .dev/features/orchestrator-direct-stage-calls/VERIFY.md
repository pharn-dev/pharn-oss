# VERIFY — orchestrator-direct-stage-calls

Run at HEAD `0b983b3` (the build commit) plus the two regress artifacts, from one node runner under
`.pharn/pharn-dev-verify/` (this isolated worktree session refuses the command's `$?` capture form). Each gate's exit
code went into `.pharn/pharn-dev-verify/results.json`; `check-verify.mjs` computed the verdict.

## Floor gates

| gate                                                                                       | exit |
| ------------------------------------------------------------------------------------------ | ---: |
| `test` (`npm test`, the whole hermetic suite)                                              |    0 |
| `validate` (`node pharn/floor/validate.mjs .`)                                             |    0 |
| `lint`                                                                                     |    0 |
| `format:check`                                                                             |    0 |
| `lint:md`                                                                                  |    0 |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` |    0 |
| `reconcile` (`check-bash-reconcile.mjs --base . --require-baseline`)                       |    0 |

`reconcile` read `CLEAN`: 23 paths reconciled since the build's anchor, no escape; `REGRESSION.md` and
`regression-report.json` exempted as pipeline artifacts. `CLEAN` means no escape was detected, never that none
occurred (`pharn/pharn-contracts/reconciliation-record.md`).

**VERIFIED: floor gates PASS** (`check-verify.mjs`, exit 0, `failing_gates: []`).

## Verifiers

No verifiers registered — floor gates only (`count-verifiers.mjs`: `{"registered":0}`).

## Residual

Verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance.
