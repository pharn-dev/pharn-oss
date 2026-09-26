# VERIFY — stage-verify-script (after GATE 2 fix)

- stage: verify — opus — set by the maintainer's instruction, overriding pharn.config.json; routed via Agent subagent; effort not routed
- head: the working tree of this worktree — the GATE 2 fix plus the re-run regress artifacts, uncommitted, on
  `14fd386`
- The build-round run (head on `557a513` plus the uncommitted build) was also `PASS`; this file and
  `verify-report.json` now record the re-run after the GATE 2 fix. `verify-report.json`'s bytes did not change.

**VERIFIED: floor gates PASS.**

## Per-gate exit codes

| gate           | exit | what ran                                                         |
| -------------- | ---- | ---------------------------------------------------------------- |
| `test`         | 0    | `npm test` — 3549 tests, 3549 pass, 0 fail                       |
| `validate`     | 0    | `node pharn/floor/validate.mjs .` — GREEN, 36 capabilities       |
| `lint`         | 0    | `npm run lint`                                                   |
| `format:check` | 0    | `npm run format:check`                                           |
| `lint:md`      | 0    | `npm run lint:md`                                                |
| `reconcile`    | 0    | `check-bash-reconcile.mjs --base . --require-baseline` — `CLEAN` |

- The verdict: `node pharn/floor/check-verify.mjs .pharn/pharn-dev-verify/results.json --feature stage-verify-script`
  → exit 0, `PASS`, `failing_gates: []`; its fields are in `verify-report.json` verbatim.
- **No `structural:` gate:** this feature adds no capability, so it ships no `(expected, findings.json)` eval pair.
- **`reconcile`:** the epoch anchored at the GATE 2 fix round's Step 0 (`2026-09-26T14:29:53Z`,
  `anchored_by: pharn-dev-build`), after the reviewed tree had reconciled `CLEAN` against the build-round epoch.
  14 paths reconciled, 0 escapes; exempted as this feature's own pipeline artifacts: `BUILD.md`, `REGRESSION.md`,
  `regression-report.json`. `CLEAN` means no escape was detected, never that none occurred (the reconcile contract's
  bounds: git-ignored paths are outside the reconciled set, the window is anchor → reconcile, no attribution).

## Verifiers

no verifiers registered — floor gates only. (`node pharn/floor/count-verifiers.mjs .` → exit 0,
`{"registered":0,"verifiers":[]}`.)

## Orchestration notes (ADVISORY)

- **Deviation, named (as in the build-round run):** this worktree-isolated session refuses the command's pinned
  `<var>=$?` captures and the `printf` results line. A node runner under `.pharn/pharn-dev-verify/` ran the same six
  gates as argv arrays and recorded exit codes only. It was linted first (exit 0), since `eslint .` reads `.pharn/`.
  The gate SET is the command's own.
- Wall time: `test` 114.7 s, `format:check` 17.6 s, `lint:md` 5.7 s, `lint` 2.3 s, `reconcile` 0.6 s.

_verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance._
