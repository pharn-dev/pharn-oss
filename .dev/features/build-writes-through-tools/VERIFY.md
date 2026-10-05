# VERIFY — build-writes-through-tools

There are two runs. Both used the gate set the command pins. A node runner, `.pharn/pharn-dev-verify/run.mjs`, ran
the gates, because this worktree session refuses shell-variable capture.
`verify-report.json` holds the second run's verdict. Its gate map is byte-identical to the first run's.

## Run 2 — the review-fix pass (branch `fix/build-writes-review`, 6.35.2)

This run is at HEAD of `fix/build-writes-review`: `origin/main` `4c4c0c5`, which is #305 merged, plus the
review-fix pass in the working tree.

| gate                                                                                       | exit |
| ------------------------------------------------------------------------------------------ | ---: |
| `test` (`npm test`)                                                                        |    0 |
| `validate`                                                                                 |    0 |
| `lint`                                                                                     |    0 |
| `format:check`                                                                             |    0 |
| `lint:md`                                                                                  |    0 |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` |    0 |
| `reconcile`                                                                                |    0 |

**`reconcile`: `CLEAN`.**

- The epoch is a fresh `/pharn-dev-build` anchor at 2026-10-05T13:16:39Z, opened for this fix pass after the R1–R5
  edits were carried onto the branch.
- 6 paths were reconciled and none escaped. `REVIEW.md` was exempted as a pipeline artifact.
- **Bound:** the R1–R5 edits themselves were made under the first build's epoch, before the branch move, through
  the Edit tool under a `--from-plan` scope. The new epoch reconciles only the CHANGELOG, version and wording edits
  made after it.

`npm run check` was also GREEN on this tree: 4,504 tests, 4,504 pass.

**VERIFIED: floor gates PASS** (`check-verify.mjs`, exit 0, `"verdict": "PASS"`, `failing_gates: []`).

## Run 1 — the original build (`115fee7`, PR #305)

That run was at HEAD `115fee7` plus the working tree: the REGRESSION artifacts and one wording fix in the record.
All 7 gates exited 0 (`npm test`: 4,504 tests, 4,504 pass).

`reconcile` was `CLEAN` over the first epoch (2026-10-05T11:51:01Z): 10 paths were reconciled and none escaped.
`REGRESSION.md` and `regression-report.json` were exempted. The verdict was PASS.

## Verifiers, and what this does not show

Verifiers: no verifiers registered (`count-verifiers.mjs` → `{"registered":0,"verifiers":[]}`). Floor gates only.

Verified means the named gates passed. It is NOT a guarantee of correctness beyond what those gates check. In
particular, no gate shows that a stage agent obeys the write-tool rule: that is advisory by design, because no shell
command is parsed.
