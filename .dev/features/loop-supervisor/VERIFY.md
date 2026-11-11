# VERIFY — loop-supervisor

Gates run through `pharn/floor/run-gates.mjs` (stamp `pharn/.run/pharn-dev-verify/gates/stamp.json`, sha256
`1652a20c8c08481d38774c26f4012a1ce253e722f5ed57ae23042c7bdf76ba6b`), one gate at a time; verdict by
`pharn/floor/check-verify.mjs --stamp`.

**Second run.** The first run (stamp `b359d474…`) also read PASS. A local diff-coverage measure before CI then found
seven added lines of `pharn/floor/supervisor.mjs` with no test (98.60% against pharn-ci's 100%): a feature path that is
a file, a missing findings file, and `readSupervision`'s never-throw fallback. Tests for them were added to
`pharn/floor/supervisor.test.mjs` (a declared `## Files` path, under the plan's scope) and nothing else changed; this
table is the re-run over that tree.

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

Build completeness (`stamp.aux.completeness`): every concrete `## Files` path present. `reconcile` ran against the
epoch the build re-anchored after its `## Files` amendment (`PLAN.md`, "Amended during the build").

Verdict: **VERIFIED: floor gates PASS** (`check-verify.mjs` exit 0).

## Verifiers

No verifiers registered — floor gates only.

## Residual

Verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance. The stamp certifies internal consistency, never provenance (P0, L43).
