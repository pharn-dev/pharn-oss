# VERIFY — test-results

**VERIFIED: floor gates PASS** (`check-verify.mjs` exit 0, `"PASS"`, `failing_gates: []`), over the map captured in
an environment equivalent to CI. The raw working-tree capture failed one gate, `format:check`, and every file it
flagged belongs to another session's checkout; both captures are recorded below.

## Per-gate exit codes

| gate                | raw working tree | clean copy (verdict input) |
| ------------------- | ---------------- | -------------------------- |
| `test`              | 0 (2992/2992)    | 0 (same run)               |
| `validate`          | 0                | 0 (same run)               |
| `lint`              | 0                | 0 (same run)               |
| `format:check`      | **1**            | 0                          |
| `lint:md`           | 0                | 0 (same run)               |
| `structural:…` pair | 0                | 0 (same run)               |
| `reconcile`         | 0 (`CLEAN`)      | 0 (same run)               |

**Why `format:check` was re-measured.** Two other Claude sessions keep worktrees under `.claude/worktrees/` in this
checkout. That directory is excluded only through `.git/info/exclude`, so CI never has it, but `prettier --check .`
descends into it: all 93 files the raw run flagged are under `.claude/worktrees/`, and **0** are outside it. The
clean copy is the tree `rsync`ed without `.claude/worktrees`, `.git`, `.pharn` and `node_modules` (symlinked back),
then `git init`; `prettier --check .` there exits 0. Only `format:check` was re-run; every other gate is the raw
run's value. `check-verify.mjs` over the raw map returns `FAIL` (`failing_gates: ["format:check"]`, kept as
`.pharn/pharn-dev-verify/verdict.raw.json`); over the clean map it returns `PASS`, which is `verify-report.json`.

`reconcile`: `CLEAN`, 0 escapes. The fixtures and `run-gates.mjs` edits written through Bash are all inside the
plan's `## Files`, and the epoch's scope was amended at each re-scope (`--amend-scope`, amendments 1–3).

## Coverage (acceptance: ≥ 90 % line coverage of every new or modified `.mjs`)

| module                     | line % | how measured                                                                        |
| -------------------------- | ------ | ----------------------------------------------------------------------------------- |
| `test-results-core.mjs`    | 99.19  | `node --test --experimental-test-coverage`, in-process                              |
| `test-results-formats.mjs` | 100.00 | same                                                                                |
| `gate-run-core.mjs`        | 99.65  | same                                                                                |
| `run-gates.mjs`            | 93.59  | `NODE_V8_COVERAGE` over its 142 spawned processes, merged by a scratch line counter |

`run-gates.mjs` is driven only as a subprocess, so the built-in coverage cannot see it. Its figure comes from the raw
V8 dumps of every process `run-gates.test.mjs` spawned. A code line (blank and comment lines excluded) counts as
covered when the innermost V8 range at its first non-blank character ran in any process. The whole file stood at
88.97 % after the build; four tests for existing refusal paths (`bad-gates`, a malformed or mis-paired
`outside_eval_pairs` entry, an empty `--spec-from` record, a glob-shaped file entry) raised it to 93.59 %. Of the
new code, only the catch branch of a failing `readSync` in `sha256RegularFile` is unreached.

## Verifiers

No verifiers registered — floor gates only (`count-verifiers.mjs` → `{"registered":0}`).

_verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance._

## Iteration 2 (after the review fixes)

Every gate was re-run on the fixed tree. Raw: `test` 0 (2997/2997), `validate` 0, `lint` 0, `format:check` 1 (0 of
the flagged files outside `.claude/worktrees/`), `lint:md` 0, the `structural:…` pair 0, `reconcile` 0 (`CLEAN`, no
escapes). The clean copy's `format:check` is 0, so `check-verify.mjs` returns **PASS** over the clean map (exit 0)
and FAIL over the raw one (exit 1, `format:check` only). `verify-report.json` is the clean-map verdict.

Coverage after the fixes: `test-results-core.mjs` 99.21 %, `test-results-formats.mjs` 100.00 %, `gate-run-core.mjs`
99.65 % (in-process); `run-gates.mjs` 93.58 % over 150 spawned processes (`NODE_V8_COVERAGE`, the same counter).
