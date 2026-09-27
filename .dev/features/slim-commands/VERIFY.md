# VERIFY — slim-commands

- stage: `/pharn-dev-verify`, after `/pharn-dev-build` (BUILD.md) and `/pharn-dev-regress` (REGRESSION.md,
  `no-regressions`).
- stage model: verify — opus — set by the maintainer's instruction, overriding pharn.config.json; routed via Agent
  subagent; effort not routed.
- machine report: `verify-report.json` (`check-verify.mjs`'s stdout verbatim, plus the advisory `verifiers` block).

## FLOOR layer — the gates (exit codes, run at HEAD)

| Gate                                                                                       | Exit |
| ------------------------------------------------------------------------------------------ | ---: |
| `test` (`npm test`)                                                                        |    0 |
| `validate` (`node pharn/floor/validate.mjs .`)                                             |    0 |
| `lint` (`npm run lint`)                                                                    |    0 |
| `format:check` (`npm run format:check`)                                                    |    0 |
| `lint:md` (`npm run lint:md`)                                                              |    0 |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` |    0 |
| `reconcile` (`check-bash-reconcile.mjs --base . --require-baseline`)                       |    0 |

- `reconcile`: `CLEAN`, 16 paths reconciled against the epoch `/pharn-dev-build` anchored, 0 escapes. `CLEAN` means no
  escape was detected, never that none occurred (`pharn/pharn-contracts/reconciliation-record.md`).
- This feature ships no capability and so no eval pair of its own; the one committed pair is run, as in every
  dev-verify.

## Verdict

**VERIFIED: floor gates PASS** (`node pharn/floor/check-verify.mjs .pharn/pharn-dev-verify/results.json --feature
slim-commands` → exit 0, `failing_gates: []`).

## ADVISORY layer — verifiers

no verifiers registered — floor gates only (`node pharn/floor/count-verifiers.mjs .` →
`{"registered":0,"verifiers":[]}`).

_verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance._ In particular, the gates bound the slimmed commands' bytes, vocabulary,
pinned lines and claims-block presence; that no unpinned instruction was lost and that each condensed claim kept its
bound are advisory (BUILD.md's maps, read at review).
