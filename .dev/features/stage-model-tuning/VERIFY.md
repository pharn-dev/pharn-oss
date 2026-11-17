# VERIFY — stage-model-tuning

Gates run through `pharn/floor/run-gates.mjs` (`run --next`, one gate per call, from one background scratch loop),
verdict by `pharn/floor/check-verify.mjs --stamp` (stamp sha256
`c84bc489058988b4054ce5a818f7ad0057176269e25329fb7cb1c884fef64d3e`).

| gate                 | exit |
| -------------------- | ---- |
| `test`               | 0    |
| `validate`           | 0    |
| `lint`               | 0    |
| `format:check`       | 0    |
| `lint:md`            | 0    |
| `instruction-growth` | 0    |
| `reconcile`          | 0    |

**VERIFIED: floor gates PASS.** Build completeness (`stamp.aux`): every concrete `## Files` path present (10 of 10).

- `test` took 929 s on this host. This worktree has no `node_modules` of its own, so the reference probes that need
  markdown-it skip themselves here (`REGRESSION.md` names them); CI runs them with an install.
- `reconcile`: no path changed since the build's anchor that the write guards would have denied. Its bounds are the
  contract's (`pharn/pharn-contracts/reconciliation-record.md`): no escape detected, never "none occurred".
- Orchestration (advisory): the seven `run --next` calls ran from one scratch node loop outside the repository, in the
  background, stopping at `"finalized": true`. Each call is still the runner's own invocation; the map is the runner's.

Verifiers: no verifiers registered — floor gates only.

Verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance.
