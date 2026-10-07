# VERIFY — regress-base-integrity

**VERIFIED: floor gates PASS** (`check-verify.mjs` exit 0, `failing_gates: []`).

| gate                                                                                       | exit |
| ------------------------------------------------------------------------------------------ | ---- |
| `test` (`npm test` — 5154 tests, 5154 pass, 0 fail)                                        | 0    |
| `validate` (`node pharn/floor/validate.mjs .` — FLOOR GREEN, 37 capabilities)              | 0    |
| `lint`                                                                                     | 0    |
| `format:check`                                                                             | 0    |
| `lint:md`                                                                                  | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    |
| `reconcile` (`check-bash-reconcile.mjs --require-baseline`)                                | 0    |

`reconcile`: `CLEAN` over 30 reconciled paths since the build's anchor (four scope amendments recorded: the build's
re-set after the `isConcrete` import fix, the widening for `instruction-files.mjs`, and the regress/verify artifact
scopes). No escape detected — which is not a claim that none occurred (`reconciliation-record.md`'s bounds). Two of
this run's in-scope edits went through Bash rather than the Write/Edit tools (a line-reference fix in `GRILL.md` and
the two reason codes added to `gate-run-core.mjs`); both paths were inside the active scope, so the guards would have
allowed them and reconcile agrees.

Verifiers: none registered (`count-verifiers.mjs`: 0) — floor gates only.

_Verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance._
