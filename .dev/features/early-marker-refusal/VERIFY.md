# VERIFY — early-marker-refusal

Gates run through `pharn/floor/run-gates.mjs` (stamp `48f603fd…`), verdict by
`check-verify.mjs --stamp … --feature early-marker-refusal` (exit 0).

| gate                 | exit |
| -------------------- | ---- |
| `test`               | 0    |
| `validate`           | 0    |
| `lint`               | 0    |
| `format:check`       | 0    |
| `lint:md`            | 0    |
| `instruction-growth` | 0    |
| `reconcile`          | 0    |

This is the second verify run. The first (stamp `fee6e01f…`) also read PASS. Review then fixed one sentence in
`.claude/commands/pharn-ship-stages.md` and regenerated `pharn-install.json`, so the stage ran again on that tree.
This run's `test` took 1,926 s on a loaded host. Completeness: every concrete `## Files` path present.

**VERIFIED: floor gates PASS.**

Verifiers: no verifiers registered — floor gates only (`count-verifiers.mjs` → `{"registered":0,"verifiers":[]}`).

Verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance.
