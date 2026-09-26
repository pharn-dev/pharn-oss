# VERIFY — stage-regress-script

**Re-run note.** This stage ran twice. Between the first run and this one, the build stage completed a
deferred comment-only fix to `pharn/floor/gate-run-core.mjs` (see `BUILD.md`, "Re-runs") and `/pharn-dev-regress`
was re-run in full over the corrected tree (see `REGRESSION.md`). All seven gates below were re-captured
fresh over the final tree; every one stayed green across both runs.

## Gate table

| gate                                                                 | exit |
| -------------------------------------------------------------------- | ---- |
| `test` (`npm test`, 3428 tests)                                      | 0    |
| `validate` (`node pharn/floor/validate.mjs .`)                       | 0    |
| `lint` (`npm run lint`)                                              | 0    |
| `format:check` (`npm run format:check`)                              | 0    |
| `lint:md` (`npm run lint:md`)                                        | 0    |
| `structural:…/expected-injection-comment.json`                       | 0    |
| `reconcile` (`check-bash-reconcile.mjs --base . --require-baseline`) | 0    |

## Verdict

**VERIFIED: floor gates PASS.**

`failing_gates`: none.

## Verifiers

No verifiers registered — floor gates only. `node pharn/floor/count-verifiers.mjs .` →
`{"registered":0,"verifiers":[]}`.

## Reconcile detail

`check-bash-reconcile.mjs` reports `"verdict": "CLEAN"` against the `/pharn-dev-build` Step-0 anchor: 28
paths reconciled, 0 escapes. This feature's own pipeline artifacts (`BUILD.md`, `REGRESSION.md`,
`regression-report.json`) are exempted by name, as designed — none is a Bash-write escape.

---

**verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates
check — verifier concerns are advisory help, not assurance.**
