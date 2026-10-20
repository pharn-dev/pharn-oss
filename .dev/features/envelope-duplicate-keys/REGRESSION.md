# REGRESSION — envelope-duplicate-keys

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.** `check-regress.mjs verdict`
exited 0 with `no-regressions`. `regression-report.json` is its JSON, verbatim.

- Base: `dd69efd59f968200650116cae9e0a5afb9cc4936`. This was a working-tree build, so `git status` was non-empty and
  the base is `HEAD`.
- Inside: the 21 built paths plus this feature's `PLAN.md`, `GRILL.md` and `BUILD.md` (24 in all). `scope` exited 0,
  so no path escaped the plan's `## Files`.
- Outside: 162 test files and one eval pair. The pair is
  `pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` ↔
  `.dev/features/trust-fence/findings.json`.
- Style gates: skipped, because no shared style config is inside.

| gate                                     | base | head |
| ---------------------------------------- | ---- | ---- |
| `tests` (162 outside files)              | 1    | 1    |
| `validate`                               | 0    | 0    |
| `structural:…expected-injection-comment` | 0    | 0    |

`regressions: []`. `pre_existing: [tests]`.

## The `tests` gate was red on both sides, and that matters

At both base and head, the same six tests failed out of 5384:

- five in `pharn/floor/entry-base-evidence.test.mjs`
- one in `pharn/floor/stage-regress.test.mjs`, "P2-C (f2)"

Each of these tests spawns nested worktrees and git operations. Each failed after 29–94 s, which fits the "known
load-timing tests" the brief names. The machine was shared with at least three sibling sessions running their own
suites, and the base run took about 49 minutes.

A whole-suite `tests` gate that is red on both sides hides any additional head-only failure inside it. So the named
failure lists were compared directly (`grep '^✖'` over both logs): **they are identical, test for test.** None of the
six touches an envelope reader. Inside the feature, the seven suites of the changed modules pass in full (see
`BUILD.md`).

## How it ran (advisory orchestration)

The regress steps ran from a scratch node runner, `.pharn/envelope-duplicate-keys/regress.mjs`, using argv arrays.
The pinned `xargs` and `$VAR` forms are refused in an isolated worktree.

- The base checkout was a detached worktree at `.pharn/envelope-duplicate-keys/base-wt`, removed after use.
- The first run crashed after the base test run had finished: the runner read the eval pairs in the wrong shape.
  The base `tests` exit (1, six named failures) was taken from that run's log
  (`.pharn/envelope-duplicate-keys/base-tests.first-run.log`), not run a second time.
- The base `validate` and `structural` gates, and every head gate, ran in the second run.
- The verdict was recomputed once more from the two saved maps and was byte-identical.

**Residual:** this stage catches exactly what its suite catches, nothing more. A regression that no deterministic
check covers is invisible here.
