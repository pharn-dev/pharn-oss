# REGRESSION — loop-fresh-integrity

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature** (final run, on the tree rebased
onto `origin/main` `7bcd7a8`; `check-regress.mjs verdict` exit 0, `regression-report.json` `.verdict` =
`no-regressions`).

This catches exactly what the outside suite catches, and nothing more. It certifies the base→head exit-code comparison,
never that nothing broke.

## Final run (post-rebase — the report on disk)

- base: `7bcd7a8964ce13828f2e941d3664b595b87e19ff`. The tree was committed and clean, so the command's second state
  test chose `merge-base HEAD origin/main`.
- inside (21): the whole increment. `scope` exit 0. The outside gates are the same three, all 0 → 0:
  `tests` (100 outside test files), `validate`, and `structural:…/expected-injection-comment.json`.
- `regressions[]`: none · `pre_existing[]`: none.

## Pre-rebase runs (base `137abd3`, recorded because they were real)

- base: `137abd3088ac7bd079561be4c5ffc7a2e66aec21` (`HEAD`; the working tree held the uncommitted build, so the
  command's first state test chose `base = HEAD`).
- inside (16): the plan's `## Files` paths that changed (12 of the 13), plus this feature's `PLAN.md`, `GRILL.md` and
  `BUILD.md`. `escape_exempt`: those three pipeline artifacts. `scope` exit 0: no escape from `## Files`.
- outside: 100 test files, `validate` (whole-repo), and 1 eval pair (`trust-fence` expected ↔
  `.dev/features/trust-fence/findings.json`, both paths confirmed readable before running). Style gates were skipped
  deterministically, because no shared style config is inside.

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `tests` (100 outside test files)                                                           | 0    | 0    |
| `validate`                                                                                 | 0    | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |

`regressions[]`: none · `pre_existing[]`: none.

## Iteration 1 — a real regression, fixed inside `## Files` (recorded, not hidden)

The first run returned **`regressions: ["tests"]`**: base 0 → head 1. The one failing outside test was
`.dev/floor/command-hygiene.test.mjs` — "✧ verify's pinned verdict line passes --ac-gate (6.20.0) — the flag
check-loop-fresh.mjs re-derives the report with". It pins check-loop-fresh's source to contain
`"--feature", ctx.feature, "--ac-gate"]`, so the freshness re-run and `/pharn-verify`'s pinned line cannot drift
apart (L45). The build had written that argv as a spread (`...acGate`), which kept the behaviour but broke the literal.
The fix writes the two argv arrays out, one per tree state, so the unmoved one still carries the flag visibly. It
stays inside `## Files` (`pharn/floor/check-loop-fresh.mjs`), under the plan's scope. The pin test and the
check-loop-fresh suite (35/35) passed, and regress was re-run from the same base, giving the table above. Iteration
1's maps are kept at `.pharn/pharn-dev-regress/*-iter1.json`. Deciding to fix and re-run, rather than end the run at
this RED, was a model decision under the delegated instruction (SHIP.md).

## Orchestration deviations (advisory, stated)

The pinned shell forms (`paste`, `xargs`, `$VAR` capture) are refused in a worktree-isolated session. Steps 1–3 ran
through a node runner, `.pharn/pharn-dev-regress/run.mjs`, which uses `spawnSync` argv arrays. It parses `## Files`
with `plan-files-core.mjs` (the core pinned to the setter's parser), runs the same gates from the base worktree
(`git worktree add --detach`) and from HEAD, and hands the recorded exit codes to `check-regress.mjs`. It never
reads a gate's output to decide anything.
