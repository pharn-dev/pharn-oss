# VERIFY — gate-evidence-cache

Measured by `pharn/floor/run-gates.mjs` (stamp `pharn/.run/pharn-dev-verify/gates/stamp.json`, sha256
`6fe07ba3d9fed47ef386f71276208d5acf20b890a8e8d07d4024f324b03f3db7`), judged by `pharn/floor/check-verify.mjs --stamp`.
This is the second verify of the build (iteration 2), after the review-driven fix to `entry-gate-cache-core.mjs`; the
first (stamp `24accf20…`) was PASS too.

| gate                 | exit |
| -------------------- | ---: |
| `test`               |    0 |
| `validate`           |    0 |
| `lint`               |    0 |
| `format:check`       |    0 |
| `lint:md`            |    0 |
| `instruction-growth` |    0 |
| `reconcile`          |    0 |

`test` ran for 695 s (`duration_ms` 694,615) under the runner's one-hour timeout. Build completeness (every concrete
`## Files` path present) is in the stamp's `aux` and did not make the verdict INCOMPLETE.

**VERIFIED: floor gates PASS.**

Verifiers: no verifiers registered — floor gates only (`count-verifiers.mjs`: `{"registered":0,"verifiers":[]}`).

The reconcile epoch is the build's second anchor, taken after the recorded build amendment (`PLAN.md`, "Build
amendment"); each later stage's scope was amended onto it.

_Verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance._
