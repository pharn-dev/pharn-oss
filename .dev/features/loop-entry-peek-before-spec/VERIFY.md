# VERIFY — loop-entry-peek-before-spec

Gates measured by `pharn/floor/run-gates.mjs` (stamp `24648076…ace3abce`), verdict by `check-verify.mjs --stamp`.
This is the run after the GATE 2 "fix" round (the stop-wording fix), on base `d2da72dc`.

| gate                 | exit |
| -------------------- | ---- |
| `test`               | 0    |
| `validate`           | 0    |
| `lint`               | 0    |
| `format:check`       | 0    |
| `lint:md`            | 0    |
| `instruction-growth` | 0    |
| `reconcile`          | 0    |

`test` ran 540 s. Build completeness (`stamp.aux`): every concrete `## Files` path present.

**VERIFIED: floor gates PASS.**

Verifiers: no verifiers registered — floor gates only.

verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance.
