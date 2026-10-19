# REGRESSION — loop-honest-stop

base: `d5453a170a68a1b7842bf633b8638eb02dcd61cb` (`HEAD`, because the working tree was dirty: a working-tree build)

## Partition

- **Inside** (`git diff --name-only <base>` plus untracked files): the 21 build paths plus this feature's own
  `PLAN.md` and `GRILL.md`. `check-regress.mjs scope` exit 0. `escaped: []`. `escape_exempt`:
  `.dev/features/loop-honest-stop/GRILL.md`, which the grill stage wrote under its own scope.
- **Declared** (`## Files`, read with `plan-files-core.mjs`): 26 paths. Every inside path is declared or exempt.
- **Outside gates:** 157 outside test files (the `node --test` gate `tests`), `validate`, and the one committed eval
  pair `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json`. The style gates were
  skipped: the build changed none of `eslint.config.mjs`, `.prettierrc.json`, `.prettierignore` or
  `.markdownlint-cli2.jsonc`, so a style flip over the outside files was impossible.

## Gates (exit codes, base → head)

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |
| `tests`                                                                                    | 1    | 0    |
| `validate`                                                                                 | 0    | 0    |

- `regressions[]`: none.
- `pre_existing[]`: `tests`. **Investigated rather than recorded (the red-baseline rule).** The one failure at base
  was `pharn/floor/stage-regress.test.mjs` "never recorded — a timed-out base gate". It is a timing test, and it failed
  because the base run's own gates hit their time-out under heavy machine load: several parallel agents were running
  full suites at the same time. Its rendered output named two gates timed out at both sides, not the
  `evidence-unreliable` line it expects. It is outside this increment (no file in `inside` touches it). It passed at
  HEAD in this run, and in this worktree's `npm run check` an hour earlier (5,565 pass, 0 fail). A load flake at the
  base side, not a red main.

## Verdict

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.** `check-regress.mjs verdict`
exit 0, `"verdict": "no-regressions"` (`regression-report.json`, verbatim).

This catches what the suite catches and nothing more. A break that no test, rule or eval covers is invisible here.
The orchestration (the base choice, the partition, running the suites through a scratch runner under `.pharn/`,
because this isolated worktree refuses the pinned `xargs` form) is advisory. Only the exit-code comparison is floor.
