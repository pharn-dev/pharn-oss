# REGRESSION — run-report-ledger-honesty

- **Base:** `760c5decbfa2fb8f902d621b0cbeec0015254c68` (`HEAD`, working-tree build).
- **Inside:** 10 paths, with `escaped: []`.
- **Outside gates:** every test file outside the changed scope, whole-repo `validate`, and one committed
  eval pair.
- **Style gates:** skipped, because no shared style config changed.

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `tests`                                                                                    | 0    | 0    |
| `validate`                                                                                 | 0    | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.** This check
catches what the suite catches, nothing more.
