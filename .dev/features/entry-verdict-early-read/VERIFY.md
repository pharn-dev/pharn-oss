# VERIFY — entry-verdict-early-read

Gates run through `pharn/floor/run-gates.mjs` (stage `verify`); verdict from
`node pharn/floor/check-verify.mjs --stamp pharn/.run/pharn-dev-verify/gates/stamp.json --feature entry-verdict-early-read`
(exit 0). Stamp sha256 `96658fce…b7ae`, fingerprint `worktree-fingerprint/3+sha256`.

Run 2, after the four GATE-2 review fixes and the L84 commit (`b751399c`). Run 1 (stamp `4040a0aa…4359`, before the
fixes) was also PASS on all seven gates.

| gate                 | exit |
| -------------------- | ---- |
| `test`               | 0    |
| `validate`           | 0    |
| `lint`               | 0    |
| `format:check`       | 0    |
| `lint:md`            | 0    |
| `instruction-growth` | 0    |
| `reconcile`          | 0    |

Build completeness (`stamp.aux.completeness`): every concrete `## Files` path present.

Verdict: **VERIFIED: floor gates PASS**.

## Verifiers (advisory)

No verifiers registered — floor gates only (`count-verifiers.mjs`: `{"registered":0,"verifiers":[]}`).

verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance.
