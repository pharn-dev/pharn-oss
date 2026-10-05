# VERIFY — regress-pre-run-snapshot

Run at HEAD `beffa29` plus the working-tree build, after `/pharn-dev-regress` (`no-regressions`). Each gate's exit code
was captured by a scratch node runner under `.pharn/pharn-dev-verify/` (this worktree session refuses `$VAR` capture);
the runner ran exactly the gates Step 1 names and recorded only exit codes.

| gate                                                                                       | exit |
| ------------------------------------------------------------------------------------------ | ---: |
| `test` (`npm test` — 4547 tests, 4547 pass)                                                |    0 |
| `validate` (`node pharn/floor/validate.mjs .` — GREEN, 36 capabilities)                    |    0 |
| `lint`                                                                                     |    0 |
| `format:check`                                                                             |    0 |
| `lint:md`                                                                                  |    0 |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` |    0 |
| `reconcile` (`--require-baseline`: `CLEAN`, 24 reconciled, 0 escapes)                      |    0 |

**VERIFIED: floor gates PASS** (`check-verify.mjs`, exit 0; `failing_gates: []`). The machine report is
`verify-report.json`.

`reconcile` exempted this feature's own `PLAN.md`, `REGRESSION.md` and `regression-report.json` (pipeline artifacts).
The epoch was anchored by `/pharn-dev-build` Step 0 and amended twice during the build, when the plan gained
`.dev/floor/command-hygiene.test.mjs` (the PLAN.md re-scope, then the re-set build scope).

**Verifiers:** no verifiers registered — floor gates only (`count-verifiers.mjs` → `{"registered":0}`).

_verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance._
