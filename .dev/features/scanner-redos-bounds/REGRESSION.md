# REGRESSION — scanner-redos-bounds

This is run 3, the one recorded in `regression-report.json`. It ran after the review fixes and the merge of
`origin/main` (6.64.3), with the tree committed.

- Base: `94ad252baef07e219db9adfccad83df2c40e2e58`. The tree was clean, so the base is `merge-base HEAD origin/main`.
- Inside: 19 paths, all of them this plan's `## Files`. They are the ten `pharn/floor/` files, `SKILLS_VERSION`,
  `CHANGELOG.md` and `README.md`, plus this feature's artifacts. `scope` exited 0: nothing escaped the declared
  files, and `escape_exempt` was empty.
- Outside gates: 158 test files, `validate`, and one eval pair
  (`trust-fence/evals/expected/expected-injection-comment.json` ↔ `.dev/features/trust-fence/findings.json`). The
  style gates were skipped, because no shared style config is inside.

| gate                                     | base | head |
| ---------------------------------------- | ---- | ---- |
| `tests` (158 outside files)              | 1    | 1    |
| `validate`                               | 0    | 0    |
| `structural:…expected-injection-comment` | 0    | 0    |

- `regressions[]`: none
- `pre_existing[]`: `tests`

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature** (`check-regress.mjs` verdict
`no-regressions`, exit 0).

## Why `tests` is red on both sides, and what that costs

The shared machine ran at load averages of 90–216 during this run. Each side failed a handful of wall-clock tests,
and the two sides failed different ones:

- base:
  - `stage-regress.test.mjs`: "never recorded — a timed-out base gate …" and "★ P2-C (f2) …";
- head:
  - `entry-base-evidence.test.mjs`: "environment divergence …", "explicit --install / --no-install …" and
    "precedence — a published 6.33.0 retained record …";
  - `stage-verify.test.mjs`: "★ budget clock — the opening work counts …".

This increment touches none of those files. Each test of this kind that was re-run alone at head passed. That covers
the failures named in the earlier runs (`MEASUREMENTS.md` §6) and the latest ones checked during verify.

The verdict is honest, but it is weak on this gate. Under this load a real outside regression in `tests` would also
have been filed as `pre_existing`, so this run cannot tell such a regression from noise. CI's `npm test` on the pull
request is the clean measurement.

History:

- Run 1 (base `d5453a17`, working tree) reported `tests` 0 → 1. The one failure was the `stage-verify` budget-clock
  test, which passed alone.
- Run 2 reported `no-regressions` with `tests` 1 → 1.
- The review fixes and the merge came after both runs.

Residual: `/pharn-dev-regress` catches what its suite catches, nothing more. A regression no deterministic check
covers is invisible to it.
