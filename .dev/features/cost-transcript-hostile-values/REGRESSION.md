# REGRESSION — cost-transcript-hostile-values

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.**

This certifies one comparison and nothing more. Every gate outside the feature that passed at the base commit still
passes at HEAD. A regression that no test, rule or eval covers is invisible to it.

This is the second run, after the GATE 2 fix pass. The first run was against `b9b6a03`, also `no-regressions`, and
it is superseded here. This one compares the whole branch against current `main`.

## Base and scope

- **Base:** `008b24b593ddb6b58fdacc1b60039ffb8f1fe70b`, `origin/main` at 6.26.0 after #280 and #281. It was passed
  explicitly, because `main` is merged into this branch, so the merge-base is `main` itself. HEAD is the working tree:
  the committed branch plus the uncommitted fix pass.
- **Inside (changed):** 31 paths, `git diff --name-only <base>` plus untracked files. They are listed in
  `regression-report.json`.
- **Declared:** 24 paths. That is the plan's `## Files` (22), plus the two files `/pharn-dev-memory-promote` wrote under
  its own scope when it promoted L64: `.dev/memory-bank/lessons-learned.md` and `docs/lessons-index.md`.
- **Escaped:** none (`check-regress.mjs scope`, exit 0).
- **Escape-exempt:** this feature's own pipeline artifacts, each written under its own stage's scope.

## Gates (outside the feature)

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `tests` — `node --test` over the 109 test files outside the changed scope                  | 0    | 0    |
| `validate` — `node pharn/floor/validate.mjs .`                                             | 0    | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |

- `regressions[]`: none. `pre_existing[]`: none. Verdict `no-regressions`, from `pharn/floor/check-regress.mjs verdict`
  (exit 0).
- **The style gates were skipped, deterministically.** The changed scope touches no shared style config.
- **Test counts, for the record (not an input to the verdict):**
  - base: 3,559 tests, 3,556 passed, 0 failed, 3 not run;
  - head: 3,559 tests, 3,559 passed.

  The base ran in a detached worktree without `node_modules`, and the three not-run tests skip themselves there.

## How it was run (orchestration, advisory)

- The base side ran in a fresh `git worktree add --detach` at the base, removed afterwards. HEAD ran in the working
  tree. The gate set was decided once, from `scope`, and was the same on both sides.
- The outside test list went to `node --test` as an argv array from a node runner, not the pinned `xargs` line, which
  this isolated worktree refuses. The eval pair's paths were confirmed readable first.

_Residual (P0):_ this stage catches what the suite catches, deterministically, and nothing more. "No regressions"
never means "nothing broke".
