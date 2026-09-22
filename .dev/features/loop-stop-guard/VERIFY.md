# VERIFY — loop-stop-guard

| gate                                                                                       | exit |
| ------------------------------------------------------------------------------------------ | ---- |
| `test`                                                                                     | 0    |
| `validate`                                                                                 | 0    |
| `lint`                                                                                     | 0    |
| `format:check`                                                                             | 0    |
| `lint:md`                                                                                  | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    |
| `reconcile`                                                                                | 0    |

**VERIFIED: floor gates PASS** (`check-verify.mjs` exit 0). `npm test` ran 2591 tests, all passing, none
skipped. `reconcile` is `CLEAN`: 11 paths were reconciled and there are 0 escapes.

Also measured, none of it a gate:

- `require-loop-record.cjs` line coverage is 96.54% under `--experimental-test-coverage`.
- The inert path costs ~0.03 ms in-process (median over 200 calls). A spawned run's median is 67 ms,
  against 71 ms for a bare `node -e 0`, so the guard costs node's own startup and nothing measurable
  beyond it.
- With the staged `settings.json` entry applied in a throwaway worktree, the hook suites pass 315/315.

**Iteration 2** (after the GATE-2 fix): all seven gates re-ran, every one exited 0 again, 2591/2591 tests
passed, and `reconcile` is `CLEAN`. The verdict is unchanged, so `verify-report.json` is unchanged.

## Verifiers (advisory)

No verifiers are registered, so only the floor gates ran.

---

Verified means the named gates passed. This is NOT a guarantee of correctness beyond what those gates
check. The guard is also **not wired** by this change: it acts only once a human applies
`settings-patch/APPLY.md`.
