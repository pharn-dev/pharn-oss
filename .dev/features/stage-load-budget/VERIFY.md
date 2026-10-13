# VERIFY — stage-load-budget

Run at HEAD `e401ac0` (this branch's commit `b5760be` with `origin/main` `791d205`, SKILLS_VERSION 6.58.1, merged in).

| gate                                                                                       | exit |
| ------------------------------------------------------------------------------------------ | ---- |
| `test` (`npm test`: 5321 tests, 5320 pass, 0 fail, 1 skipped)                              | 0    |
| `validate` (`node pharn/floor/validate.mjs .`)                                             | 0    |
| `lint`                                                                                     | 0    |
| `format:check`                                                                             | 0    |
| `lint:md`                                                                                  | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    |
| `reconcile` (`check-bash-reconcile.mjs --base . --require-baseline`)                       | 0    |

**VERIFIED: floor gates PASS** (`check-verify.mjs`, exit 0, `failing_gates: []`).

`reconcile` reported `CLEAN`: 12 paths reconciled, no escapes. The two regress artifacts are `exempted`. Five paths are
listed as `merged`: `.dev/features/crypto-scanner-redos/PLAN.md`, `README.md`, `SKILLS_VERSION`,
`pharn/floor/scan-code-crypto.mjs` and `pharn/floor/scan-code-crypto.test.mjs`. Their bytes are exactly the upstream
bytes the merge of `origin/main` (6.58.1, #344) brought in during the window, so they are not this build's writes.

Verifiers: no verifiers registered — floor gates only (`count-verifiers.mjs`: `{"registered":0}`).

Orchestration note (advisory): the pinned Step 1 block uses `$?` captures this isolated worktree's shell refuses, so the
same gate commands ran through a node runner (`.pharn/pharn-dev-verify/run.mjs`, gitignored) with argv arrays, and the
map went to `check-verify.mjs` unchanged.

verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance.
