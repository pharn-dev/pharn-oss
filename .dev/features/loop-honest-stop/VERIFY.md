# VERIFY — loop-honest-stop

## Run 1 and run 2 (the same tree; build complete, before the review fixes)

| gate                                                                                       | run 1 | run 2 |
| ------------------------------------------------------------------------------------------ | ----- | ----- |
| `test` (`npm test`)                                                                        | 1     | 1     |
| `validate`                                                                                 | 0     | 0     |
| `lint`                                                                                     | 0     | 0     |
| `format:check`                                                                             | 0     | 0     |
| `lint:md`                                                                                  | 0     | 0     |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0     | 0     |
| `reconcile` (`check-bash-reconcile.mjs --require-baseline`)                                | 0     | 0     |

**VERIFY FAILS: gate(s) `test` red — stage FAILS** (`check-verify.mjs` exit 1, both runs; `verify-report.json` holds
run 2's verdict verbatim).

### The one red, investigated

Each run failed exactly one of 5,566 tests, the same one: `pharn/floor/stage-regress.test.mjs:2207`, "never recorded —
a timed-out base gate". It is not part of this increment: no file it exercises is in the build's `## Files`, and the
build changed no regress code.

- The test gives a fixture's base gates a `--timeout-ms 1500` budget and expects exactly one gate to time out. Under the
  machine load during these runs (load average 28–52, several parallel agents each running full suites), the other
  gate timed out as well. The rendered report then named two timed-out gates at both sides instead of the
  `evidence-unreliable` line the test expects (run 1 failed the `second.counts.base > 0` assertion, run 2 the render
  match).
- The same test failed at the **base** commit (`d5453a17`, main) in this increment's regress run. It passed at HEAD in
  that run, in isolation here (`--test-name-pattern 'never recorded'`, 3/3 pass), and in this worktree's
  `npm run check` before regress (5,565 pass, 0 fail, exit 0).
- Reading: a load-dependent flake of a pre-existing test, not a defect of this build. That reading is advisory. The
  floor verdict above is what it is, and this file does not restate it as a pass.

`reconcile`: `CLEAN`, 21 paths reconciled, no escapes. Exempted were this stage's sibling artifacts `REGRESSION.md` and
`regression-report.json`.

## Verifiers

No verifiers registered (`count-verifiers.mjs` → `{"registered":0,"verifiers":[]}`), so these results come from the
floor gates only.

Verified means the named gates passed. It does not guarantee correctness beyond what those gates check; verifier
concerns would be advisory help, not assurance.
