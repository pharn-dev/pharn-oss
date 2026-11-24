# VERIFY — test-stage-typecheck

Gates run through `pharn/floor/run-gates.mjs` (stamp `pharn/.run/pharn-dev-verify/gates/stamp.json`, sha256
`0329713cf7a0da38dde3f4386180e032396348d6ece090217054297f62dec403`, fingerprint `worktree-fingerprint/3+sha256`
`ae2df893…46fe31`), verdict by `check-verify.mjs --stamp` (exit 0).

| gate                 | exit |
| -------------------- | ---- |
| `test`               | 0    |
| `validate`           | 0    |
| `lint`               | 0    |
| `format:check`       | 0    |
| `lint:md`            | 0    |
| `instruction-growth` | 0    |
| `reconcile`          | 0    |

`reconcile`: `CLEAN`, no escapes. Completeness: every concrete `## Files` path present.

**VERIFIED: floor gates PASS.**

Verifiers: no verifiers registered — floor gates only.

_Verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance._
