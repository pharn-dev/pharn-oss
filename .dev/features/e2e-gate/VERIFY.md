# VERIFY — e2e-gate

**VERIFIED: floor gates PASS** (`check-verify.mjs` exit 0, `"PASS"`, `failing_gates: []`), over the map captured in
an environment equivalent to CI. The raw working-tree capture failed `format:check` only, on files that all belong
to other sessions' worktrees; both captures are recorded.

| gate                | raw working tree | clean copy (verdict input) |
| ------------------- | ---------------- | -------------------------- |
| `test`              | 0 (3004/3004)    | 0 (same run)               |
| `validate`          | 0                | 0 (same run)               |
| `lint`              | 0                | 0 (same run)               |
| `format:check`      | **1**            | 0                          |
| `lint:md`           | 0                | 0 (same run)               |
| `structural:…` pair | 0                | 0 (same run)               |
| `reconcile`         | 0 (`CLEAN`)      | 0 (same run)               |

`format:check` raw: every flagged file is under `.claude/worktrees/` (0 outside it), a directory CI never has. The
clean copy is the tree `rsync`ed without `.claude/worktrees`, `.git`, `.pharn` and `node_modules` (symlinked back),
then `git init`; `prettier --check .` there exits 0. `check-verify.mjs` over the raw map is `FAIL`
(`format:check`), over the clean map `PASS`, which is `verify-report.json`.

## Coverage (≥ 90 % of every new or modified `.mjs`)

`gate-run-core.mjs` 99.66 %, `test-results-core.mjs` 99.21 % (`node --test --experimental-test-coverage`,
in-process). No `.mjs` executed only as a CLI changed in this increment (`run-gates.mjs` is untouched; its new
tests exercise it as before).

## Verifiers

No verifiers registered — floor gates only.

_verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance._

## Iteration 2 (after the review fixes)

Every gate re-run on the fixed tree. Raw: `test` 0 (3006/3006), `validate` 0, `lint` 0, `format:check` 1 (0 flagged
files outside `.claude/worktrees/`), `lint:md` 0, the eval pair 0, `reconcile` 0 (`CLEAN`, no escapes). Clean-copy
`format:check` 0 → `check-verify.mjs` **PASS** over the clean map (FAIL over the raw one, `format:check` only).

Coverage: `gate-run-core.mjs` 99.67 %, `test-results-core.mjs` 99.21 % (in-process); `run-gates.mjs`, now modified
(`init` prints `e2e_excluded`), 93.71 % over 173 spawned processes (`NODE_V8_COVERAGE`, the item-01 line counter:
a code line counts when the innermost V8 range at its first non-blank character ran in any process).
