# VERIFY — reconcile-state-root (run 2)

Run 2 verifies at HEAD `0b18864b` on the epoch re-anchored at `2026-11-02T16:59:19.246Z`. `SHIP.md` § Re-anchor
record says why. Run 1, at `607d82c2`, failed `test` on 12 failures in the branch's #407 test fixtures; those are now
fixed by `0b18864b`.

## Floor gates (exit codes)

| gate                                                                                       | exit |
| ------------------------------------------------------------------------------------------ | ---- |
| `test` (`npm test`: 6158 tests, 6157 pass, 0 fail, 1 skipped)                              | 0    |
| `validate`                                                                                 | 0    |
| `lint`                                                                                     | 0    |
| `format:check`                                                                             | 0    |
| `lint:md`                                                                                  | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    |
| `reconcile` (`--require-baseline`)                                                         | 0    |

**VERIFIED: floor gates PASS** (`check-verify.mjs` exit 0, `"verdict": "PASS"`, `failing_gates: []`).

## Reconcile

`CLEAN` on epoch `2026-11-02T16:59:19.246Z`:

- 6 paths were reconciled and `escapes` is empty. `merged` and `warnings` are both empty.
- This feature's `REGRESSION.md` and `regression-report.json` were exempted as pipeline artifacts.
- The 6 candidates are the uncommitted control-surface files under `pharn/floor/`, which are compared against HEAD
  on every run. All six are in the anchored plan scope.

## Verifiers

No verifiers registered (`count-verifiers.mjs` → `{"registered":0,"verifiers":[]}`). Floor gates only.

verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance.
