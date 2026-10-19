# VERIFY — loop-grant-seam-skill

| gate                                                                                       | run 1 | run 2 |
| ------------------------------------------------------------------------------------------ | ----- | ----- |
| `test` (`npm test`, 5560 tests)                                                            | 1     | 1     |
| `validate`                                                                                 | 0     | 0     |
| `lint`                                                                                     | 0     | 0     |
| `format:check`                                                                             | 0     | 0     |
| `lint:md`                                                                                  | 0     | 0     |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0     | 0     |
| `reconcile` (`check-bash-reconcile.mjs --require-baseline`, verdict `CLEAN`)               | 0     | 0     |

**VERIFY FAILS: gate(s) `test` red — stage FAILS** (`check-verify.mjs` exit 1, `"verdict": "FAIL"`,
`failing_gates: ["test"]`, both runs). `verify-report.json` holds run 2's verdict verbatim plus the advisory
`verifiers` block.

## Which tests failed, and what that evidence does and does not show

The machine was shared with about a dozen other agent sessions; the load average ran 40–150 across these runs.

- **Run 1:** 2 of 5560 failed — `entry-base-evidence.test.mjs:691` and `stage-verify.test.mjs:1112` (the 2-second
  "budget clock" test, which also failed at the regress BASE, i.e. on unchanged `main` bytes).
- **Run 2:** 11 failed — `entry-base-evidence.test.mjs` (8), `entry-gates.test.mjs:799`,
  `stage-regress.test.mjs:2207` and `:3008`.
- Every failing test is in a suite built on wall-clock budgets and timeouts (entry gates, base-evidence reuse, the
  regress/verify stage scripts). None of those files, nor anything they import, is inside this increment: it adds
  `seam-config-materialize.mjs` (imported by nothing) and edits two command files and one dev test.
- Rerun alone (advisory evidence, not the verdict): `entry-base-evidence` + `stage-verify` 61/61 pass;
  `entry-base-evidence` + `entry-gates` 55/55 pass. `stage-regress` + `entry-gates` 145/147 at load ~150, the two
  failures being "a timed-out base gate" cases whose green-head control itself timed out.
- The increment's own tests pass in every run: `seam-config-materialize.test.mjs` (11/11) and the loop-grant tests
  in `command-hygiene.test.mjs`.

So the floor verdict is FAIL and is recorded as FAIL. Attributing that red to machine load rather than to this diff
is the evidence above, which is advisory. CI on the pull request, on an unloaded runner, is the clean measurement
of the `test` gate.

## Verifiers

No verifiers registered — floor gates only (`count-verifiers.mjs`: `{"registered":0,"verifiers":[]}`).

## Orchestration notes (advisory)

The pinned `npm test; t=$?` / `printf` forms are refused in this worktree-isolated session, so the same gates ran
from `.pharn/pharn-dev-verify/capture.mjs` (`spawnSync`, argv arrays). Run 1's verdict and test log are kept beside
run 2's under `.pharn/pharn-dev-verify/`.

_Verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance._ Here one named gate did not pass.
