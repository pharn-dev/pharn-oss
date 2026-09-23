# VERIFY — cost-ledger-compact-rows

| gate                                                                                       | exit |
| ------------------------------------------------------------------------------------------ | ---- |
| `test` (`npm test`: 2888 tests, 2888 pass, 0 fail, 0 skipped)                              | 0    |
| `validate`                                                                                 | 0    |
| `lint`                                                                                     | 0    |
| `format:check`                                                                             | 0    |
| `lint:md`                                                                                  | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    |
| `reconcile` (`CLEAN`, 5 reconciled, `escapes: []`)                                         | 0    |

**VERIFIED: floor gates PASS** (`check-verify.mjs` exit 0, `failing_gates: []`).

**Feature-specific evidence, beyond the gate map:**

- The first layout test, on the CLI write path, was run against the unchanged emitter before
  `serializeLedger` existed. It failed with `markers[0] is not one whole JSON value on its own line` and
  `requests[0] …` (L4). It passes now. The same assertion over the old serialization is kept as the
  permanent mutation control.
- A read-only measurement re-serialized the 14 `cost.json` files committed in `pharn-starter` and checked
  that each one parses deep-equal:
  - the 630-row `/2` ledger: 33,051 → 823 lines and 960,206 → 629,344 bytes;
  - all 14: 231,615 → 6,922 lines and 6,704,361 → 4,402,399 bytes.

  The contract's Size section records these figures.

- `.prettierignore` still lists `pharn/features/*/cost.json` (L23), so this repo's `format:check` never
  sees the new layout.

Verifiers: none are registered, so only the floor gates ran (`count-verifiers.mjs` →
`{"registered":0}`).

_Verified means only that the named gates passed. This is NOT a guarantee of correctness beyond what those
gates check. Verifier concerns are advisory help, not assurance._
