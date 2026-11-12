# VERIFY — entry-context-guard

Gates run through `pharn/floor/run-gates.mjs` (stage `verify`, one gate per background call), verdict by
`pharn/floor/check-verify.mjs --stamp` (stamp sha256 `4e836e90…02eb66`).

| gate                 | exit |
| -------------------- | ---: |
| `test`               |    0 |
| `validate`           |    0 |
| `lint`               |    0 |
| `format:check`       |    0 |
| `lint:md`            |    0 |
| `instruction-growth` |    0 |
| `reconcile`          |    0 |

**VERIFIED: floor gates PASS** (`check-verify.mjs` exit 0; build completeness: every `## Files` path present).

`reconcile` CLEAN: no path changed since the build's anchor that the write guards would have denied.

Verifiers: no verifiers registered — floor gates only (`count-verifiers.mjs` → `{"registered":0,"verifiers":[]}`).

Verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance.
