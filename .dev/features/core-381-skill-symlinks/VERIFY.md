# VERIFY — core-381-skill-symlinks

Gates run through `pharn/floor/run-gates.mjs` (stamp `pharn/.run/pharn-dev-verify/gates/stamp.json`, sha256
`cc99702434ab8cf59ffc4e8b1efcaf740aabe91dd8efa9aab8a94b89ec019e07`); verdict by `pharn/floor/check-verify.mjs --stamp`.

| gate               | exit |
| ------------------ | ---- |
| test               | 0    |
| validate           | 0    |
| lint               | 0    |
| format:check       | 0    |
| lint:md            | 0    |
| instruction-growth | 0    |
| reconcile          | 0    |

Build completeness (`stamp.aux`): every concrete `## Files` path is present.

VERIFIED: floor gates PASS

Verifiers: no verifiers registered — floor gates only.

Verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance.
