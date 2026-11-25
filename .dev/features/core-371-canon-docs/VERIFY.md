# VERIFY — core-371-canon-docs

Gates run through `pharn/floor/run-gates.mjs` (the pinned `init` line and `run --next` until finalized, from a node
runner with argv arrays because the pinned shell forms are refused in this isolated worktree), holding the batch's
heavy-slot lock; verdict by `check-verify.mjs --stamp`.

| gate                 | exit |
| -------------------- | ---- |
| `test`               | 0    |
| `validate`           | 0    |
| `lint`               | 0    |
| `format:check`       | 0    |
| `lint:md`            | 0    |
| `instruction-growth` | 0    |
| `reconcile`          | 0    |

Stamp sha256 `1c7d711a19691191243846482da9fe9ce2203b232b5b22c437010ebb94b07764`, fingerprint
`9dab4bb9b728e6894081f6eeff566bfe094ae7bb4fe6e276cc2ab9ac02a9d32a`. Build completeness: every `## Files` path present.

VERIFIED: floor gates PASS

Verifiers: no verifiers registered — floor gates only.

Verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance. No gate reads the corrected sentences for truth.
