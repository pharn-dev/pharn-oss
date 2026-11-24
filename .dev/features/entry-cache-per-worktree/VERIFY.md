# VERIFY — entry-cache-per-worktree

Gates run through `pharn/floor/run-gates.mjs` (stage `verify`, explicit set plus the one committed eval pair); verdict
by `pharn/floor/check-verify.mjs --stamp` (exit 0). Stamp sha256 `ec268974…fe841c`, fingerprint
`worktree-fingerprint/3+sha256` `633ed13a…5b41b59`.

| gate               | exit |
| ------------------ | ---- |
| test               | 0    |
| validate           | 0    |
| lint               | 0    |
| format:check       | 0    |
| lint:md            | 0    |
| eval:trust-fence   | 0    |
| instruction-growth | 0    |
| reconcile          | 0    |

`test` took 976 s. `reconcile`: `CLEAN`, 11 paths reconciled against the build's anchor (`2026-11-24T19:36:44.819Z`),
no escapes; `REGRESSION.md` and `regression-report.json` exempted as pipeline artifacts. Build completeness: every
`## Files` path present.

**VERIFIED: floor gates PASS.**

Verifiers: no verifiers registered — floor gates only (`count-verifiers.mjs`: 0).

Verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance.
