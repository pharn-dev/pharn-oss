# VERIFY — reconcile-symlink-hash

Verdict source: `pharn/floor/check-verify.mjs .pharn/pharn-dev-verify/results.json --feature reconcile-symlink-hash`,
exit **0**. The machine report is `verify-report.json`.

## Floor gates (run once at HEAD)

| gate                                                                                       | exit |
| ------------------------------------------------------------------------------------------ | ---- |
| `test` (`npm test`, 3022 tests, 0 failed, 0 skipped on this run)                           | 0    |
| `validate`                                                                                 | 0    |
| `lint`                                                                                     | 0    |
| `format:check`                                                                             | 0    |
| `lint:md`                                                                                  | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    |
| `reconcile` (`check-bash-reconcile.mjs --base . --require-baseline`)                       | 0    |

`reconcile` returned `CLEAN` against the epoch `/pharn-dev-build` anchored (scope: the plan's 8 `## Files` paths),
with 8 paths reconciled, 0 escapes and no warnings. Exempted as this feature's own pipeline artifacts were
`REGRESSION.md` and `regression-report.json`. `SKILLS_VERSION` was written through Bash (`echo`), and it reconciled
as an in-scope change, because the plan declares it.

The exit codes were recorded by a scratch runner (`.pharn/pharn-dev-verify/capture.mjs`, gitignored). It runs the
Step-1 commands with argv arrays and writes the map from the recorded statuses, so no value was typed by hand. The
pinned shell form, which captures `$?` into variables, is refused by this session's worktree-isolation guard.

**VERIFIED: floor gates PASS.**

## Verifiers (advisory)

`count-verifiers.mjs` → `{"registered":0,"verifiers":[]}`. No verifiers registered, so this verdict rests on the
floor gates only.

Verified means the named gates passed. It is NOT a guarantee of correctness beyond what those gates check.
Verifier concerns, when there are any, are advisory help, not assurance.
