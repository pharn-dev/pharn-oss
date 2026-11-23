# VERIFY — core-312-reuse-and-effort-measure

Two verify runs, both through `pharn/floor/run-gates.mjs` with the committed `init` line, each read by
`pharn/floor/check-verify.mjs --stamp`. The second one is the verdict.

## Run 1 — FAIL (environmental), recorded verbatim

| gate                 | exit | duration |
| -------------------- | ---- | -------- |
| `test`               | 0    | 647.8 s  |
| `validate`           | 0    | 0.1 s    |
| `lint`               | 0    | 4.8 s    |
| `format:check`       | 1    | 31.2 s   |
| `lint:md`            | 0    | 12.0 s   |
| `instruction-growth` | 0    | 0.2 s    |
| `reconcile`          | 0    | 0.3 s    |

`check-verify.mjs` exit 1, `"verdict": "FAIL"`, `failing_gates: ["format:check"]`, stamp sha256
`5a5bbf62fe32d8c52ad1d20dd06c83ecd4db31b13b6754e27a623619fc9e100d`.

**Cause:** this worktree had no `node_modules`, so `npx` resolved the main checkout's Prettier 3.9.10, while the
lockfile pins 3.10.1. Under 3.9.10 two files this increment does not touch read as unformatted
(`.dev/features/observability-code-side-limit/LIMITS-5-PROPOSED.md`, `.dev/features/release-workflow/HUMAN-PATCH.md`;
both were reformatted for 3.10.1 in #464). **Fix:** `npm ci` in this worktree (Prettier 3.10.1), then the stage was
re-run from `init`. No file changed between the runs.

## Run 2 — the verdict

| gate                 | exit | duration |
| -------------------- | ---- | -------- |
| `test`               | 0    | 594.4 s  |
| `validate`           | 0    | 0.1 s    |
| `lint`               | 0    | 4.7 s    |
| `format:check`       | 0    | 30.5 s   |
| `lint:md`            | 0    | 11.2 s   |
| `instruction-growth` | 0    | 0.2 s    |
| `reconcile`          | 0    | 0.3 s    |

`check-verify.mjs` exit 0, stamp sha256 `838850ab13dedfa31e49eee88114ba883c530825df41fd0b10ffb04472b5e9b5`. Build
completeness: both `## Files` paths present. `reconcile`: `CLEAN`, 2 paths reconciled, no escapes, exempted this
feature's `REGRESSION.md` and `regression-report.json`. Heavy lock held by CORE-312 for both runs; 1-minute load
average 4 to 7 during run 2.

**VERIFIED: floor gates PASS.**

## Verifiers

No verifiers registered — floor gates only (`count-verifiers.mjs`: `{"registered":0,"verifiers":[]}`).

_Verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance._ For this increment, nothing in the gates checks the record's figures; they
are re-derivable only from the held evidence, by the digests the record lists.
