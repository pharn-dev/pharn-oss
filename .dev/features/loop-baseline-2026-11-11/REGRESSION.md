# REGRESSION — loop-baseline-2026-11-11

- **Base:** `39ec5825b7b811e36993b48957f66a8521749b98` (`HEAD`; the working tree held the build's uncommitted
  changes, so Step 1 resolved `base = HEAD`).
- **Inside (4):** `CHANGELOG.md`, `.dev/measurements/loop-baseline-2026-11-11.md`, and this feature's `PLAN.md` and
  `GRILL.md` (both listed in `escape_exempt` by `--feature`). **Escaped:** none.
- **Outside gates:** `tests` (189 outside test files, per-test reporter), `validate`, and the one committed eval pair.
  The style gates were skipped: nothing inside touches a shared style config.

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---: | ---: |
| `tests`                                                                                    |    0 |    0 |
| `validate`                                                                                 |    0 |    0 |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` |    0 |    0 |

Per test: base 6,638 passed, 0 failed, 9 skipped; head 6,646 passed, 0 failed, 1 skipped; no new failures. The eight
extra skips at base sit in `capability-catalog-core`, `command-hygiene` (2), `render-regression`, `render-review` (3)
and `render-verify` tests; the base side ran in a detached worktree without `node_modules`, which is the probable
reason (not verified). No test failed on either side.

`regressions[]`: none. `pre_existing[]`: none.

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.** This verdict catches what the
outside suite catches and nothing more; the increment changes only markdown, which no outside test reads.
