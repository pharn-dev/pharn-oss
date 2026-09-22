# REGRESSION — cost-ship-integration-review

- **Base:** `760c5decbfa2fb8f902d621b0cbeec0015254c68` (`HEAD`; this is working-tree work).
- **Inside:** 4 paths, all under this feature's own `.dev/features/` directory. `escaped: []`.
- **Outside gates:** `tests` (every test file outside the feature), whole-repo `validate`, and one
  committed eval pair. The style gates are skipped because no shared style config changed.

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `tests`                                                                                    | 0    | 0    |
| `validate`                                                                                 | 0    | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.** It catches what
the suite catches, nothing more.
