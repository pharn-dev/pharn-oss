# VERIFY — entry-run-as-base-evidence

**VERIFIED: floor gates PASS.**

The verdict is `pharn/floor/check-verify.mjs` over the gate → exit-code map (exit `0`, `"verdict": "PASS"`,
`failing_gates: []`). The machine report is `verify-report.json`: the helper's stdout verbatim, with the advisory
`verifiers` block appended after the verdict was computed.

## FLOOR layer — gate exit codes (HEAD = working tree on `0e38b86`, the build uncommitted)

| gate                                                                                       | exit |
| ------------------------------------------------------------------------------------------ | ---: |
| `test` (`npm test`; 5120 tests, 5120 pass, 0 fail, 0 skipped)                              |    0 |
| `validate` (`FLOOR: GREEN — 37 capabilities`)                                              |    0 |
| `lint` (`npm run lint`)                                                                    |    0 |
| `format:check` (`npm run format:check`, whole repo)                                        |    0 |
| `lint:md` (`npm run lint:md`, whole repo)                                                  |    0 |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` |    0 |
| `reconcile` (`check-bash-reconcile.mjs --require-baseline`)                                |    0 |

- **`reconcile`:** `CLEAN` against the epoch anchored by `pharn-dev-build` (2026-10-06T12:53:40Z): 35 changed paths
  reconciled, 3 exempted, 0 escapes, no warnings. `CLEAN` means no escape was detected in the anchor → verify
  window, never that none occurred (`pharn/pharn-contracts/reconciliation-record.md`).
- **Eval pair:** `pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` ↔
  `.dev/features/trust-fence/findings.json`, both confirmed readable before the run. This feature ships no eval pair
  of its own; its feature-specific signal is its own `*.test.mjs` files, collected by `npm test`.
- **Sibling worktrees:** two other sessions' worktrees exist under `.claude/worktrees/`. No gate was red, so no
  clean-copy measurement was needed; the only `.claude/worktrees` strings in the `npm test` log are test names
  (fixture paths), not tests collected from those worktrees.

## ADVISORY layer — verifiers

No verifiers registered — floor gates only (`count-verifiers.mjs` → `{"registered":0,"verifiers":[]}`).

## Residual (P0/P7)

Verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance. Running the gates and assembling this report is advisory orchestration;
only the exit-code verdict is floor-grade.
