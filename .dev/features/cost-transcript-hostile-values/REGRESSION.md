# REGRESSION — cost-transcript-hostile-values

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.**

This certifies one comparison and nothing more. Every gate outside the feature that passed at the base commit still
passes at HEAD. A regression that no test, rule or eval covers is invisible to it.

This is the fourth run. It follows the merge of `main` at 6.28.0 (#284) and the renumber to 6.28.1. The earlier runs,
against `b9b6a03`, `008b24b` and `c85be1b`, were all `no-regressions`, and this one supersedes them.

## Base and scope

- **Base:** `b6274095d4c9c6bf58926b375eb710a1809d5f82`, `origin/main` at 6.28.0 after #284. It was passed explicitly,
  because `main` is merged into this branch, so the merge-base is `main` itself. HEAD is the working tree: the
  committed branch, including the merge commit `5c6a012`, plus the uncommitted note in `BUILD.md`.
- **Inside (changed):** 32 paths, `git diff --name-only <base>` plus untracked files. They are listed in
  `regression-report.json`.
- **Declared:** 24 paths. That is the plan's `## Files` (22), plus the two files `/pharn-dev-memory-promote` wrote under
  its own scope when it promoted L64: `.dev/memory-bank/lessons-learned.md` and `docs/lessons-index.md`.
- **Escaped:** none (`check-regress.mjs scope`, exit 0).
- **Escape-exempt:** this feature's own pipeline artifacts, each written under its own stage's scope.

## Gates (outside the feature)

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `tests` — `node --test` over the 114 test files outside the changed scope                  | 0    | 0    |
| `validate` — `node pharn/floor/validate.mjs .`                                             | 0    | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |

- `regressions[]`: none. `pre_existing[]`: none. Verdict `no-regressions`, from `pharn/floor/check-regress.mjs verdict`
  (exit 0).
- **The style gates were skipped, deterministically.** The changed scope touches no shared style config.
- **Test counts, for the record (not an input to the verdict):**
  - base: 3,779 tests, 3,776 passed, 0 failed, 3 skipped;
  - head: 3,779 tests, 3,779 passed.

  The base ran in a detached worktree without `node_modules`, and the three skipped tests skip themselves there.

- The 114 outside files include the suites #283 and #284 added or changed outside this increment's files, among them
  `stage-agent`, `stage-agent-core`, `route-token-core`, `mark-phase`, `ship-outcome-core`, `check-loop`,
  `check-loop-fresh`, `check-loop-record`, `check-quick-scope` and `loop-mode-core`. #283's tests in
  `render-cost-ledger.test.mjs` are in a file this increment changed, so they are inside, and `/pharn-dev-verify`'s full
  suite runs them.

## How it was run (orchestration, advisory)

- The base side ran in a fresh `git worktree add --detach` at the base, removed afterwards. HEAD ran in the working
  tree. The gate set was decided once, from `scope`, and was the same on both sides.
- The outside test list went to `node --test` as an argv array from a node runner, not the pinned `xargs` line, which
  this isolated worktree refuses. The eval pair's paths were confirmed readable first.
- `regression-report.json` is the helper's `verdict` output, byte for byte (`cmp`).

_Residual (P0):_ this stage catches what the suite catches, deterministically, and nothing more. "No regressions"
never means "nothing broke".
