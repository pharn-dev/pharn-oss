# VERIFY — entry-gates-ledger-row

Run at HEAD `6aa4f59` with the increment in the working tree. Each gate's exit code is recorded into
`.pharn/pharn-dev-verify/results.json`, and the verdict is `pharn/floor/check-verify.mjs` (exit 0).

| Gate                                                                                       | Exit |
| ------------------------------------------------------------------------------------------ | ---- |
| `test` (`npm test` — 5015 tests, 5015 pass)                                                | 0    |
| `validate` (`node pharn/floor/validate.mjs .` — GREEN, 37 capabilities)                    | 0    |
| `lint`                                                                                     | 0    |
| `format:check`                                                                             | 0    |
| `lint:md`                                                                                  | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    |
| `reconcile` (`check-bash-reconcile.mjs --require-baseline`: CLEAN, no escapes)             | 0    |

**VERIFIED: floor gates PASS.**

Verifiers: `count-verifiers.mjs` reports 0 registered — floor gates only.

Note (advisory orchestration): before this run, a gitignored scratch file a previous session left at
`.pharn/pr-body.md` (the merged #320's PR body) was moved out of the repository into this session's scratchpad.
markdownlint reaches gitignored paths (L61), so it would have reddened `lint:md` locally on a file no PR contains.

_Verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance._
