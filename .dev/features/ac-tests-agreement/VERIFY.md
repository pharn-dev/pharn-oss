# VERIFY — ac-tests-agreement

## FLOOR layer — per-gate exit codes (run at HEAD, the working tree with the feature in it)

| gate                                                                                       | exit |
| ------------------------------------------------------------------------------------------ | ---- |
| `test` (`npm test` — hooks, product floor, dev floor, incl. this feature's new tests)      | 0    |
| `validate` (`node pharn/floor/validate.mjs .`)                                             | 0    |
| `lint`                                                                                     | 0    |
| `format:check`                                                                             | 0    |
| `lint:md`                                                                                  | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    |
| `reconcile` (`check-bash-reconcile.mjs --base . --require-baseline` → `CLEAN`, 0 escapes)  | 0    |

## Verdict (FLOOR — `check-verify.mjs`, exit 0)

**VERIFIED: floor gates PASS** — `failing_gates: []`.

The reconcile gate judged every change since the build's anchor (amendment 1 recorded the plan's added test file)
against the scope, including the in-scope files this run wrote through Bash (`SKILLS_VERSION`, the README badge,
`regression-report.json`, the two PLAN.md appends). None was an escape.

## ADVISORY layer — verifiers

No verifiers registered — floor gates only (`count-verifiers.mjs` → `{"registered":0,"verifiers":[]}`).

## Orchestration deviation (ADVISORY, stated)

The pinned `cmd; t=$?` capture form is refused in an isolated worktree. So the seven gates ran from
`.pharn/pharn-dev-verify/run.mjs`, which uses argv arrays and records exit codes only, and the verdict was computed
separately by the literal `check-verify.mjs` line. The helper's four fields in `verify-report.json` were compared
against its stdout and are identical.

_Verified = the named gates passed. This is NOT a guarantee of correctness beyond what those gates check; verifier
concerns are advisory help, not assurance._
