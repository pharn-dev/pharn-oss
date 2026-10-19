# REGRESSION — scanner-redos-bounds

- Base: `d5453a170a68a1b7842bf633b8638eb02dcd61cb` (working-tree build, so `base = HEAD`)
- Inside (16 paths): the ten `pharn/floor/` files of the plan, `SKILLS_VERSION`, `CHANGELOG.md`, `README.md`, and this
  feature's `PLAN.md` / `GRILL.md` / `MEASUREMENTS.md`. `scope` exited 0: no path escaped the declared `## Files`, and
  `escape_exempt` was empty.
- Outside: 158 test files, `validate`, and one eval pair
  (`trust-fence/evals/expected/expected-injection-comment.json` ↔ `.dev/features/trust-fence/findings.json`). The
  style gates were skipped because no shared style config is inside.

## Verdict run (run 2)

| gate                                     | base | head |
| ---------------------------------------- | ---- | ---- |
| `tests` (158 outside files)              | 1    | 1    |
| `validate`                               | 0    | 0    |
| `structural:…expected-injection-comment` | 0    | 0    |

- `regressions[]`: none
- `pre_existing[]`: `tests`

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature** (`check-regress.mjs` verdict
`no-regressions`, exit 0).

## The red `tests` on both sides

The machine was heavily loaded during this run, with load averages of 50–99 while other agents ran their own suites.
Each side failed a single, different wall-clock test:

- base: `pharn/floor/entry-base-evidence.test.mjs` "no slot — a test path badPath refuses …";
- head: `pharn/floor/entry-gates.test.mjs` "CLI: a new --start supersedes the tree's earlier runner …".

This increment touches neither file. Both tests passed when re-run alone at head, under a load average of about 59.

The pre-existing red therefore does not show a broken suite. It does mean that, in this run, the `tests` gate could
not tell a real outside regression from load. The same holds for the stage's first run (run 1), which reported
`tests` 0 → 1. That red was one wall-clock test, `pharn/floor/stage-verify.test.mjs` "★ budget clock — the opening
work counts", which also passed alone at head. After run 1, a fix the review probe asked for went into
`scan-code-n-plus-one.mjs` and the `sink-span-core.mjs` header (`MEASUREMENTS.md` §5–6), and the stage was re-run.
`/pharn-dev-verify`'s whole-repo `npm test` is the next deterministic check of the full suite.

Residual: `/pharn-dev-regress` catches what its suite catches, nothing more. A regression no deterministic check
covers is invisible to it.
