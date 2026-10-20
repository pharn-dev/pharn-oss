# VERIFY — test-infra-pin-all-gates

Machine report: `verify-report.json` (`check-verify.mjs` stdout verbatim, plus the advisory `verifiers` block).

## Floor gates (exit codes)

| gate                                                                                     | exit |
| ---------------------------------------------------------------------------------------- | ---- |
| test (`npm test`)                                                                        | 1    |
| validate                                                                                 | 0    |
| lint                                                                                     | 0    |
| format:check                                                                             | 0    |
| lint:md                                                                                  | 0    |
| structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json | 0    |
| reconcile (`check-bash-reconcile.mjs --require-baseline`: `CLEAN`, no escapes)           | 0    |

**VERIFY FAILS: gate(s) [test] red — stage FAILS.** (`check-verify.mjs` exit 1.)

## What the red `test` gate is — evidence, advisory (it does not move the verdict)

The machine was shared with other agents throughout (load average 70–150). Two full `npm test` runs at HEAD:

| run | tests | pass  | fail | failing files                                                   |
| --- | ----- | ----- | ---- | --------------------------------------------------------------- |
| 1   | 5,638 | 5,629 | 8    | `entry-base-evidence.test.mjs` (6), `entry-gates.test.mjs` (2)  |
| 2   | 5,638 | 5,634 | 3    | `entry-base-evidence.test.mjs` (2), `stage-verify.test.mjs` (1) |

- Every failure is a wall-clock budget or background-runner outcome under load: a stage that returned
  `status: continue` (exit 5, budget spent) where the test expected one pass; a resumed drain counted as an extra
  base run; a background runner's result file that "never appeared"; and `stage-verify`'s "budget clock" test, whose
  2 s window the control run also exhausted. The failing test differs from run to run.
- **Paired comparison, same load, same moment:** `entry-base-evidence.test.mjs` + `entry-gates.test.mjs` run at the
  base commit `5b468d66` (a clean worktree) and at HEAD concurrently — **both 52 pass / 3 fail, the same three
  tests**. Unpaired runs scattered: one base run passed 55/55, two HEAD reruns failed 1 each (a different test each
  time). Only the paired run compares like with like.
- The increment's own suites pass in isolation, 0 failures: `test-infra-core` 35, `ac-tests-lock` 39,
  `ac-gate-core` 47, `check-ac-tests` 62, `check-red-run` 38, `check-test-stage` 39.
- None of the failing tests asserts anything about the test-infrastructure pin; the failing assertions are counts
  of stage passes and exit codes driven by `--budget-ms` / `--timeout-ms`.

So the red is load-induced and present at base under the same conditions — that is the reading of this evidence,
and it is ADVISORY. The floor verdict stays **FAIL**; it is not overridden here. An unloaded run (CI) is what can
turn the `test` gate green.

## Verifiers

No verifiers registered — floor gates only (`count-verifiers.mjs`: `{"registered":0,"verifiers":[]}`).

_Verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance._ Here one named gate did not pass.
