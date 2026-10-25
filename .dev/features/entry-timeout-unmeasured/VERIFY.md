# VERIFY — entry-timeout-unmeasured

## Run 2 — the GATE 2 fix iteration (current; `verify-report.json` is this run's verdict)

Run at the working tree on `fix/entry-timeout-unmeasured` (HEAD `a9e437ba`, the merge of `origin/main` `30968218`,
plus the fix iteration's uncommitted changes), the pinned gate set run through a node runner with argv arrays (630 s),
exit codes only.

| gate                                                                                       | exit |
| ------------------------------------------------------------------------------------------ | ---: |
| `test` (`npm test`: 5,978 tests, 5,977 pass, 0 fail, 1 skipped)                            |    0 |
| `validate` (`pharn/floor/validate.mjs .`, 37 capabilities)                                 |    0 |
| `lint`                                                                                     |    0 |
| `format:check`                                                                             |    0 |
| `lint:md`                                                                                  |    0 |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` |    0 |
| `reconcile` (`check-bash-reconcile.mjs --require-baseline`)                                |    0 |

`reconcile`: `CLEAN` over the re-anchored epoch (anchored by `pharn-dev-build` after the two merges of `origin/main`), 14
paths reconciled, no escapes, no `merged` paths; `BUILD.md`, `REGRESSION.md` and `regression-report.json` exempted as
this feature's stage artifacts.

**VERIFIED: floor gates PASS** (`check-verify.mjs` exit 0, `failing_gates` `[]`).

Verifiers: no verifiers registered — floor gates only (`count-verifiers.mjs` → `{"registered":0}`).

## Run 1 — the first build

HEAD `60d713a9` plus the build's changes, 934 s: every gate 0 (`npm test` 5,965 tests, 5,964 pass, 0 fail, 1 skipped);
`reconcile` `CLEAN`, 10 paths, no escapes. `PASS`.

Verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance.
