# VERIFY — triage-model-key

Gates run through `pharn/floor/run-gates.mjs` (stamp `pharn/.run/pharn-dev-verify/gates/stamp.json`, sha256
`0d3bbff4940671f312acaa3ea7a1c50e89123dbdf731cecb34d1468cec08c523`), one gate at a time; verdict by
`pharn/floor/check-verify.mjs --stamp`.

| gate                 | exit |
| -------------------- | ---- |
| `test`               | 0    |
| `validate`           | 0    |
| `lint`               | 0    |
| `format:check`       | 0    |
| `lint:md`            | 0    |
| `eval:trust-fence`   | 0    |
| `instruction-growth` | 0    |
| `reconcile`          | 0    |

Build completeness (`stamp.aux.completeness`): every concrete `## Files` path present.

Verdict: **VERIFIED: floor gates PASS** (`check-verify.mjs` exit 0).

## Verifiers

No verifiers registered — floor gates only.

## Residual

Verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance. The stamp certifies internal consistency, never provenance (P0, L43). No gate
checks the pharn-cli 0.18.1 boundary the new sentence states (GRILL.md, testability finding).
