# VERIFY — lesson-heading-parser

| gate                                                                                       | exit |
| ------------------------------------------------------------------------------------------ | ---- |
| `test` (`npm test`: 6232 tests, 6231 pass, 0 fail, 1 skip)                                 | 0    |
| `validate` (`node pharn/floor/validate.mjs .`)                                             | 0    |
| `lint`                                                                                     | 0    |
| `format:check`                                                                             | 0    |
| `lint:md`                                                                                  | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    |
| `reconcile` (`check-bash-reconcile.mjs --require-baseline`: `CLEAN`, 0 escapes)            | 0    |

`check-verify.mjs` exit 0: **VERIFIED: floor gates PASS.**

Verifiers: no verifiers registered — floor gates only (`count-verifiers.mjs` → `{"registered":0,"verifiers":[]}`).

Host load during the run was very high (load average up to ~290 from parallel batch workers; `npm test` took 47 min);
no gate failed.

_Verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance._
