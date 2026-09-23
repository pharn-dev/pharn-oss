# VERIFY — cost-ledger-verify-tail

| gate                                                                                       | exit |
| ------------------------------------------------------------------------------------------ | ---- |
| `test` (`npm test`: 2884 tests, 2884 pass, 0 fail, 0 skipped)                              | 0    |
| `validate`                                                                                 | 0    |
| `lint`                                                                                     | 0    |
| `format:check`                                                                             | 0    |
| `lint:md`                                                                                  | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    |
| `reconcile` (`CLEAN`, 10 reconciled, `escapes: []`)                                        | 0    |

**VERIFIED: floor gates PASS** (`check-verify.mjs` exit 0, `failing_gates: []`).

**The skip that was not a pass (L37).** The first `npm test` run reported `2883 pass, 1 skipped`. The skipped
test, `style: a spliced README passes the repo's prettier and markdownlint unchanged`, skips itself when the
worktree has no `node_modules`. `npx` had been resolving prettier from the parent checkout. After `npm ci`
in this worktree (gitignored, outside the reconciled set) the same suite ran `2884 pass, 0 skipped`, and
that is the run recorded above.

**Feature-specific evidence, beyond the gate map:**

- The new continued-session tests were run against the unfixed checker first. Three failed, and one of
  them reproduces the downstream message in fixture form: `7 recorded, 10 re-derived`. They pass after
  the fix (L4).
- The real downstream ledger (`pharn-starter`, `org-slug-routing/cost.json`) was checked read-only with
  6.13.0 and then with this build, the same day:
  - 6.13.0: `RED`, `423 recorded, 640 re-derived`;
  - this build: exit 0, one WARN, and exact for the 422 before the window.
- All 14 ledgers committed in that repo were run through both checkers. The 13 legacy `/1` files give the
  identical WARN under both.

Verifiers: none are registered, so only the floor gates ran (`count-verifiers.mjs` →
`{"registered":0}`).

_Verified means only that the named gates passed. This is NOT a guarantee of correctness beyond what those
gates check. Verifier concerns are advisory help, not assurance._
