# VERIFY — core-371-followups

The gates ran through `pharn/floor/run-gates.mjs` (`init` exit 0, then one `run --next` per gate in the background,
each exit 0, finalized on `reconcile`). The verdict comes from `check-verify.mjs --stamp
pharn/.run/pharn-dev-verify/gates/stamp.json --feature core-371-followups`, exit 0 (stamp sha256
`bca899f96f83bcde579c0e7f52106fe2cbd2d46a9ea94b62216b2c5c7604e9bf`).

| gate                 | exit |
| -------------------- | ---- |
| `test` (`npm test`)  | 0    |
| `validate`           | 0    |
| `lint`               | 0    |
| `format:check`       | 0    |
| `lint:md`            | 0    |
| `instruction-growth` | 0    |
| `reconcile`          | 0    |

`npm test` took 589.7 s. `reconcile` (`6-reconcile.out`) reported `CLEAN`, with 9 paths reconciled against the epoch
anchored by `pharn-dev-build`. `escapes: []` and `merged: []`. Exempted pipeline artifacts: `REGRESSION.md` and
`regression-report.json`. The two human-applied patches and the merge of `origin/main` were committed before the
anchor, so they are outside the window (L68).

Verdict: **VERIFIED: floor gates PASS**.

Verifiers: no verifiers registered — floor gates only (`count-verifiers.mjs`: `{"registered":0,"verifiers":[]}`).

Verified means the named gates passed. This is NOT a guarantee of correctness beyond what those gates check.
Verifier concerns are advisory help, not assurance.
