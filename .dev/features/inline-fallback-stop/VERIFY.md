# VERIFY — inline-fallback-stop

Gates run through `pharn/floor/run-gates.mjs` (stage `verify`), verdict by `pharn/floor/check-verify.mjs --stamp`.

| gate                 | exit |
| -------------------- | ---: |
| `test`               |    0 |
| `validate`           |    0 |
| `lint`               |    0 |
| `format:check`       |    0 |
| `lint:md`            |    0 |
| `instruction-growth` |    0 |
| `reconcile`          |    0 |

**VERIFIED: floor gates PASS** (`check-verify.mjs` exit 0; stamp sha256 `9b0b9ff2…1dac`). Build completeness: every
concrete `## Files` path present. `reconcile`: `CLEAN`, 11 reconciled, no escapes; exempted this feature's `BUILD.md`,
`REGRESSION.md` and `regression-report.json`.

**Attempt 1, recorded verbatim.** The first `init` → `run --next` ran `test` and it ended `exit 137`, `timed_out: false`
(the process was killed by a signal, not by the runner's timeout). The machine was saturated by other sessions' test
suites at the time (load average 92, about 80 MB of free memory). That is an environmental red. The stage was re-run
from `init` once the load fell (load average 12); attempt 2's `test` exited 0 and every later gate ran in that same
record. Attempt 1's record is kept outside the repository (session scratchpad, `core-105/verify-attempt1/`); its map
was never passed to the checker.

Verifiers: no verifiers registered — floor gates only.

_Verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance._
