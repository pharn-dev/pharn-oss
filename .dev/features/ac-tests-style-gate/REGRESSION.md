# REGRESSION — ac-tests-style-gate

- **Base:** `0b18864b27f1f0cf6cb85e240b8f1a3fb8359281` (`HEAD` after the mid-run fast-forward; a working-tree dogfood
  build — `git status` non-empty)
- **Base checkout:** a detached `git worktree` at the base SHA, outside the repo (scratchpad), removed afterwards
- **Machine report:** `regression-report.json` (the `check-regress.mjs verdict` JSON, verbatim)

This is the second regress run. The first, on base `607d82c2`, also returned `no-regressions`, with `tests` red on
both sides from 12 failures already on that base (lens-groups, render-review-assignments, validate.test.mjs CHECK 6 —
`ERR_MODULE_NOT_FOUND` for `capability-files-core.mjs` in scratch-tree fixtures). The orchestrator then fast-forwarded
this worktree to `0b18864b`, which fixes them, and the build's Step 0 was re-run to re-anchor (PLAN.md, "Notes —
mid-run fast-forward and re-anchor").

## Partition (`check-regress.mjs scope`, exit 0)

- **Inside (14):** `.claude/commands/pharn-loop.md`, `.claude/commands/pharn-test.md`,
  `.dev/floor/command-hygiene.test.mjs`, `.dev/guides/floor-ac-tests.md`, `CHANGELOG.md`, `README.md`,
  `pharn/floor/ac-style-core.mjs`, `pharn/floor/ac-style-core.test.mjs`, `pharn/floor/check-ac-style.mjs`,
  `pharn/floor/check-ac-style.test.mjs`, and this feature's `PLAN.md`, `GRILL.md`, `REGRESSION.md`,
  `regression-report.json`.
- **Escaped:** none. `escape_exempt`: the four feature artifacts above.
- **Outside gates:** `tests` (176 test files — every tracked `*.test.mjs` / `*.test.cjs` except the changed
  `command-hygiene.test.mjs`; the four new floor files are untracked and inside), `validate`,
  `structural:…/expected-injection-comment.json`. No shared style config was touched, so the style gates are skipped
  on both sides (the config-touch rule).

## Per-gate exit codes

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `tests`                                                                                    | 0    | 0    |
| `validate`                                                                                 | 0    | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |

**Per-test comparison (`tests`):** base 5839 passed / 0 failed / 4 skipped; head 5842 passed / 0 failed / 1 skipped;
`new_failures`: none; `still_failing`: 0. `regressions: []`, `pre_existing: []`.

## Verdict

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature** (`check-regress.mjs verdict`
exit 0, `"verdict": "no-regressions"`).

`/pharn-dev-regress` catches exactly what its suite catches, nothing more: a breakage no test, rule or eval covers is
invisible to it. Both sides ran concurrently on a loaded machine (load average about 50–130, sibling agents running
their own suites); the per-test comparison is what decides.
