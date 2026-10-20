# VERIFY — lessons-canon-root

Run at HEAD `4d51a07` (the branch after merging `origin/main` `dcf7b43`, 6.67.0) plus the GATE-2 review fixes, with the
build epoch anchored at `2026-10-19T20:44:35Z`.

| gate                                                                                       | exit |
| ------------------------------------------------------------------------------------------ | ---- |
| `test` (`npm test`, whole suite)                                                           | 0    |
| `validate`                                                                                 | 0    |
| `lint`                                                                                     | 0    |
| `format:check`                                                                             | 0    |
| `lint:md`                                                                                  | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    |
| `reconcile` (`check-bash-reconcile.mjs --require-baseline`)                                | 0    |

**VERIFIED: floor gates PASS** (`check-verify.mjs` exit 0). `reconcile` was `CLEAN`, with no escapes. It listed this
feature's three stage artifacts as exempt and the files the `origin/main` merge brought in as `merged`.

Verifiers: no verifiers registered — floor gates only (`count-verifiers.mjs` → `{"registered":0,"verifiers":[]}`).

Orchestration deviation (advisory): the pinned `npm test; t=$?` / `printf` forms are refused in this worktree-isolated
session, so the same gates ran from `.pharn/pharn-dev-verify/run.mjs` (argv arrays, exit codes only).

Verified = the named gates passed. This is NOT a guarantee of correctness beyond what those gates check; verifier
concerns are advisory help, not assurance.
