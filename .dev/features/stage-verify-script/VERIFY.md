# VERIFY — stage-verify-script

Each run is kept, newest first. `verify-report.json` holds the newest run's verdict; its bytes have not changed since
the build round, because every run has read the same six gates at exit 0.

## On final `main` (6.26.0 over 6.25.0)

- stage: verify — opus — set by the maintainer's instruction, overriding pharn.config.json; routed via Agent subagent; effort not routed
- head: the working tree on the merge commit `a470b71` (parents `c989084` and `2e5c2e3`), plus the re-run regress
  artifacts and the untracked `SHIP.md` draft

**VERIFIED: floor gates PASS.**

### Per-gate exit codes

| gate           | exit | what ran                                                         |
| -------------- | ---- | ---------------------------------------------------------------- |
| `test`         | 0    | `npm test` — 3782 tests, 3782 pass, 0 fail                       |
| `validate`     | 0    | `node pharn/floor/validate.mjs .` — GREEN, 36 capabilities       |
| `lint`         | 0    | `npm run lint`                                                   |
| `format:check` | 0    | `npm run format:check`                                           |
| `lint:md`      | 0    | `npm run lint:md`                                                |
| `reconcile`    | 0    | `check-bash-reconcile.mjs --base . --require-baseline` — `CLEAN` |

- The verdict: `node pharn/floor/check-verify.mjs .pharn/pharn-dev-verify/results.json --feature stage-verify-script`
  → exit 0, `PASS`, `failing_gates: []`; its fields are in `verify-report.json` verbatim.
- **No `structural:` gate:** this feature adds no capability, so it ships no `(expected, findings.json)` eval pair.
- **`reconcile`:** the epoch re-opened after the merge commit — the setter from `PLAN.md` (exit 0, 33 paths), then
  `reconcile-baseline.mjs --anchor --by stage-verify-script-final-merge` (exit 0, 2385 paths, scope 33; epoch
  `2026-09-26T21:17:10Z`). 0 paths reconciled, 0 escapes; exempted as this feature's own pipeline artifacts:
  `REGRESSION.md`, `regression-report.json`. `CLEAN` means no escape was detected, never that none occurred (the
  reconcile contract's bounds: git-ignored paths are outside the reconciled set, the window is anchor → reconcile, no
  attribution). The merge itself is a git commit, so it is judged by the diff against `main` in `REGRESSION.md`, not
  here.

### Verifiers

no verifiers registered — floor gates only. (`node pharn/floor/count-verifiers.mjs .` → exit 0,
`{"registered":0,"verifiers":[]}`.)

### Orchestration notes (ADVISORY)

- The same named deviation as below: a node runner under `.pharn/pharn-dev-verify/` (linted first, exit 0) ran the
  command's six gates as argv arrays and recorded exit codes only.
- Wall time: `test` 114.8 s, `format:check` 19.5 s, `lint:md` 6.3 s, `lint` 2.6 s, `reconcile` 0.2 s.
- An intermediate run over the first merge of 3.1 (`c989084`) also read `PASS`, 3759/3759, but its records were never
  committed: they were discarded at the orchestrator's instruction once `main` moved.

## After GATE 2 fix, at 6.24.0 (before the merges)

- head: the GATE 2 fix plus the re-run regress artifacts, uncommitted, on `14fd386`. The build-round run (head on
  `557a513` plus the uncommitted build) was also `PASS`.
- **VERIFIED: floor gates PASS.** Every gate exited 0: `test` (`npm test`, 3549 tests, 3549 pass, 0 fail),
  `validate` (GREEN, 36 capabilities), `lint`, `format:check`, `lint:md`, and `reconcile` — `CLEAN` against the epoch
  anchored at the GATE 2 fix round's Step 0 (`2026-09-26T14:29:53Z`, `anchored_by: pharn-dev-build`, after the
  reviewed tree reconciled `CLEAN` against the build-round epoch): 14 paths reconciled, 0 escapes, `BUILD.md`,
  `REGRESSION.md` and `regression-report.json` exempted. `check-verify.mjs` → exit 0, `PASS`.
- No verifiers registered; no `structural:` gate. A node runner stood in for the command's pinned `<var>=$?`
  captures, which this worktree-isolated session refuses; it recorded exit codes only.
- Wall time: `test` 114.7 s, `format:check` 17.6 s, `lint:md` 5.7 s, `lint` 2.3 s, `reconcile` 0.6 s.

_verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance._
