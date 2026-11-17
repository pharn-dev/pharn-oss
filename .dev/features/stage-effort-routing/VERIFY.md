# VERIFY — stage-effort-routing

- verdict (`pharn/floor/check-verify.mjs --stamp pharn/.run/pharn-dev-verify/gates/stamp.json`, exit 0): **VERIFIED:
  floor gates PASS**
- tree: the regress commit `fad25dbc` on this branch; gate runner `pharn/floor/run-gates.mjs`, one gate per
  background call, `--timeout-ms 3600000`; stamp sha256 `9216c1ec15bc989c9335c5e2939e4262f5058280880474e5032d5abcc37a554c`.
- build completeness (`stamp.aux.completeness`): 0 — every concrete `## Files` path is present.
- stage model: the session's (opus), inline inside `/pharn-dev-ship`.

## Gates

| gate                 | exit |
| -------------------- | ---- |
| `test`               | 0    |
| `validate`           | 0    |
| `lint`               | 0    |
| `format:check`       | 0    |
| `lint:md`            | 0    |
| `instruction-growth` | 0    |
| `reconcile`          | 0    |

`test` ran the whole suite in 1,711 s on a host running several other agents' suites. The test regress saw failing on
both sides (`entry-gates.test.mjs`, "CLI cache (AC3) …") passed in this run. `reconcile` is clean against the
build's anchor: the human-authored `pharn/LIMITS.md` §8 edit was committed before the anchor (L68), and the
type test's header comment edited after regress was written under the plan's own scope.

No eval pair ships with this increment, so there is no `eval:*` gate.

## Verifiers

no verifiers registered — floor gates only (`count-verifiers.mjs`: `{"registered":0,"verifiers":[]}`).

verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance.
