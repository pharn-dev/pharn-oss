# REGRESSION — verify-ac-gate-fixes

- **Base:** `137abd3088ac7bd079561be4c5ffc7a2e66aec21` (HEAD — the working tree carries the uncommitted build, so the
  Step-1 rule resolves `base = HEAD`).
- **Inside (17 paths):** the 15 PLAN `## Files` paths, plus this feature's own `PLAN.md` and `GRILL.md`, both exempted
  by `check-regress.mjs scope --feature` (`escape_exempt`). `scope` exited 0, so there is no escape.
- **Outside:** 101 test files and 1 committed eval pair
  (`pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` ↔
  `.dev/features/trust-fence/findings.json`, both confirmed readable before its exit code was recorded).
- **Style gates skipped** by the deterministic config-touch rule: no shared style config (`eslint.config.mjs`,
  `.prettierrc.json`, `.prettierignore`, `.markdownlint-cli2.jsonc`) is inside.

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `tests` (101 outside test files, one `node --test` run)                                    | 0    | 0    |
| `validate`                                                                                 | 0    | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |

`regressions: []` · `pre_existing: []` — `pharn/floor/check-regress.mjs verdict` exit **0**; the machine report is
`regression-report.json`, the helper's stdout copied byte-for-byte.

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.** This certifies the comparison
only: `/pharn-dev-regress` catches exactly what its suite catches, nothing more.

## Orchestration deviations (advisory, recorded)

The pinned shell forms (`xargs`, `$VAR` capture, `printf` map assembly) are refused in a worktree-isolated session, so
Steps 1–3 ran through `.pharn/pharn-dev-regress/run-regress.mjs` (scratch, never committed): every gate through
`spawnSync` with an argv array, each `{gate: exit}` map written from the RECORDED statuses, the verdict's stdout kept
verbatim. The baseline was a detached `git worktree` of the base SHA placed inside this worktree's gitignored `.pharn/`
and removed before the HEAD run. The outside test list went in as argv elements, never through a word-split variable,
so neither L16 failure mode could fabricate a red. Two runner bugs (a wrong return shape read from
`pathsFromPlanFiles`, and the `outside_eval_pairs` object shape) threw before any result map was written; the recorded
run is the third, complete one.
