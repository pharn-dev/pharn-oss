# VERIFY — pharn-test-stage

**VERIFIED: floor gates PASS** (`check-verify.mjs` exit 0, `"PASS"`, `failing_gates: []`), over the map captured in
an environment equivalent to CI. The raw capture failed `format:check` only, on files that all belong to other
sessions' worktrees; both are recorded.

| gate                | raw working tree | clean copy (verdict input) |
| ------------------- | ---------------- | -------------------------- |
| `test`              | 0 (3038/3038)    | 0 (same run)               |
| `validate`          | 0                | 0 (same run)               |
| `lint`              | 0                | 0 (same run)               |
| `format:check`      | **1**            | 0                          |
| `lint:md`           | 0                | 0 (same run)               |
| `structural:…` pair | 0                | 0 (same run)               |
| `reconcile`         | 0 (`CLEAN`)      | 0 (same run)               |

`format:check` raw: every flagged file is under `.claude/worktrees/` (0 outside it), which CI never has. The clean
copy (`rsync` without `.claude/worktrees`, `.git`, `.pharn`, `node_modules` symlinked back, `git init`) exits 0.

## Coverage (≥ 90 % of every new or modified `.mjs`)

Measured with `NODE_V8_COVERAGE` over the test process AND every CLI it spawns, merged by the line counter item 01
introduced (a code line counts when the innermost V8 range at its first non-blank character ran in any process):

| module                     | line % |
| -------------------------- | ------ |
| `check-ac-tests.mjs`       | 98.49  |
| `ac-tests-lock.mjs`        | 98.27  |
| `spec-template-core.mjs`   | 100.00 |
| `plan-files-core.mjs`      | 100.00 |
| `check-model-config.mjs`   | 91.81  |
| `worktree-fingerprint.mjs` | 100.00 |
| `check-regress.mjs`        | 95.14  |

## Verifiers

No verifiers registered — floor gates only.

_verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance._

## Iteration 2 (after the review fixes)

Raw: `test` 0 (3044/3044), `validate` 0, `lint` 0, `format:check` 1 (0 flagged files outside `.claude/worktrees/`),
`lint:md` 0, the eval pair 0, `reconcile` 0 (`CLEAN`). A first iteration-2 capture had `lint:md` 1 — one
space-in-code-span in this feature's own PLAN.md, fixed and re-captured; nothing outside the feature was involved.
Clean-copy `format:check` 0 → `check-verify.mjs` **PASS** (clean map), FAIL over the raw one (`format:check` only).

Coverage after the fixes (`NODE_V8_COVERAGE`, test process + spawned CLIs): `check-ac-tests.mjs` 98.76 %,
`ac-tests-lock.mjs` 97.04 %, `spec-template-core.mjs` 100 %, `plan-files-core.mjs` 100 %, `check-model-config.mjs`
91.81 %.
