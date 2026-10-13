# REGRESSION — review-fanout

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.** This is `check-regress.mjs
verdict`, exit 0, over the final run below.

- **Base:** `f37eabe` (origin/main, 6.59.0). It is the merge-base after `origin/main` was merged into the branch at
  `c21652c`.
- **Inside** (33 paths): the plan's `## Files` that changed, plus this feature's GRILL.md, which `--feature` exempts.
  `check-regress.mjs scope` exit 0, `escaped: []`, `escape_exempt: [GRILL.md]`.
- **Outside gates:**
  - `tests` — 151 test files.
  - `validate`.
  - `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json`.
- **Style gates skipped:** no shared style config is inside.

## The final run

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `tests`                                                                                    | 0    | 0    |
| `validate`                                                                                 | 0    | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |

`regressions: []`, `pre_existing: []`.

## Earlier runs, recorded because two of them were red

Each side's `tests` gate ran under the spec reporter, with its log kept, so a red could be read and not just counted.
The machine's load average swung between 9 and 204 over these runs, because other agents' suites shared it.

1. **Base `791d205` (before main moved), head = the first build pass.**
   - Result: `tests` 1 → 1. The other gates were 0 → 0.
   - What was investigated: the head log showed two real failures, both in `pharn/floor/stage-runtime.test.mjs` —
     ★ GIT CEILING and its falsifier.
   - What they meant: that test enumerates every git spawn in a shipped floor module. This increment added two and
     had not named the test file.
   - What was done: the plan was amended to add the file (see PLAN.md, "Re-plan after the first build pass"). The
     reconcile check over the first window was `CLEAN` before the re-anchor.
   - The base red at `791d205` was never attributed. Its diagnostic run was stopped when `origin/main` moved and the
     base changed. The next base, `f37eabe`, was green under the same harness.
2. **Base `f37eabe`, head = after the merge and the GIT CEILING fix.**
   - Result: `tests` 0 → 1. The failing test was `pharn/floor/stage-regress.test.mjs` ★ P2-C (f2), at the
     assertion `green head (control)`: `inconclusive` instead of `no-regressions`.
   - Not attributed to this increment, on two counts:
     - That test exercises gate timeouts in the regress stage script (6.59.0's #345). It ran 16.4 s under load, its
       control timed out, and run alone afterwards it passed in 7.8 s.
     - No file it loads is inside this feature.
   - Superseded rather than recorded: the head changed after this run (the review fixes below), so it was re-run.
3. **Base `f37eabe` (its run-2 map reused, since the base is unchanged), head = after the review fixes.**
   - The final run, above.

The verdict is computed over run 3 only. Runs 1 and 2 are reported here and in the GATE 2 report, not folded into it.

## Bound

This stage catches what the outside suite catches, nothing more. The verdict is the comparison of two exit-code maps
(`check-regress.mjs`). How the gates were run is advisory orchestration: three node runners under
`.pharn/pharn-dev-regress/`, because the isolated worktree refuses the command's pinned `$(…)`, `$?` and xargs forms.
That is not "regress passed": it certifies the comparison, not the feature.
