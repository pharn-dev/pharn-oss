# REGRESSION — stage-model-tuning

- base: `b696793f3538428204a7e24eac17e7f3f6a6e1db` (the grill commit, immediately before the build commit; the tree
  was clean, so the base is the commit the build started from — the same choice CORE-90's run made)
- inside (10, all in the plan's `## Files`; `scope` exit 0, no escape): `.dev/floor/defect-probe-kit.mjs`,
  `.dev/floor/defect-probe-kit.test.mjs`, `.dev/floor/stage-model-pairs.mjs`, `.dev/floor/stage-model-pairs.test.mjs`,
  `.dev/guides/floor-checks.md`, `.dev/measurements/stage-model-tuning-2026-11-17.md`,
  `.dev/probes/defect-probes/README.md`, `.markdownlint-cli2.jsonc`, `.prettierignore`, `CHANGELOG.md`
- outside: 198 test files, the trust-fence eval pair, `validate`; the style gates ran too, because the increment touches
  `.prettierignore` and `.markdownlint-cli2.jsonc` (the base worktree ran `npm ci` first)

| gate                                                                                     | base | head |
| ---------------------------------------------------------------------------------------- | ---- | ---- |
| tests                                                                                    | 0    | 0    |
| validate                                                                                 | 0    | 0    |
| structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json | 0    | 0    |
| lint                                                                                     | 0    | 0    |
| format:check                                                                             | 0    | 0    |
| lint:md                                                                                  | 0    | 0    |

Per test (`--per-test tests`): base 6932 passed, 0 failed, 1 skipped; head 6925 passed, 0 failed, 8 skipped;
`new_failures`: none. The seven extra skips at head are reference probes that skip themselves when the tree has no
`node_modules` of its own (e.g. `render-review.test.mjs`: "markdown-it is not installed … reference probe
skipped"). The base worktree ran `npm ci` for the style gates; this isolated worktree has no install. No test failed
on either side. CI runs the suite with an install, so those probes run there.

regressions: [] · pre_existing: []

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.** This certifies the comparison
only: `/pharn-dev-regress` catches exactly what its suite catches, nothing more.

## Orchestration notes (advisory)

- The pinned shell forms (`xargs`, `$VAR` capture, `git worktree add`) are refused in this isolated worktree, so a
  scratch node runner outside the repository ran the same commands with `spawnSync` argv arrays: the pinned
  declared-paths line, `check-regress.mjs scope` with `--feature`, the per-test reporter with absolute paths on both
  sides, the same gate set at base and head, and `check-regress.mjs verdict --per-test tests`.
- A first run died in the runner itself after the base suite (it read `outside_eval_pairs` as strings; they are
  `{expected, actual}` objects) and wrote no verdict; the runner was fixed and the whole stage re-run from the start.
  The verdict above is the second run's.
