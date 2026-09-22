# REGRESSION — run-scoped-token-accounting

> **Iteration 2** was re-run after the post-review fixes. The inside set grew from 20 to 25 paths,
> because this feature's own `REGRESSION.md`, `REVIEW.md`, `VERIFY.md` and two reports are now in the
> tree. `escaped` is still `[]`. Every outside gate is still `0 → 0`, and the verdict is unchanged. The
> tables below are the same numbers.

- **Base:** `81b5124cbddd191184d7f7142dc16389cdd522dd`. This is `HEAD`, because the build is uncommitted
  work in the working tree.
- **Inside (the changed scope):** 20 paths. They are every path in the PLAN's `## Files` except the
  generated `docs/capabilities/**`, which did not change, plus this feature's own `PLAN.md` and
  `GRILL.md`. `check-regress.mjs scope` reported `escaped: []`, and `escape_exempt` names only those two
  feature artifacts.
- **Outside gates:**
  - `tests` runs the 83 test files outside the changed scope.
  - `validate` runs over the whole repo.
  - `structural:` runs one committed eval pair: `trust-fence` `expected-injection-comment.json` ↔
    `.dev/features/trust-fence/findings.json`. Both paths were confirmed readable first.
- **Skipped style gates:** `lint`, `format:check` and `lint:md` did not run. No shared style config is
  inside the changed scope, so a style flip over the outside files is impossible. They are absent from
  both maps.

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `tests`                                                                                    | 0    | 0    |
| `validate`                                                                                 | 0    | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |

- `regressions[]`: none
- `pre_existing[]`: none

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature**
(`check-regress.mjs verdict` exit 0, `"verdict": "no-regressions"`).

Residual (P0): `/pharn-dev-regress` catches exactly what its deterministic suite catches, nothing more.
It is not a certificate that nothing broke.
