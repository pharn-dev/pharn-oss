# VERIFY — install-manifest

Second run (2026-11-17), on the tree revised after GATE 2 (`PLAN.md`, "Revision after GATE 2"). The first run, on the
tree before the revision, was also PASS (stamp sha256 `882b364b…99d5e`).

Gates measured by `pharn/floor/run-gates.mjs` (stamp `pharn/.run/pharn-dev-verify/gates/stamp.json`, sha256
`60f3714f…4b9c0`), verdict by `pharn/floor/check-verify.mjs --stamp` (exit 0).

| Gate                 | Exit |
| -------------------- | ---- |
| `test` (`npm test`)  | 0    |
| `validate`           | 0    |
| `lint`               | 0    |
| `format:check`       | 0    |
| `lint:md`            | 0    |
| `eval:trust-fence`   | 0    |
| `instruction-growth` | 0    |
| `reconcile`          | 0    |

Build completeness: every concrete `## Files` path of `PLAN.md` is present (verdict not `INCOMPLETE`).

**VERIFIED: floor gates PASS.**

The `eval:trust-fence` gate is the repository's one committed eval pair; this feature ships no eval pair of its own, and
running the pair is harmless. The `test` gate took 795 s (1,241 s in the first run, under a load average of 80 to 110).
An earlier, separate `npm run check` under a heavier load (100 to 370) had one red, the timing-dependent
`entry-gates.test.mjs` "CLI cache (AC3)" test, which also failed at the regress base and passed when run alone; both
verify runs measured it green.

Verifiers: no verifiers registered — floor gates only (`count-verifiers.mjs`: `{"registered":0,"verifiers":[]}`).

Verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance.
