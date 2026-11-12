# REGRESSION — gate-durations

- base: `61deb6b168c90bfd163a58d3c04e638ad873f516` (working-tree build → `base = HEAD`)
- verdict source: `pharn/floor/check-regress.mjs verdict` (exit 0), copied verbatim to `regression-report.json`

## Partition

- **Iteration 2** (after the review's CHANGELOG fix): the same gates re-run on the edited tree; the figures below are
  this run's, identical to iteration 1's.
- **Inside (31 paths):** the plan's `## Files` paths that changed, plus this feature's pipeline artifacts (`PLAN.md`,
  `GRILL.md`, `REGRESSION.md`, `regression-report.json`, `VERIFY.md`, `verify-report.json`, `REVIEW.md` —
  `escape_exempt`). `scope` reported `escaped: []`: no changed path lies outside the declared writes.
- **Outside gates:** 178 test files outside the feature (`tests`, per-test record on both sides), `validate`, and the
  one committed eval pair (`structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json`).
  Style gates skipped: no shared style config is inside.

## Base → head

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---: | ---: |
| `tests`                                                                                    |    0 |    0 |
| `validate`                                                                                 |    0 |    0 |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` |    0 |    0 |

Per-test (`tests`): base 5984 passed, 0 failed, 9 skipped; head 5992 passed, 0 failed, 1 skipped; `new_failures: []`.

- `regressions[]`: none
- `pre_existing[]`: none

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.**

This compares exit codes of the gates above at base and head; it catches what those gates catch, and nothing more.
