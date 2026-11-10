# VERIFY — s14-gates-exclude-remedy

Gates measured by `pharn/floor/run-gates.mjs` (stamp `01c421eac6e39421a33ea55f23a80030357471df068451ce6a7b4cdca37c9c86`,
fingerprint `worktree-fingerprint/3+sha256` `ca6d3f32a72466e4345e6ce7226a8ad1b2273f43cd1ceb86fbb39c4149880ab6`);
verdict from `pharn/floor/check-verify.mjs --stamp` (exit 0). This is the third verify run.

## Run history

1. Before GATE 2: **PASS** (stamp `84ba152c…`).
2. After the GATE-2 S14b fix: **FAIL**, `failing_gates: ["test"]`: 6474 passed, 1 failed:
   `check-ship-record.test.mjs` P5, which read this feature's new `SHIP.md` as an unexpected verdict block. The
   human widened the plan to fix that test (`PLAN.md`, "Widened at GATE 2").
3. After the test fix: **PASS**, shown below.

## Gates (run 3)

| gate                 | exit |
| -------------------- | ---- |
| `test`               | 0    |
| `validate`           | 0    |
| `lint`               | 0    |
| `format:check`       | 0    |
| `lint:md`            | 0    |
| `instruction-growth` | 0    |
| `reconcile`          | 0    |

**VERIFIED: floor gates PASS.**

Build completeness: every concrete `## Files` path is present (no INCOMPLETE).

Verifiers: no verifiers registered — floor gates only.

Verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance.
