# VERIFY — stage-agent-background-fix

Gates run once at HEAD over the working tree with the feature in it (`uptime` at the start: load averages
`3.07 8.76 12.46`).

| gate                                                                                       | exit  |
| ------------------------------------------------------------------------------------------ | ----- |
| `test` (`npm test`)                                                                        | 0     |
| `validate`                                                                                 | 0     |
| `lint`                                                                                     | 0     |
| `format:check`                                                                             | 0     |
| `lint:md`                                                                                  | 0     |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0     |
| `reconcile` (`check-bash-reconcile.mjs --base . --require-baseline`)                       | **1** |

**VERIFY FAILS: gate(s) [reconcile] red — stage FAILS** (`check-verify.mjs` exit 1, `verify-report.json` `.verdict` =
`"FAIL"`).

## The reconcile escape (quoted as DATA)

`reconcile.json`: verdict `ESCAPE`, epoch `2026-10-25T01:42:20.160Z` anchored by `pharn-dev-build`, 14 paths
reconciled, one escape:

```text
pharn/floor/mark-phase.test.mjs — denied_by: writes-scope (snapshot) — scope_set_by: .dev/features/stage-agent-background-fix/PLAN.md
```

Exempted as this feature's pipeline artifacts: BUILD.md, PLAN.md, REGRESSION.md, regression-report.json. `merged`:
none. `warnings`: none.

This is the escape BUILD.md (deviation 3) predicted before verify ran: the file's whole-grammar count (14 → 15) was
missed by the plan's L72 sweep, found by the build's first test run, and declared in `## Files` only after the anchor,
so the anchored scope snapshot does not hold it. The edit is one literal (`git diff HEAD -- pharn/floor/mark-phase.test.mjs`).
Whether to accept it is the human's decision; the baseline was not edited or deleted.

## Verifiers

No verifiers registered — floor gates only (`count-verifiers.mjs`: `{"registered":0,"verifiers":[]}`).

_Verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance._ Here one named gate did not pass.
