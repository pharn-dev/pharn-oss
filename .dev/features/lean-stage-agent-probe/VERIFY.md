# VERIFY — lean-stage-agent-probe

The gates ran through `pharn/floor/run-gates.mjs` (`init`, then one `run --next` call per gate in the background).
`check-verify.mjs --stamp` produced the verdict below.

| Gate                 | Exit |
| -------------------- | ---: |
| `test`               |    0 |
| `validate`           |    0 |
| `lint`               |    0 |
| `format:check`       |    0 |
| `lint:md`            |    0 |
| `instruction-growth` |    0 |
| `reconcile`          |    0 |

- `test` took 636.5 s.
- `reconcile` read `CLEAN`, with no escapes. Regress's two artifacts are exempt as pipeline artifacts.
- Completeness reads `complete`: all 7 declared `## Files` paths are present.
- Stamp `sha256` `8d948068…`.

**VERIFIED: floor gates PASS.**

Verifiers: no verifiers registered (`count-verifiers.mjs` → `registered: 0`), so only the floor gates apply.

Verified means the named gates passed. It is not a guarantee of correctness beyond what those gates check, and
verifier concerns would be advisory help, not assurance.
