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

## Iteration 2 — after the GATE-2 review fixes (R1–R5)

Run over `20f4e9c` (current with `main` 6.40.0) plus the uncommitted R1–R5 fixes, with the same runner. Every gate
above exited `0` again, and `check-verify.mjs` read **PASS** (`failing_gates: []`).

**The reconcile anchor was re-taken for this iteration, disclosed.** The build's anchor predates three merges of
`origin/main`, so its baseline would read main's merged files as writes outside this plan. The fixes were committed
temporarily, the tree was restored to `20f4e9c`'s content, `reconcile-baseline.mjs --anchor --by gate2-fix-iteration`
ran under the plan's scope (26 entries, `pharn-ship-close.md` now among them), and the fixes were restored. `reconcile`
read `CLEAN`: 12 paths reconciled, no escape. So this iteration judges exactly the fix writes. It never judged the
merges, which are git's.

## Residual

Verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance.
