# VERIFY — loop-isolation-stop

- verdict (floor, `pharn/floor/check-verify.mjs`, exit 0): **PASS**
- machine report: `verify-report.json` (the helper's JSON plus the verifiers block)

## Floor gates

| gate                                                                                       | exit |
| ------------------------------------------------------------------------------------------ | ---- |
| `test` (`npm test`)                                                                        | 0    |
| `validate` (`node pharn/floor/validate.mjs .`)                                             | 0    |
| `lint`                                                                                     | 0    |
| `format:check`                                                                             | 0    |
| `lint:md`                                                                                  | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    |
| `reconcile` (`check-bash-reconcile.mjs --base . --require-baseline`)                       | 0    |

VERIFIED: floor gates PASS.

**Reconcile:** `CLEAN`, 16 paths reconciled, 0 escapes, 0 warnings, 0 merged. Exempted as pipeline artifacts:
`REGRESSION.md`, `regression-report.json`. The epoch is the build's second anchor (PLAN amendment A13, the
maintainer's choice, taken after a `CLEAN` preview of 28 paths). The four stage scopes (regress ×2, verify ×2) are
recorded on it as amendments 1–4.

## Round 2 — after the GATE-2 fixes

The maintainer chose "fix, then PR" at GATE 2. The review's three blocking wording findings and advisory findings
4–8 were fixed inside the anchored `## Files` scope (amendment 5 on the epoch). Then verify re-ran the same seven gates:
every gate exit 0, **PASS**. Reconcile read `CLEAN`, 24 paths reconciled, 0 escapes. `verify-report.json` is unchanged:
same gates, same verdict.

## Verifiers (advisory)

No verifiers registered — floor gates only (`count-verifiers.mjs`: `{"registered":0,"verifiers":[]}`).

## Orchestration notes (advisory)

- **Two foreign files left and came back inside the window.** The anchor recorded another session's
  `.dev/features/pharn-footprint-move/{PLAN,GRILL}.md`. That session deleted them (it said so, and sent the bytes), and
  a reconcile preview read `ESCAPE` on both. They were restored by a byte copy whose SHA-256 matched the anchored
  entries, and reconcile read `CLEAN` again. That `CLEAN` therefore rests on the bytes being equal to the anchor, not
  on nothing having happened (`REGRESSION.md`, orchestration notes).
- **Earlier runs in this build:** a full `npm run check` failed on five tests: two new closures (amendment A13), two
  legacy decision-test fixtures, and one load-sensitive timing test (`entry-gates.test.mjs` "OBSERVED: TAKEOVER",
  which passed when re-run alone; its code is untouched). The run before this verify, after the fixes, was exit 0:
  6,048 tests, 6,047 passed, 0 failed.
- The gates ran as one Bash block in the pinned order, and `results.json` holds one key per gate that ran.

verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance.
