# VERIFY — loop-replan-rounds

Gates run through `pharn/floor/run-gates.mjs` (stamp `pharn/.run/pharn-dev-verify/gates/stamp.json`, sha256
`2017445d59cbb0ce651fc60d1c5d0234ccdb22d56a50f4b137cb4b79f3d4d9ee`), one gate at a time; verdict by
`pharn/floor/check-verify.mjs --stamp`.

**Second run.** The first run (stamp `1633c433…`) also read PASS. The pull request's pharn-ci diff-coverage gate then
failed at 96.61% against 100%: twelve lines of `pharn/floor/grill-round.mjs` (a feature path that is not a directory,
and the roll-back after a later rename fails) had no test. Three tests were added to `pharn/floor/grill-round.test.mjs`
(a declared `## Files` path, written under the plan's scope) and nothing else changed; this table is the re-run over
that tree.

| gate                 | exit |
| -------------------- | ---- |
| `test`               | 0    |
| `validate`           | 0    |
| `lint`               | 0    |
| `format:check`       | 0    |
| `lint:md`            | 0    |
| `eval:trust-fence`   | 0    |
| `instruction-growth` | 0    |
| `reconcile`          | 0    |

Build completeness (`stamp.aux.completeness`): every concrete `## Files` path present.

Verdict: **VERIFIED: floor gates PASS** (`check-verify.mjs` exit 0).

## Verifiers

No verifiers registered — floor gates only (`count-verifiers.mjs`: `{"registered":0,"verifiers":[]}`).

## Residual

Verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance. The stamp certifies internal consistency, never provenance (P0, L43).
