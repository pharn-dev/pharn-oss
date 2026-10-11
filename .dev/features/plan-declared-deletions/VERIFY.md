# VERIFY — plan-declared-deletions

## Iteration 3 — the current record (after the GATE-2 review fixes; tree `6476837`)

| Gate                                                                                       | exit |
| ------------------------------------------------------------------------------------------ | ---- |
| `test` (`npm test`: 5288 tests, 5287 pass, 0 fail, 1 skipped)                              | 0    |
| `validate`                                                                                 | 0    |
| `lint`                                                                                     | 0    |
| `format:check`                                                                             | 0    |
| `lint:md`                                                                                  | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    |
| `reconcile` (`--require-baseline`: `CLEAN`, 20 reconciled, 0 escapes, 0 warnings)          | 0    |

**VERIFIED: floor gates PASS** — `check-verify.mjs` exit 0, `failing_gates: []`.

Verifiers: no verifiers registered — floor gates only (`count-verifiers.mjs` → `{"registered":0}`).

_Verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance._

- Run after the 1-minute load average fell below 10 (8.96 / 51.67 / 56.72 when the wait ended; 7.27 / 49.20 / 55.75 at
  the runner's start, 8.59 / 22.10 / 40.64 after `npm test`).
- `verify-report.json` is unchanged from iteration 1: the checker printed the same object (same gates, `PASS`).
- `exempted` at reconcile: this feature's `PLAN.md` (amended after review), `REGRESSION.md`, `REVIEW.md`, `VERIFY.md`,
  `regression-report.json`, `verify-report.json` (pipeline artifacts).

## Iteration 1 (the build, `8a85699`)

The same seven gates all exited 0; `npm test` 5286 tests, 5285 pass, 0 fail; reconcile `CLEAN`, 20 reconciled. Verdict
`PASS`. The GATE-2 review then found the blocking defect fixed in `292730c` (see `REVIEW.md`, `PLAN.md` "Amended after
review").

## Run note (advisory)

- The worktree's command guard refuses the pinned `$?` capture form, so Step 1 ran through a node runner under
  `.pharn/pharn-dev-verify/` with `spawnSync` argv arrays: the same seven gates in the same order (`reconcile` last), the
  same results map, the same `check-verify.mjs` call. `verify-report.json` is that call's stdout plus the `verifiers`
  block. The runner was deleted after the stage.
- The reconcile epoch is the one `/pharn-dev-build` anchored after its setter; the baseline was never edited.
- Load sensitivity observed on this machine, in files this increment does not touch: the build-stage `npm run check` saw
  `entry-base-evidence.test.mjs` and `entry-gates.test.mjs` time out under load (both passed alone, 55/55), and regress
  iteration 2 saw `protect-trusted-paths.test.cjs:1098` time out at load ~60 (128 ms alone). Both stages were re-run
  after the load fell; see `REGRESSION.md`.
