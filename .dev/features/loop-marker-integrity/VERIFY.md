# VERIFY — loop-marker-integrity

Verified at head `c9ee2be0` plus the uncommitted regress artifacts, after the maintainer-applied patch commit
`bc9c9bc8` and the re-anchor that followed it (epoch `2026-11-03T15:09:13.612Z`, `anchored_by: pharn-dev-build`).
Machine report: `verify-report.json`.

## Floor layer — gate → exit code

| gate                                                                                       | exit |
| ------------------------------------------------------------------------------------------ | ---- |
| `test` (`npm test`: 6255 tests, 6254 pass, 0 fail, 1 skipped)                              | 0    |
| `validate` (`node pharn/floor/validate.mjs .`)                                             | 0    |
| `lint`                                                                                     | 0    |
| `format:check`                                                                             | 0    |
| `lint:md`                                                                                  | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    |
| `reconcile` (`check-bash-reconcile.mjs --base . --require-baseline`: CLEAN, no escape)     | 0    |

`reconcile` exempted only this feature's pipeline artifacts (`PLAN.md`, `REGRESSION.md`, `regression-report.json`).

**VERIFIED: floor gates PASS** (`check-verify.mjs`, exit 0).

## Advisory layer — verifiers

No verifiers registered — floor gates only (`count-verifiers.mjs`: `{"registered":0,"verifiers":[]}`).

## Orchestration notes (advisory)

The pinned `t=$?` / `printf` capture forms are refused in an isolated worktree, so the same seven gates ran through a
scratch runner (`spawnSync` with argv arrays, exit codes recorded into `pharn/.run/pharn-dev-verify/results.json`),
then `check-verify.mjs` computed the verdict over that map.

_verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance._
