# VERIFY — reconcile-symlink-hash

Verdict source: `pharn/floor/check-verify.mjs .pharn/pharn-dev-verify/results.json --feature reconcile-symlink-hash`,
exit **0**. The machine report is `verify-report.json`. Its floor fields are byte-identical to the helper's
iteration-2 output (compared, not assumed).

## Iteration 2 — the merged tree (6.17.0 + this fix, re-bumped to 6.17.1)

| gate                                                                                       | exit |
| ------------------------------------------------------------------------------------------ | ---- |
| `test` (`npm test`, 3060 tests, 0 failed, 0 skipped on this run)                           | 0    |
| `validate`                                                                                 | 0    |
| `lint`                                                                                     | 0    |
| `format:check`                                                                             | 0    |
| `lint:md`                                                                                  | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    |
| `reconcile` (`check-bash-reconcile.mjs --base . --require-baseline`)                       | 0    |

**The reconciliation, and why it has two epochs.** Iteration 1's epoch was anchored at the build (scope: the plan's
8 paths). Merging `origin/main` is a git write, which no guard sees. It changed 37 paths, and against that epoch
`check-bash-reconcile.mjs` correctly reported **32 escapes**. A set comparison, not a reading, showed that every one
of the 32 is a path in `git diff --name-only 7e9ed52 origin/main`, and that zero escapes fall outside the merge's
changed set. Those files are the already-merged 6.17.0 (#258). The merge was committed, and a fresh epoch was
anchored as a build Step 0 (`--from-plan` scope, then `--anchor --by pharn-dev-build`) before the regress and verify
re-runs. The baseline was never deleted or hand-edited.

Against that epoch, `reconcile` returned `CLEAN`, with 0 paths reconciled, 0 escapes and no warnings. It exempted
this feature's `REGRESSION.md` and `regression-report.json`. Because nothing but those artifacts changed after the
anchor, iteration 2's `reconcile` covers the regress/verify window only. The build's own writes were covered by
iteration 1's `CLEAN` below.

## Iteration 1 — the pre-merge tree (history)

All seven gates exited `0`. `npm test` ran 3022 tests. `reconcile` returned `CLEAN` against the build's epoch, with 8
paths reconciled and 0 escapes. It exempted `REGRESSION.md` and `regression-report.json`. `SKILLS_VERSION` had been
written through Bash (`echo`), and it reconciled as an in-scope change, because the plan declares it.

## How the codes were recorded

A scratch runner (`.pharn/pharn-dev-verify/capture.mjs`, gitignored) runs the Step-1 commands with argv arrays and
writes the map from the recorded statuses, so no value was typed by hand. The pinned shell form, which captures `$?`
into variables, is refused by this session's worktree-isolation guard.

**VERIFIED: floor gates PASS.**

## Verifiers (advisory)

`count-verifiers.mjs` → `{"registered":0,"verifiers":[]}`. No verifiers are registered, so this verdict rests on the
floor gates only.

Verified means the named gates passed. It is NOT a guarantee of correctness beyond what those gates check. Verifier
concerns, when there are any, are advisory help, not assurance.
