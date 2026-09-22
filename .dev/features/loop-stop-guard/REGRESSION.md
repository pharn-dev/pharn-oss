# REGRESSION — loop-stop-guard

- **Base:** `1a8b027f8d37e5c6b08ae74c6238a3d8b51401aa`. This is `HEAD`; the build is uncommitted work in
  the working tree.
- **Inside (the changed scope):** 13 paths. `check-regress.mjs scope` reported `escaped: []`, and its
  `escape_exempt` is only this feature's `PLAN.md` and `GRILL.md`.
- **Outside gates:**
  - `tests` runs the 87 test files outside the changed scope.
  - `validate` runs over the whole repo.
  - `structural:` runs one committed eval pair. Its paths were confirmed readable first.
- **Skipped style gates:** `lint`, `format:check` and `lint:md` did not run. No shared style config is
  inside the changed scope.

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `tests`                                                                                    | 0    | 0    |
| `validate`                                                                                 | 0    | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |

- `regressions[]`: none
- `pre_existing[]`: none

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature**
(`check-regress.mjs verdict` exit 0).

Residual (P0): this catches exactly what the deterministic suite catches, nothing more.

## Iteration 2 (after the GATE-2 fix that moved the `--close` paragraph)

The outside gates re-ran over the same base and were again `0 → 0`. `escaped` is empty. The inside set
grew to 17 paths, all of them this feature's own artifacts. **REGRESSIONS: none** (`check-regress.mjs
verdict` exit 0). `regression-report.json` holds the iteration-2 verdict verbatim.
