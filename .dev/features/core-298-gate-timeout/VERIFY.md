# VERIFY — core-298-gate-timeout

Tree: `35e70821` (the build `97d0b5f4`, `origin/main` `302f26f8` and #464's `9a29df8a` merged, then the test fix
`35e70821`). The reconcile epoch was re-anchored by `/pharn-dev-build` Step 0 at `fb738d30`, after both merges.

## Gates (run 2 — the standing verdict)

| gate                 | exit |
| -------------------- | ---- |
| `test`               | 0    |
| `validate`           | 0    |
| `lint`               | 0    |
| `format:check`       | 0    |
| `lint:md`            | 0    |
| `instruction-growth` | 0    |
| `reconcile`          | 0    |

`test`: 7074 pass, 0 fail (796 s; started at load 4). `reconcile`: exit 0, `merged: []`. Completeness: every
concrete `## Files` path present.

**VERIFIED: floor gates PASS** (`check-verify.mjs --stamp`, exit 0; stamp
`f9a79c729fe875cb1f2e11211e61bd21a4d3945627f2531e08514c179bd0568f`).

## Run 1 (recorded, never finalized)

The first verify run after the merges was stopped before its gates ran: the orchestrator reported that a merge made
after the anchor reads as a reconcile escape, so the stage re-anchored (above) and re-ran from `init`. The second
attempt's `test` gate exited 1, with three failures, all in this increment's own test files:

```text
pharn/floor/build-gate.test.mjs: CORE-298 — the budget moves with the declared timeout: two quick gates run in ONE invocation
pharn/floor/stage-regress.test.mjs: every REGISTERED regress reason_code is reachable — the registry and the script agree on the vocabulary size
pharn/floor/stage-verify.test.mjs: ★ CLOSURE — every reason_code literal stage-verify.mjs emits is a registered verify code, and every code has an emitter
```

The two closure tests pin each stage's `unusable` count, and the new `bad-gate-timeout` raised it; the build ran only
the new cases by name, so it missed them. The budget test left only 500 ms of slack, and the first gate took 0.9 s
under load. Both were fixed within `## Files` (`35e70821`: counts 12 and 9; the budget test now leaves 29 s of slack
and still fails an unraised budget). That run was then abandoned unfinalized and the stage re-ran from `init` (run 2,
above). Its log is kept at `pharn/.run/pharn-dev-verify-run1/0-test.out`.

## Verifiers

No verifiers registered — floor gates only (`count-verifiers.mjs`: `{"registered":0,"verifiers":[]}`).

## Deviation (advisory orchestration)

The six fast gates after `test` were drained by one background call that looped `run --next`, not one Bash call
each. They are the runner's own calls, in order, each recorded in the stamp.

_Verified = the named gates passed. This is NOT a guarantee of correctness beyond what those gates check; verifier
concerns are advisory help, not assurance._
