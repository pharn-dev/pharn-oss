# VERIFY — drift-audit-6-4-1

**Feature:** `drift-audit-6-4-1`. The machine report is `verify-report.json`: the helper's `feature`, `gates`, `verdict` and `failing_gates` verbatim (compared field by field), with the advisory `verifiers` block appended after the verdict was computed.

## Gates (exit codes, run in the live tree with the feature present)

| gate                                                                                       | exit |
| ------------------------------------------------------------------------------------------ | ---- |
| `test` — `npm test`                                                                        | 0    |
| `validate` — `node pharn/floor/validate.mjs .`                                             | 0    |
| `lint` — `npm run lint`                                                                    | 0    |
| `format:check` — `npm run format:check`                                                    | 0    |
| `lint:md` — `npm run lint:md`                                                              | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    |
| `reconcile` — `check-bash-reconcile.mjs --base . --require-baseline`                       | 0    |

Recorded alongside the exit codes, because a suite that skips still exits 0 (`lessons-learned` L37): `npm test` reported **2169 tests, 2169 pass, 0 fail, 0 cancelled, 0 skipped**. Both eval-pair paths were confirmed readable before their exit code was trusted.

**The `reconcile` record, read rather than inferred.** `verdict: CLEAN`; the epoch is the one `pharn-dev-build` anchored (`2026-09-21T13:16:08.953Z`); `reconciled: 10` changed paths; `escapes: 0`; `warnings: 0`; `exempted: 2`, namely `REGRESSION.md` and `regression-report.json` in this feature's directory, which are pipeline artifacts written by the regress stage under its own scope. The build's anchor also replaced the stale local baseline that had been reporting an ESCAPE before this run; a copy of the replaced epoch is in the session scratchpad and was not edited. `CLEAN` means no escape was **detected** inside the window anchor→now, never that none occurred: the baseline is unauthenticated and the detector is non-adversarial (`pharn/pharn-contracts/reconciliation-record.md`).

## Verifiers (ADVISORY layer)

`node pharn/floor/count-verifiers.mjs .` → `{"registered":0,"verifiers":[]}`. **No verifiers registered — floor gates only.** Nothing was authored speculatively (P7), so no advisory finding was produced and none could have changed the verdict.

## Deterministic verdict

**VERIFIED: floor gates PASS.** `check-verify.mjs` exit `0`, `verdict: "PASS"`, `failing_gates: []`.

## The honest residual

Verified means the named gates passed. This is **not** a guarantee of correctness beyond what those gates check, and verifier concerns would be advisory help, not assurance. For this increment the gap is concrete and worth stating: the corrected and added sentences are prose that no gate reads for truth, so a green verdict here says the files are well-formed, the version bookkeeping agrees, and nothing regressed — not that the new wording is right. The three trusted-doc patches are **not applied** in this tree, so no gate here has judged the patched trusted docs; that check was run once, at the real path, in a clone (`proposed/APPLY.md`, "Verification record"), and it certifies that clone, not the tree the human will commit.
