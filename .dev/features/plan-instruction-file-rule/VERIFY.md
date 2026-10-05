# VERIFY — plan-instruction-file-rule

## Floor gates (exit codes)

| gate                                                                                        | exit |
| ------------------------------------------------------------------------------------------- | ---: |
| `test` (`npm test`, the whole hermetic suite including the new `INSTRUCTION_FILE_RULE` pin) |    0 |
| `validate`                                                                                  |    0 |
| `lint`                                                                                      |    0 |
| `format:check`                                                                              |    0 |
| `lint:md`                                                                                   |    0 |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json`  |    0 |
| `reconcile` (`check-bash-reconcile.mjs --require-baseline`, run last)                       |    0 |

**VERIFIED: floor gates PASS.** `check-verify.mjs`, exit 0, `failing_gates: []`. `reconcile` is `CLEAN`: no escapes,
5 paths reconciled against the build's epoch, and `BUILD.md` exempted as a pipeline artifact.

## Verifiers (advisory)

No verifiers registered (`count-verifiers.mjs` → `{"registered":0}`), so the floor gates are the only layer.

## Orchestration notes (advisory)

- **The gates ran through `.pharn/pharn-dev-verify/run.mjs`, as argv arrays.** The worktree guard refuses the pinned
  `$?` / `printf` capture. The runner covers the same gate set, in the same order, with `reconcile` last.
- **A human `LIMITS.md` §3e edit was reverted before this run.** It landed after the build's anchor, and a reconcile
  preview reported it as an escape (`denied_by: protect-trusted-paths.cjs`). The human reverted it before verify,
  and this run's reconcile is `CLEAN`. The human re-adds §3e after GATE 2. No baseline was edited or re-anchored.

Verified means the named gates passed. It is not a guarantee of correctness beyond what those gates check. Verifier
concerns would be advisory help, not assurance.
