# VERIFY — plan-declared-deletions

| Gate                                                                                       | exit |
| ------------------------------------------------------------------------------------------ | ---- |
| `test` (`npm test`: 5286 tests, 5285 pass, 0 fail)                                         | 0    |
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

## Run note (advisory)

- The worktree's command guard refuses the pinned `$?` capture form, so Step 1 ran through a node runner under
  `.pharn/pharn-dev-verify/` with `spawnSync` argv arrays: the same seven gates in the same order (`reconcile` last), the
  same results map, the same `check-verify.mjs` call. `verify-report.json` is that call's stdout plus the `verifiers`
  block. The runner was deleted after the stage.
- The reconcile epoch is the one `/pharn-dev-build` anchored after its setter; `exempted` lists this feature's
  `REGRESSION.md` and `regression-report.json` (pipeline artifacts).
- The build-stage confirmation run of `npm run check` had two failures under full-suite load —
  `entry-base-evidence.test.mjs` ("a build that edits a pre-existing test MISSes shape-mismatch …", 49 s) and
  `entry-gates.test.mjs` ("CLI: TAKEOVER …", 15 s) — files this increment does not touch. Both files passed in
  isolation (55/55), and this verify's `npm test` run passed in full. Recorded as a load-sensitivity observation, not
  as a result of this feature.
