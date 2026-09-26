# REGRESSION — cost-dedup-completed-usage

This is iteration 3, after the second GATE-2 fix iteration. Iterations 1 and 2 also returned `no-regressions`, over 19
and 29 inside paths. Iteration 3 re-ran because the fix changed files inside the set and added `SHIP.md`: the
checker, its tests, the contract, the CHANGELOG, L63 in canon and the regenerated lessons index. Nothing from iteration
2 was reused. The baseline was re-captured in a fresh detached worktree at the same base SHA.

- **Base:** `767bf61f493f73c859a9820a01bddcb8f4f40a8d` (HEAD). `git status --porcelain` was non-empty (a working-tree
  build), so the base is HEAD.
- **Machine report:** `regression-report.json`, which is `pharn/floor/check-regress.mjs verdict`'s stdout, verbatim
  (`cmp`-identical to the captured output).

## Partition (`check-regress.mjs scope`, exit 0)

- **Inside:** 30 paths, `git diff --name-only HEAD` plus untracked. `escaped` is `[]` and `escape_exempt` is `[]`.
- **The declared set is widened, and the widening is stated here** (the `changelog-per-pr` iteration-5 precedent). It
  is the plan's 29 `## Files` paths plus `.dev/memory-bank/lessons-learned.md`. Canon is not in the plan's `## Files`,
  because a build scope cannot write it. Two promote-origin scopes wrote it:
  - `/pharn-dev-memory-promote` wrote L63 at the first GATE 2;
  - the one-sentence K7 correction was made under a promote-origin scope, on the maintainer's instruction at the
    second GATE 2 (`BUILD.md`, "Fix iteration 2").

  `docs/lessons-index.md` is now in the plan's `## Files`, because this iteration regenerates it.

- **Outside gates:**
  - 101 tracked test files, the same set as iterations 1 and 2;
  - `validate`;
  - 1 committed eval pair: `pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` ↔
    `.dev/features/trust-fence/findings.json`. Both paths were confirmed readable, at base and at head, before either
    exit code was recorded.
- **Style gates skipped** (the deterministic config-touch rule). The inside set touches none of `eslint.config.mjs`,
  `.prettierrc.json`, `.prettierignore` or `.markdownlint-cli2.jsonc`, so the style gates are absent from both maps.

## Per-gate exit codes

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `tests` (101 outside files, `node --test`)                                                 | 0    | 0    |
| `validate`                                                                                 | 0    | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |

- `regressions[]`: none
- `pre_existing[]`: none

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.** `check-regress.mjs verdict`
exit 0, `"verdict": "no-regressions"`.

That verdict is exactly as wide as the suite: `/pharn-dev-regress` catches what these deterministic gates catch and
nothing more. A behaviour no test, rule or eval covers is invisible here. It certifies the comparison, never the
feature as a whole.

## Orchestration notes (advisory — the verdict rests on the exit codes alone)

- The baseline ran in a detached `git worktree` at the base SHA under the session's scratch directory, with no
  `npm ci`, as the command prescribes for its stdlib-only gates. The worktree was removed afterwards.
- The test list was expanded with the pinned `cat <list> | xargs node --test` form on both sides. At the base, the
  list was a copy inside the temp worktree. At HEAD it was `.pharn/pharn-dev-regress/outside-tests.txt` directly.
- The declared list was parsed from `PLAN.md` by `pharn/floor/plan-files-core.mjs` (`pathsFromPlanFiles`), not typed.
  The first attempt read the parser's result as an array, but the parser returns `{ok, value, entries}`. So that
  attempt stopped before `scope` ran. The stale iteration-2 `scope.json` it then printed was deleted, and nothing from
  it was used.
- The four edited or new test files are INSIDE, so none of them is an outside gate. Their results belong to
  `/pharn-dev-verify`, which runs the whole suite.
