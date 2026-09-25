# REGRESSION — spec-pin-kind-ambiguity

**Base:** `8eec2d7e6f18744a63789b3dda97bbf75f45361e` (`origin/main` after #269), passed explicitly as `--base`.

The auto rule would have picked `base = HEAD`. But HEAD here is a WIP commit holding this feature, made so the branch
could be rebased onto the PRs that merged mid-run, and it would have put the feature into its own baseline. The
explicit base is the true pre-build commit.

**Regress ran three times, every run `no-regressions` with every gate 0 → 0:**

1. Base `7bcd7a8` (#268), right after the build: 14 inside paths.
2. The same base, after the two REVIEW fixes.
3. Base `8eec2d7` (#269), after the second rebase: the table below, which is the standing report.

## Partition (`check-regress.mjs scope --feature spec-pin-kind-ambiguity`, exit 0)

- **Inside:** 19 paths. These are the 12 declared in `PLAN.md` `## Files`, plus this feature's own pipeline artifacts
  (`PLAN.md`, `GRILL.md`, `REGRESSION.md`, `REVIEW.md`, `VERIFY.md` and the two verdict JSONs), which `--feature`
  exempts (`escape_exempt`). No path escaped the declared writes.
- **Outside:** 101 test files, `validate`, and one committed eval pair
  (`pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` ↔
  `.dev/features/trust-fence/findings.json`). Both paths were confirmed readable before any exit code was recorded.
- **Style gates skipped** by the deterministic rule: no shared style config is inside.

## Per-gate exit codes

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `tests` (101 outside test files)                                                           | 0    | 0    |
| `validate`                                                                                 | 0    | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |

`regressions[]`: none · `pre_existing[]`: none

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.** The verdict is
`check-regress.mjs verdict` (`regression-report.json`, verbatim).

The honest residual: this catches exactly what the outside suite catches, nothing more. A behaviour change that no
test, rule or eval covers is invisible here.

## Orchestration deviation (advisory)

The command's pinned shell forms (`xargs`, `$VAR` exit capture) are refused in this worktree-isolated session. So
`.pharn/pharn-dev-regress/run-regress.cjs` ran the same gates with `spawnSync` argv arrays, in a detached `git worktree`
at the base and then in the working tree. It recorded only exit codes into the two results maps and handed them to
`check-regress.mjs`. Its first run crashed in the runner itself, before any gate ran: it read an eval pair as a
`"a::b"` string, but `scope` returns `{expected, actual}` objects. It was fixed and re-run. No gate command was
improvised: the gate set is `node --test <outside tests>`, `validate.mjs .` and
`check-structural.mjs <expected> <actual> .`, as the command names them.
