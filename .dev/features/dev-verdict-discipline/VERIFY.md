# VERIFY — dev-verdict-discipline

**VERIFIED: floor gates PASS** — `node pharn/floor/check-verify.mjs --stamp pharn/.run/pharn-dev-verify/gates/stamp.json
--feature dev-verdict-discipline`, exit 0, over the stamp `run-gates.mjs` wrote (`gate_run.stamp_sha256`
`fedfff85…671837`), on the round-2 build (the GATE 2 "fix" decision: E1–E4, `PLAN.md`). The `test` gate ran the plain
`npm test` token — no `env -u` wrapper — which is the proof that `run-gates.mjs` `gateEnv` now strips the inherited
`PHARN_TEST_RESULTS` itself.

## Gates (round 2, attempt 2 — the verdict)

| gate                 | exit |
| -------------------- | ---: |
| `test`               |    0 |
| `validate`           |    0 |
| `lint`               |    0 |
| `format:check`       |    0 |
| `lint:md`            |    0 |
| `instruction-growth` |    0 |
| `reconcile`          |    0 |

`test`: 6,230 tests, 6,229 passed, 0 failed, 1 skipped, 1,474 s. `reconcile`: `CLEAN`, 9 paths reconciled against the
round-2 epoch (anchored after the round-2 plan commit `91075f57`), no escapes, two exempt pipeline artifacts. Build
completeness (`stamp.aux.completeness`): 0.

## Every earlier attempt, recorded verbatim (each a STOP, none proceeded past)

Round 1 (the first build):

1. **INCONCLUSIVE `gate-not-measured`** — `test` `timed_out: true` at `--timeout-ms 570000`; every other gate exit 0.
   Host load average 50–98.
2. **INCONCLUSIVE `gate-not-measured`** — the same, re-run from `init`; load average up to 140. The cause was the pin,
   not only the load: CI's `Test` step took 586 s (run 41514424884), so a foreground call under the 600 s Bash cap
   cannot hold this suite. Fixed in the command: `run --next` runs in the background with `--timeout-ms 3600000`.
3. **FAIL** — `failing_gates: ["test"]`, measured: one failure, `pharn/floor/run-gates.test.mjs` "spawnGate is
   exported, and resultsFile: null means NO PHARN_TEST_RESULTS variable is set" (the runner's own variable, inherited
   by the suite). Round 1 worked around it with an `env -u` wrapper; round 2 (E1) fixed `gateEnv` and removed it.
4. **PASS** — superseded by round 2's rebuild (stamp `b25686f0…bb73b3`).

Round 2 (after GATE 2 "fix"):

1. **FAIL** — `failing_gates: ["test"]`, measured (not timed out): one failure, `pharn/floor/entry-gates.test.mjs:692`
   "CLI: TAKEOVER — the runner killed mid-gate …" (`5 !== 4`), with the host's load average near 100. Environmental by
   the batch rule: re-run alone, the file read `tests 49, pass 49, fail 0` (load average 37). The same file was the one
   base-side load failure in round 1's regress. The stage was then re-run from `init`; attempt 2 is the verdict above.

The attempts' stamps and test logs are kept in the session scratchpad, not in the repo.

## Verifiers

`node pharn/floor/count-verifiers.mjs .` → `{"registered":0,"verifiers":[]}` — no verifiers registered — floor gates only.

_verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance._
