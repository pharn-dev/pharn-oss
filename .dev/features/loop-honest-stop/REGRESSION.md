# REGRESSION — loop-honest-stop

`regression-report.json` holds **run 2** verbatim. That run came after the GATE-2 review fixes and the merge of
`origin/main` (6.64.3). Its base is `94ad252b`, the merge base with `origin/main`, because the tree was clean and
committed. Run 1, below run 2, is kept as it was recorded.

## Run 2 — base `94ad252baef07e219db9adfccad83df2c40e2e58` (merge-base with `origin/main`)

- **Partition:** the 21 build paths plus this feature's eight pipeline artifacts. `scope` exit 0, `escaped: []`, and
  the artifacts are listed in `escape_exempt`. There are 157 outside test files. The style gates are skipped for the
  same reason as in run 1.

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |
| `tests`                                                                                    | 1    | 1    |
| `validate`                                                                                 | 0    | 0    |

- `regressions[]`: none. `pre_existing[]`: `tests`.
- **What was red, investigated.** At base, on `main` itself, the same `stage-regress.test.mjs:2207` timing test failed
  as in run 1. At head, that test and `stage-regress.test.mjs:2948` failed: "P2-C (f2) … under a green head it masks
  nothing" read `inconclusive` instead of `no-regressions`. That test gives a deliberately slow fixture a short budget,
  so under load the green control timed out too.
- Machine load during run 2 was a load average of 160–180, from parallel agents' suites. Both tests live in
  `stage-regress.test.mjs`, which this increment does not touch and whose code it does not change.
- **Verdict (run 2): REGRESSIONS: none — no deterministically-detectable breakage outside the feature**
  (`check-regress.mjs verdict` exit 0).

## Run 1 — base `d5453a170a68a1b7842bf633b8638eb02dcd61cb` (`HEAD`, because the working tree was dirty: a working-tree build)

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
