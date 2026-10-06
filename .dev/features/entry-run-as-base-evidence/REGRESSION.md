# REGRESSION — entry-run-as-base-evidence

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.**

The verdict is `pharn/floor/check-regress.mjs verdict` (exit `0`, `"verdict": "no-regressions"`), a deterministic
comparison of exit codes. The machine report is `regression-report.json`, the helper's stdout verbatim.

## Base

- Base: `0e38b861f7839a7c19f8bb29756888d84e152568` (`origin/main`, the pre-build commit), passed by the invoker as
  `--base`. HEAD is the same commit; the build is the uncommitted working tree.
- Baseline captured in a detached `git worktree add` of the base SHA (removed after the run); HEAD measured in the
  working tree. Both sides ran the identical gate set, sequentially (453 s total).

## Partition (`check-regress.mjs scope`, exit 0)

- **Inside (37 paths)** = `git diff --name-only <base>` plus untracked files: the 34 product and dev source paths the
  PLAN's `## Files` declares, plus this feature's `PLAN.md`, `GRILL.md`, `MEASUREMENT.md` and `measure.mjs`.
- **Declared** = the PLAN's `## Files`, extracted with the pinned `plan-files-core.mjs` line (exit 0).
- **`escaped`: `[]`**, **`escape_exempt`: `[]`**. No changed path fell outside the declared writes.
- **Outside gates:** 138 outside test files (every tracked `*.test.mjs` / `*.test.cjs` not in the inside set), the
  whole-repo `validate`, and one committed eval pair,
  `pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` ↔
  `.dev/features/trust-fence/findings.json` (both paths confirmed readable at base and at HEAD before recording).
- **Style gates skipped** (deterministic skip rule): the inside set touches none of `eslint.config.mjs`,
  `.prettierrc.json`, `.prettierignore`, `.markdownlint-cli2.jsonc`, so no style flip over outside files is
  possible. They are absent from both maps.

The outside test list was expanded with the pinned form `cat outside-tests.txt | xargs node --test`.

## Per-gate exit codes

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---: | ---: |
| `tests` (138 outside files; 4268 tests both sides)                                         |    0 |    0 |
| `validate` (`FLOOR: GREEN — 37 capabilities` both sides)                                   |    0 |    0 |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` |    0 |    0 |

- `regressions[]`: none.
- `pre_existing[]`: none.

## Sibling worktrees

This checkout holds two other sessions' worktrees under `.claude/worktrees/`. They did not affect this stage: the
outside test list comes from `git ls-files` (none of its 138 paths is under `.claude/worktrees/`), and `validate`
reported the same 37 capabilities at base (a fresh worktree with no `.claude/worktrees/`) and at HEAD.

## Residual (P0/P7)

This certifies only the comparison: `/pharn-dev-regress` catches exactly what its deterministic suite catches, nothing
more. A regression outside the feature that no test, rule or eval covers is invisible here. `validate` is whole-repo, so
a flip there would be reported at repo granularity. The orchestration (choosing the base, partitioning, running the
suite) is advisory; only the exit-code verdict is floor-grade.
