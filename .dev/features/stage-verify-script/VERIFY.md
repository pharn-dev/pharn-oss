# VERIFY — stage-verify-script

- stage: verify — opus — set by the maintainer's instruction, overriding pharn.config.json; routed via Agent subagent; effort not routed
- head: the working tree of this worktree (the build plus the regress artifacts, uncommitted, on `557a513`)

**VERIFIED: floor gates PASS.**

## Per-gate exit codes

| gate           | exit | what ran                                                         |
| -------------- | ---- | ---------------------------------------------------------------- |
| `test`         | 0    | `npm test` — 3546 tests, 3546 pass, 0 fail                       |
| `validate`     | 0    | `node pharn/floor/validate.mjs .` — GREEN, 36 capabilities       |
| `lint`         | 0    | `npm run lint`                                                   |
| `format:check` | 0    | `npm run format:check`                                           |
| `lint:md`      | 0    | `npm run lint:md`                                                |
| `reconcile`    | 0    | `check-bash-reconcile.mjs --base . --require-baseline` — `CLEAN` |

- The verdict: `node pharn/floor/check-verify.mjs .pharn/pharn-dev-verify/results.json --feature stage-verify-script`
  → exit 0, `PASS`, `failing_gates: []`; its fields are in `verify-report.json` verbatim.
- **No `structural:` gate:** this feature adds no capability, so it ships no `(expected, findings.json)` eval pair.
- **`reconcile`:** the epoch anchored at this build's Step 0 (`2026-09-26T12:42:34Z`, `anchored_by: pharn-dev-build`);
  32 paths reconciled, 0 escapes; exempted as this feature's own pipeline artifacts: `BUILD.md`, `REGRESSION.md`,
  `regression-report.json`. `CLEAN` means no escape was detected, never that none occurred (the reconcile contract's
  bounds: git-ignored paths are outside the reconciled set, the window is anchor → reconcile, no attribution).

## Verifiers

no verifiers registered — floor gates only. (`node pharn/floor/count-verifiers.mjs .` → exit 0,
`{"registered":0,"verifiers":[]}`.)

## Orchestration notes (ADVISORY)

- **Deviation, named:** this worktree-isolated session refuses the command's pinned `<var>=$?` captures and the
  `printf` results line. A node runner under `.pharn/pharn-dev-verify/` ran the same six gates as argv arrays and
  recorded exit codes only (linted first, exit 0, since `eslint .` reads `.pharn/`). The gate SET is the command's own.
- Wall time: `test` 152.2 s, `format:check` 19.1 s, `lint:md` 5.6 s, `lint` 3.0 s, `reconcile` 1.0 s.

_verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance._
