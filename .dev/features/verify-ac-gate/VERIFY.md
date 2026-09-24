# VERIFY — verify-ac-gate

**VERIFIED: floor gates PASS** (`check-verify.mjs` exit 0, `"PASS"`, `failing_gates: []`) over the map captured in
an environment equivalent to CI. The raw capture failed `format:check` only, on files that all belong to other
sessions' worktrees; both are recorded.

| gate                | raw working tree | clean copy (verdict input) |
| ------------------- | ---------------- | -------------------------- |
| `test`              | 0 (3207/3207)    | 0 (same run)               |
| `validate`          | 0                | 0 (same run)               |
| `lint`              | 0                | 0 (same run)               |
| `format:check`      | **1**            | 0                          |
| `lint:md`           | 0                | 0 (same run)               |
| `structural:…` pair | 0                | 0 (same run)               |
| `reconcile`         | 0 (`CLEAN`)      | 0 (same run)               |

`format:check` raw: every flagged file is under `.claude/worktrees/` (0 outside it), which CI never has. The clean
copy (`rsync` without `.claude/worktrees`, `.git`, `.pharn`, `node_modules` symlinked back, `git init`) exits 0.
`reconcile` ran against the build's anchor, whose scope was amended three times (twice after plan amendments, once
after the review pass added `check-test-stage.mjs`), each immediately after the setter: `CLEAN`.

The other chain gates, run individually: `docs:check`, `check:markers`, `check:badge`, `check:changelog`,
`check:contributing`, `check:reconcile` — all exit 0. `check:changelog-entry --base-ref c06ba64` — GREEN.

## Coverage (≥ 90 % of every new or modified `.mjs`)

Measured with `NODE_V8_COVERAGE` over the test processes AND every CLI they spawn, merged by the line counter item
01 introduced:

| module                   | line % | note |
| ------------------------ | ------ | ---- |
| `ac-gate-core.mjs`       | 99.65  | new  |
| `test-infra-core.mjs`    | 97.04  | new  |
| `ac-tests-lock.mjs`      | 97.70  |      |
| `check-verify.mjs`       | 99.10  |      |
| `check-loop.mjs`         | 96.60  |      |
| `check-loop-fresh.mjs`   | 99.18  |      |
| `check-test-stage.mjs`   | 96.73  |      |
| `red-run-core.mjs`       | 99.46  |      |
| `check-ac-tests.mjs`     | 98.56  |      |
| `gate-run-core.mjs`      | 99.02  |      |
| `render-run-report.mjs`  | 99.37  |      |
| `spec-template-core.mjs` | 100.00 |      |

## Verifiers

No verifiers registered — floor gates only.

_verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check._
