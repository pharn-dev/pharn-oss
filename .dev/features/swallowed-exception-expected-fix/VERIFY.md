# VERIFY — swallowed-exception-expected-fix

Re-run after the GATE 2 fix round (A1–A3), at HEAD `2d91080` plus this round's uncommitted regress artifacts, in the
working tree. It replaces the first run's report (at `79b4fdd`, also `PASS`). Verdict helper:
`node pharn/floor/check-verify.mjs .pharn/pharn-dev-verify/results.json --feature swallowed-exception-expected-fix` →
exit 0. The machine report is `verify-report.json` (the helper's stdout, verbatim, plus the advisory `verifiers` block).
Its bytes are unchanged, because this run's gates and verdict are identical to the first run's.

## Floor gates

| gate                                                                                       | exit |
| ------------------------------------------------------------------------------------------ | ---- |
| `test` (`npm test`)                                                                        | 0    |
| `validate` (`node pharn/floor/validate.mjs .`)                                             | 0    |
| `lint` (`npm run lint`)                                                                    | 0    |
| `format:check` (`npm run format:check`)                                                    | 0    |
| `lint:md` (`npm run lint:md`)                                                              | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    |
| `reconcile` (`check-bash-reconcile.mjs --base . --require-baseline`)                       | 0    |

**VERIFIED: floor gates PASS.** `failing_gates`: none.

- `test`: 5,546 tests, 5,545 passed, 0 failed, 1 skipped. That is the 5,542 the regress outside suite ran plus the four
  tests in `.dev/floor/eval-expected-satisfiable.test.mjs`, the feature's own correctness signal: every one of the 111
  `pharn/**/evals/expected/*.json` files is passed by its witness, and the fixed swallowed-exception eval is among
  them.
- `validate`: `FLOOR: GREEN — 37 capabilities checked`.
- `structural:*`: the one committed eval pair (trust-fence ↔ `.dev/features/trust-fence/findings.json`). This feature
  ships no committed actual findings for the swallowed-exception eval, so it has no `structural:*` gate of its own; the
  new test runs that eval through the same checker instead.
- `reconcile`: `CLEAN`. The fix round's own epoch, anchored by its build Step 0 (`pharn-dev-build`); 2 paths
  reconciled (`CHANGELOG.md` and the test), 0 escapes, 0 merged. `exempted`: `REGRESSION.md` and
  `regression-report.json` (written under `/pharn-dev-regress`'s own scope). The fix round's `PLAN.md` edit was made
  before that anchor, so it lies outside this epoch.

## Verifiers (advisory)

No verifiers registered — floor gates only (`node pharn/floor/count-verifiers.mjs .` →
`{"registered":0,"verifiers":[]}`).

verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance.

## Orchestration notes (advisory)

- Each gate ran as its own plain command and its exit code was recorded by hand into
  `.pharn/pharn-dev-verify/results.json`, because the isolated-worktree shell guard refuses the pinned `$?`-variable
  and `printf` assembly.
