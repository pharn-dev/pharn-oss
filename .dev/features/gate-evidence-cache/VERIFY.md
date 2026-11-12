# VERIFY — gate-evidence-cache

Measured by `pharn/floor/run-gates.mjs` (stamp `pharn/.run/pharn-dev-verify/gates/stamp.json`, sha256
`bb2ab0e27ab7bd32325ef3897e3c9055f0daeb7b067d8da41bd01c254a8fc55c`), judged by `pharn/floor/check-verify.mjs --stamp`.
This is the third verify of the build (iteration 3), after the fix for the pull request's diff-coverage gate (four
unreachable catches removed, two failure notes tested). The first (stamp `24accf20…`) and second (stamp `6fe07ba3…`)
were PASS too.

| gate                 | exit |
| -------------------- | ---: |
| `test`               |    0 |
| `validate`           |    0 |
| `lint`               |    0 |
| `format:check`       |    0 |
| `lint:md`            |    0 |
| `instruction-growth` |    0 |
| `reconcile`          |    0 |

`test` ran for 691 s (`duration_ms` 691,288) under the runner's one-hour timeout. Build completeness (every concrete
`## Files` path present) is in the stamp's `aux` and did not make the verdict INCOMPLETE.

**VERIFIED: floor gates PASS.**

Verifiers: no verifiers registered — floor gates only (`count-verifiers.mjs`: `{"registered":0,"verifiers":[]}`).

The reconcile epoch is the build's second anchor, taken after the recorded build amendment (`PLAN.md`, "Build
amendment"); each later stage's scope was amended onto it.

_Verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance._
