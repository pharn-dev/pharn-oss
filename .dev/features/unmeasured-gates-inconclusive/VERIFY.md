# VERIFY — unmeasured-gates-inconclusive

## Iteration 2 — after the GATE-2 fixes (review F1–F3, uncommitted over `1f7fe64`); the current record

**VERIFIED: floor gates PASS** — every gate exited 0 (`check-verify.mjs` exit 0, `failing_gates: []`), the same map
and verdict as iteration 1, so `verify-report.json` is byte-identical.

| Gate                                                                                       | exit |
| ------------------------------------------------------------------------------------------ | ---- |
| `test` (`npm test` — 5327 tests, 5326 pass, 1 skipped, 0 failed; 969 s)                    | 0    |
| `validate`                                                                                 | 0    |
| `lint`                                                                                     | 0    |
| `format:check`                                                                             | 0    |
| `lint:md` (re-run — see below)                                                             | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    |
| `reconcile` (`CLEAN`, 31 reconciled, no escape; the same three `merged` paths)             | 0    |

- **The first `lint:md` of this iteration exited 1**, on a file outside the increment:
  `.pharn/unmeasured-gates-inconclusive/pr-body.md:20` (MD032), the PR body this run had just drafted into git-ignored
  scratch, which markdownlint-cli2 still reaches (`.dev/memory-bank/lessons-learned.md` L61). The verdict over that map
  was `FAIL` (`failing_gates: ["lint:md"]`). The scratch file was fixed (one blank line), `npm run lint:md` was re-run
  alone (exit 0, 1830 files, 0 issues), and the map was re-assembled with the six other exits from this same iteration
  — the tracked tree did not change between them — giving `PASS`. Recorded as an orchestration deviation, not
  re-verified from scratch.
- Load average 15–26 during the suite.

## Iteration 1 — the build (`6fccc52`) merged with `origin/main` `791d205` (6.58.1, #344) as `1f7fe64`

**VERIFIED: floor gates PASS** — every gate below exited 0 (`check-verify.mjs` exit 0, `failing_gates: []`).

| Gate                                                                                       | exit |
| ------------------------------------------------------------------------------------------ | ---- |
| `test` (`npm test` — 5327 tests, 5326 pass, 1 skipped, 0 failed; 796 s)                    | 0    |
| `validate` (`node pharn/floor/validate.mjs .` — GREEN, 37 capabilities)                    | 0    |
| `lint`                                                                                     | 0    |
| `format:check`                                                                             | 0    |
| `lint:md`                                                                                  | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    |
| `reconcile` (`check-bash-reconcile.mjs --base . --require-baseline`)                       | 0    |

- `reconcile`: `CLEAN` over 31 reconciled paths, no escape. Exempted: this feature's `REGRESSION.md` and
  `regression-report.json`. Classified `merged` (the upstream bytes HEAD merged in during the window, 6.52.0):
  `.dev/features/crypto-scanner-redos/PLAN.md`, `pharn/floor/scan-code-crypto.mjs`,
  `pharn/floor/scan-code-crypto.test.mjs`. The checker's own warning names the HEAD move `8fe73d1 → 1f7fe64`.
- The suite ran under a load average of 20–30 from parallel sessions.

## Verifiers

No verifiers registered — floor gates only (`node pharn/floor/count-verifiers.mjs .` →
`{"registered":0,"verifiers":[]}`).

## Orchestration deviation (ADVISORY)

The pinned Step 1 shell (`$?` capture, `printf` assembly) is refused in an isolated worktree, so the same seven gates ran
from one lint-clean node runner under `.pharn/pharn-dev-verify/` (argv arrays, exit codes only), and the map went to
`check-verify.mjs` unchanged. That runner is git-ignored and is removed before the commit.

_verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance._
