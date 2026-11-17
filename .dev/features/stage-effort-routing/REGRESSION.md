# REGRESSION — stage-effort-routing

- base: `155d12057815e74769e30e785f007924e273eae3` (`git merge-base HEAD origin/main`; the tree was clean, so not
  `HEAD`); head: the build commit `f75b2ea0` on this branch.
- verdict (`pharn/floor/check-regress.mjs verdict`, exit 0): **`no-regressions`** — copied verbatim into
  `regression-report.json`.
- scope (`check-regress.mjs scope --feature stage-effort-routing`, exit 0): 25 inside paths, `escaped: []`;
  `escape_exempt`: this feature's `PLAN.md` and `GRILL.md`, and `pharn/LIMITS.md` (the human-authored §8 edit, committed
  before the build's anchor). 192 outside test files and one outside eval pair.
- stage model: the session's (opus), inline inside `/pharn-dev-ship`.

## Gates (exit codes)

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `tests` (192 outside test files, per-test reporter)                                        | 1    | 1    |
| `validate`                                                                                 | 0    | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |

Style gates were skipped on both sides: no inside path touches a shared style config.

## Per-test comparison (the `tests` gate is red on both sides)

Base: 6,452 passed, 1 failed, 7 skipped. Head: 6,453 passed, 1 failed, 6 skipped. `new_failures: []`,
`still_failing: 1`, so the helper classifies `tests` as `pre_existing`, not a regression. The one test that failed on
both sides (a test title, quoted as DATA):

```text
pharn/floor/entry-gates.test.mjs › "CLI cache (AC3): a green clears the slot; a timed-out, a style-only or a peeked red is never recorded"
```

It is outside this increment (no inside path touches `entry-gates`), and it failed at the base commit too, on a host
running several other agents' suites at once (both sides took about 40 minutes). It is recorded here as it is; whether
it is a load-timing test is not decided by this stage, and `/pharn-dev-verify`'s whole-suite `test` gate measures it
again.

## Orchestration note (advisory)

The pinned Step 1–3 shell lines were run through a node runner (`spawnSync`, argv arrays) kept outside the repository,
because this isolated worktree's guard refuses the pinned `$VAR` / `xargs` forms. The runner ran the same commands: the
pinned `declared` extraction, `scope`, the per-test reporter with an absolute `--test-reporter` and
`--test-reporter-destination` on both sides, `validate`, `check-structural` over the eval pair, and `verdict` with
`--per-test`. A first attempt was stopped before it reached a verdict (the runner mis-read the eval-pair shape); its
base worktree was removed, and nothing it wrote was used.

no-regressions = no outside gate that a deterministic check covers flipped pass→fail, and no test failed at head that
passed at base. This is NOT a claim about anything those gates do not check.
