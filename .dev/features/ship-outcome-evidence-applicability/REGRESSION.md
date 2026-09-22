# REGRESSION — ship-outcome-evidence-applicability

- **Base:** `9d866edc9f07e990c319b9f22b05480ea5cb516f`. This is `HEAD`; the build is uncommitted work in
  the working tree.
- **Inside (the changed scope):** 16 paths. `check-regress.mjs scope` reported `escaped: []`, and its
  `escape_exempt` is only this feature's `PLAN.md` and `GRILL.md`.
- **Outside gates:**
  - `tests` runs the 85 test files outside the changed scope.
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
