# VERIFY — plan-scope-hardening

- HEAD: `c1027aa3` (branch `fix/plan-scope-hardening`), plus the untracked regress artifacts
- Verdict source: `pharn/floor/check-verify.mjs pharn/.run/pharn-dev-verify/results.json --feature plan-scope-hardening`
  (deterministic; exit `0`)

## FLOOR layer — gate → exit code

| Gate                                                                                       | exit |
| ------------------------------------------------------------------------------------------ | ---- |
| `test` (`npm test`, whole repo)                                                            | 0    |
| `validate` (`node pharn/floor/validate.mjs .`)                                             | 0    |
| `lint` (`npm run lint`)                                                                    | 0    |
| `format:check` (`npm run format:check`, whole repo)                                        | 0    |
| `lint:md` (`npm run lint:md`, whole repo)                                                  | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    |
| `reconcile` (`check-bash-reconcile.mjs --base . --require-baseline`)                       | 0    |

`reconcile` read the epoch `/pharn-dev-build` anchored at `2026-11-03T16:32:42.993Z` — after the maintainer's hook
commit `df3f5620`, as L68 requires: verdict `CLEAN`, 5 paths reconciled, `escapes: []`, `merged: []`, `warnings: []`;
exempted (pipeline artifacts): this feature's `REGRESSION.md`, `regression-report.json` and `PLAN.md`. A `CLEAN`
means no escape was detected in the anchor→verify window, never that none occurred
(`pharn/pharn-contracts/reconciliation-record.md`).

The structural gate's pair is `pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` ↔
`.dev/features/trust-fence/findings.json`; this feature ships no eval pair of its own (it adds no capability). Its own
correctness signal is its tests, collected by `npm test`: the 7.3.0 setter matrix and ✧ pins in
`.claude/hooks/set-writes-scope.test.cjs`, the reader and ★ parity fixtures in `pharn/floor/check-build-complete.test.mjs`,
`render-ship-briefing.test.mjs`, `apply-plan-deletions.test.mjs`, and the Step 2b pins in
`.dev/floor/command-hygiene.test.mjs`.

**VERIFIED: floor gates PASS.**

## ADVISORY layer — verifiers

no verifiers registered — floor gates only (`node pharn/floor/count-verifiers.mjs .` →
`{"registered":0,"verifiers":[]}`).

## Residual

_verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance._ One gap the gates do not cover was found afterwards, by the review's own
probe — a scope entry whose parent directory is a symlink into canon still reaches Step 2b's formatters; it is
recorded in `REVIEW.md`, not here, and it does not change this verdict.

Note: `npm test` took 1528 s under host load (several other worktrees ran the suite concurrently); no test failed.
The gate lines were run one by one through a node runner holding the pinned commands, because the isolated worktree
refuses the compound shell block typed directly.
