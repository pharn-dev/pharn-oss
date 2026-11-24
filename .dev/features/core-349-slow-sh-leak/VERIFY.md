# VERIFY — core-349-slow-sh-leak

Gates ran through `pharn/floor/run-gates.mjs` (`init` → seven `run --next`), and the verdict came from
`check-verify.mjs --stamp` (exit 0). The stamp sha256 is `1305d81dcd5b648a4c5173860ec838b3d49fae53528bcb5e4bddae2dae9bf259`.

| gate                 | exit | note                                                  |
| -------------------- | ---- | ----------------------------------------------------- |
| `test`               | 0    | `npm test`, 934 s (1-min load average 27–34 at start) |
| `validate`           | 0    |                                                       |
| `lint`               | 0    |                                                       |
| `format:check`       | 0    |                                                       |
| `lint:md`            | 0    |                                                       |
| `instruction-growth` | 0    |                                                       |
| `reconcile`          | 0    | no escape detected since the build's anchor           |

Build completeness: both `## Files` paths are present.

**VERIFIED: floor gates PASS.**

Extra observation (not a gate): after the 934 s `npm test` run, which includes the changed Kill test, no new
`sh slow.sh` process appeared. The 13 orphans alive on the machine were all 2–5 h old, from other agents' earlier runs
of the old test, with cwd in deleted `$TMPDIR/sv-*` fixtures.

Verifiers: no verifiers registered — floor gates only (`count-verifiers.mjs`: `{"registered":0}`).

Verified means the named gates passed. It is not a guarantee of correctness beyond what those gates check.
Verifier concerns are advisory help, not assurance.
