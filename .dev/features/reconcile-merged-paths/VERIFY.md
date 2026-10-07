# VERIFY — reconcile-merged-paths

| Gate                                                                                       | Exit |
| ------------------------------------------------------------------------------------------ | ---- |
| `test` (`npm test`, the whole hermetic suite including this feature's tests)               | 0    |
| `validate`                                                                                 | 0    |
| `lint`                                                                                     | 0    |
| `format:check`                                                                             | 0    |
| `lint:md`                                                                                  | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    |
| `reconcile` (`check-bash-reconcile.mjs --require-baseline`, run last)                      | 0    |

**VERIFIED: floor gates PASS** (`check-verify.mjs` exit 0, `failing_gates: []`).

`reconcile` read `CLEAN`. Twelve paths were reconciled, and all of them are authorized by the build's recorded
scopes (the opening snapshot plus three `--amend-scope` amendments, made after `## Files` grew at build time).
Three of this feature's pipeline artifacts were exempted, `merged: []`, and there were no warnings. HEAD did not
move in this window, so the new classification had nothing to classify. Its behaviour is pinned by the feature's
tests, not by this run.

**Re-run after the GATE-2 fixes (A1 and A2):** every gate exited 0 again and the verdict is still PASS, with the
same gate map. `reconcile` read `CLEAN` with `merged: []`, and the exempted set now holds this feature's seven
pipeline artifacts.

Verifiers: no verifiers registered — floor gates only.

Verified means the named gates passed. It is not a guarantee of correctness beyond what those gates check;
verifier concerns are advisory help, not assurance.

Orchestration note: the gates ran through a scratch node runner under `.pharn/c1/`, because the isolated worktree
refuses shell-variable capture. The runner used the command's gate set and order, with `reconcile` last.
