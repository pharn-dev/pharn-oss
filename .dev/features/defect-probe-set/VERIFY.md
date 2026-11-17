# VERIFY — defect-probe-set

Gates run through `pharn/floor/run-gates.mjs` (one gate per background call), verdict by `pharn/floor/check-verify.mjs
--stamp` (stamp sha256 `75216a52a91888aeb08fbb9bf99837273c47f1b930eceabc6bfbc233f7e6fa9e`).

| gate                 | exit |
| -------------------- | ---- |
| `test`               | 0    |
| `validate`           | 0    |
| `lint`               | 0    |
| `format:check`       | 0    |
| `lint:md`            | 0    |
| `instruction-growth` | 0    |
| `reconcile`          | 0    |

**VERIFIED: floor gates PASS.** Build completeness (`stamp.aux`): every concrete `## Files` path present.

- This is the second run, on the tree with review's fix (the kit's `--model` value is now single-quoted). The first run,
  before the fix, also read PASS (stamp `388d03ee…`). Here `test` took 1,021 s under a host load average of 10–60 from
  other sessions' suites.
- `reconcile`: no path changed since the build's anchor that the write guards would have denied. Its bounds are the
  contract's (`pharn/pharn-contracts/reconciliation-record.md`): no escape detected, never "none occurred".

Verifiers: no verifiers registered — floor gates only.

Verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance.
