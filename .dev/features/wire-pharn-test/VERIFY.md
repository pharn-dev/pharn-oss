# VERIFY — wire-pharn-test

**VERIFIED: floor gates PASS** (`check-verify.mjs` exit 0, `"PASS"`, `failing_gates: []`), over the map captured in
an environment equivalent to CI. The raw capture failed `format:check` only, on files that all belong to other
sessions' worktrees; both are recorded.

| gate                | raw working tree | clean copy (verdict input) |
| ------------------- | ---------------- | -------------------------- |
| `test`              | 0 (3149/3149)    | 0 (same run)               |
| `validate`          | 0                | 0 (same run)               |
| `lint`              | 0                | 0 (same run)               |
| `format:check`      | **1**            | 0                          |
| `lint:md`           | 0                | 0 (same run)               |
| `structural:…` pair | 0                | 0 (same run)               |
| `reconcile`         | 0 (`CLEAN`)      | 0 (same run)               |

`format:check` raw: every flagged file is under `.claude/worktrees/` (0 outside it), which CI never has. The clean
copy (`rsync` without `.claude/worktrees`, `.git`, `.pharn`, `node_modules` symlinked back, `git init`) exits 0.
`reconcile` ran against the build's anchor (amended once, after the grill re-scope): `CLEAN`.

## Coverage (≥ 90 % of every new or modified `.mjs`)

Measured with `NODE_V8_COVERAGE` over the test process AND every CLI it spawns, merged by the line counter item 01
introduced:

| module                     | line % | note |
| -------------------------- | ------ | ---- |
| `check-test-stage.mjs`     | 97.58  | new  |
| `check-loop-fresh.mjs`     | 99.50  |      |
| `render-ship-briefing.mjs` | 97.45  |      |
| `check-ship-briefing.mjs`  | 96.42  |      |

## Verifiers

No verifiers registered — floor gates only.

_verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance._

## Iteration 2 (after the review fixes)

Raw: `test` 0 (3152/3152), `validate` 0, `lint` 0, `format:check` 1 (0 flagged files outside `.claude/worktrees/`),
`lint:md` 0, the eval pair 0, `reconcile` 0 (`CLEAN`). Clean-copy `format:check` 0 → `check-verify.mjs` **PASS**.
Coverage after the fixes: `check-test-stage.mjs` 97.81 %, `check-loop-fresh.mjs` 99.50 %, `render-ship-briefing.mjs`
97.45 %, `check-ship-briefing.mjs` 96.42 %.
