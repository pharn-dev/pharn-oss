# VERIFY — core-371-user-docs

## Run 2 (the standing verdict) — head 1e277300 plus this stage's own artifacts

| gate                 | exit |
| -------------------- | ---- |
| `test`               | 0    |
| `validate`           | 0    |
| `lint`               | 0    |
| `format:check`       | 0    |
| `lint:md`            | 0    |
| `instruction-growth` | 0    |
| `reconcile`          | 0    |

VERIFIED: floor gates PASS (`check-verify.mjs --stamp` exit 0; stamp sha256 `b2fe1dc9…f414`).

- Completeness: every concrete `## Files` path present.
- Reconcile: `CLEAN`, 11 paths reconciled, no escape. `merged` lists `pharn/floor/stage-direct.test.mjs` and
  `.dev/features/main-format-fix/PLAN.md`, the bytes `origin/main` 98996b7f (#489) brought in. The build's anchor was
  kept across that merge (L85).
- Verifiers: no verifiers registered — floor gates only.

## Run 1 (superseded) — head cd778d7c plus the uncommitted build

Verdict `FAIL`, `failing_gates: ["format:check"]`. Every other gate exit 0. Prettier's only warning was
`pharn/floor/stage-direct.test.mjs`, a file this increment does not touch. It reached the branch with the merge of
`origin/main` 9c438685: the code-scanning autofix commits #487 and #488 left it unformatted, and `main` itself was red
on that gate. This was a STOP. The environment was then fixed upstream (#489, merged as 98996b7f) and merged into this
branch, and the stage was re-run from `init`, which produced the run-2 stamp above. No gate value was carried over
from run 1.

Verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance.
