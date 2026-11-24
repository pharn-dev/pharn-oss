# VERIFY — core-350-docs-truth

Gates measured by `pharn/floor/run-gates.mjs` (stamp sha256 `f002f1ae…40dd`), verdict by `check-verify.mjs --stamp`
(exit 0).

| gate                 | exit |
| -------------------- | ---- |
| `test`               | 0    |
| `validate`           | 0    |
| `lint`               | 0    |
| `format:check`       | 0    |
| `lint:md`            | 0    |
| `instruction-growth` | 0    |
| `reconcile`          | 0    |

`test` took 915 s on a loaded host. Build completeness (`stamp.aux`): every concrete `## Files` path present.

VERIFIED: floor gates PASS

Verifiers: no verifiers registered — floor gates only.

Verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance. In particular, no gate checks that a doc sentence is true.
