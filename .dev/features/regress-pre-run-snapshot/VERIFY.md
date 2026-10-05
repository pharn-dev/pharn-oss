# VERIFY — regress-pre-run-snapshot

**Iteration 2.** This run follows the independent review's fixes (R1–R5, `REVIEW.md`), on `f73b774`. That commit is
the build re-stacked on `main` at 6.36.0 (`dae61b2`) as 6.37.0. Iteration 1, on the working-tree build over `beffa29`,
was also `PASS`, with 4547 tests.

A scratch node runner under `.pharn/pharn-dev-verify/` captured each gate's exit code, because this worktree session
refuses `$VAR` capture. The runner ran exactly the gates Step 1 names and recorded only exit codes.

| gate                                                                                       | exit |
| ------------------------------------------------------------------------------------------ | ---: |
| `test` (`npm test` — 4595 tests, 4595 pass)                                                |    0 |
| `validate` (`node pharn/floor/validate.mjs .` — GREEN, 36 capabilities)                    |    0 |
| `lint`                                                                                     |    0 |
| `format:check`                                                                             |    0 |
| `lint:md`                                                                                  |    0 |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` |    0 |
| `reconcile` (`--require-baseline`: `CLEAN`, 13 reconciled, 0 escapes)                      |    0 |

**VERIFIED: floor gates PASS** (`check-verify.mjs`, exit 0; `failing_gates: []`). The machine report is
`verify-report.json`.

**The reconcile epoch, stated:** it was re-anchored twice:

- after the stacking merges, by `merge-restack`, because a merge brings in other increments' paths, and the build's
  epoch would read them as escapes;
- before the review fixes, by `review-fixes`, under the plan's scope.

It was then amended by the `REVIEW.md` and verify scopes. So this `CLEAN` covers the review-fix window. The build
window's `CLEAN` is iteration 1's. `reconcile` exempted this feature's own `REVIEW.md` as a pipeline artifact.

**Verifiers:** no verifiers are registered, so these are floor gates only (`count-verifiers.mjs` →
`{"registered":0}`).

_verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance._
