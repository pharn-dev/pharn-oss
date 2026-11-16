# VERIFY — stage-gate-reap

Gates measured by `pharn/floor/run-gates.mjs` (stamp `pharn/.run/pharn-dev-verify/gates/stamp.json`, sha256
`3684eb79d823d1c68c4f93ee04836ad6ed12d099ab54953563208ca215eb5258`), verdict by `check-verify.mjs --stamp` (exit `0`).
Machine report: `verify-report.json`.

| gate                 | exit | duration |
| -------------------- | ---- | -------- |
| `test`               | 0    | 808.8 s  |
| `validate`           | 0    | 0.2 s    |
| `lint`               | 0    | 15.1 s   |
| `format:check`       | 0    | 112.3 s  |
| `lint:md`            | 0    | 28.9 s   |
| `instruction-growth` | 0    | 0.3 s    |
| `reconcile`          | 0    | 0.6 s    |

Build completeness (`stamp.aux`): every concrete `## Files` path present (the verdict would read INCOMPLETE otherwise).

**VERIFIED: floor gates PASS.**

`reconcile` 0 means no path changed since the build's anchor that the write guards would have denied. Every in-repo
write of this run went through the GATE 1 "script route" helper, which runs both real hooks of this worktree before
writing; that the helper was used is discipline, and `reconcile` is the check that would have caught an escape. A
`CLEAN` means no escape was detected, never that none occurred (`pharn/pharn-contracts/reconciliation-record.md`).

Verifiers: no verifiers registered — floor gates only (`count-verifiers.mjs`: `{"registered":0,"verifiers":[]}`).

Verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance.
