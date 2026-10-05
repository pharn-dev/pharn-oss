# VERIFY — build-writes-through-tools

Run at HEAD (`115fee7` plus the working tree: this feature's REGRESSION artifacts and one wording fix in
`.dev/measurements/loop-wall-clock-2026-10-05.md`). The gates were run by a node runner,
`.pharn/pharn-dev-verify/run.mjs`, because this worktree session refuses shell-variable capture. The gate set is the
one the command pins.

| gate                                                                                       | exit |
| ------------------------------------------------------------------------------------------ | ---: |
| `test` (`npm test`: 4,504 tests, 4,504 pass)                                               |    0 |
| `validate`                                                                                 |    0 |
| `lint`                                                                                     |    0 |
| `format:check`                                                                             |    0 |
| `lint:md`                                                                                  |    0 |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` |    0 |
| `reconcile`                                                                                |    0 |

**`reconcile`: `CLEAN`.**

- The epoch is the one `/pharn-dev-build` anchored at 2026-10-05T11:51:01Z; 10 paths were reconciled and none
  escaped.
- `REGRESSION.md` and `regression-report.json` were exempted as pipeline artifacts.
- The 10 paths include the measurement record's wording fix, made after regress under a re-set `--from-plan` scope:
  the path is declared, so the fix is not an escape.

**VERIFIED: floor gates PASS** (`check-verify.mjs`, exit 0, `"verdict": "PASS"`, `failing_gates: []`).

Verifiers: no verifiers registered (`count-verifiers.mjs` → `{"registered":0,"verifiers":[]}`). Floor gates only.

Verified means the named gates passed. It is NOT a guarantee of correctness beyond what those gates check. In
particular, no gate shows that a stage agent obeys the new write-tool rule: that is advisory by design, because no
shell command is parsed.
