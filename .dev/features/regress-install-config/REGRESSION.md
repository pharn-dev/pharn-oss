# REGRESSION — regress-install-config

`regression-report.json` is the round-2 verdict (after the GATE 2 fixes and the merge of `origin/main`). Round 1 is
kept below.

## Round 2 (after GATE 2 fixes, merged with origin/main `94ad252b`)

**Verdict (FLOOR, `check-regress.mjs verdict` exit 0): `no-regressions`.** No outside gate flipped pass → fail.

- base: `94ad252baef07e219db9adfccad83df2c40e2e58` — the merge-base with `origin/main` (the branch is committed and
  clean, so not `HEAD`)
- inside: 26 changed paths, all declared in the plan's `## Files` or exempt as this feature's own artifacts
  (`scope` exit 0, no escape)
- outside: 157 test files, 1 eval pair (`trust-fence`), plus whole-repo `validate`

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `tests` (157 outside `*.test.mjs` / `*.test.cjs`)                                          | 1    | 1    |
| `validate`                                                                                 | 0    | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |

**`tests` red on both sides, read as `pre_existing`, so it is NOT evidence of no regression here.** A red-on-both gate
can hide a regression, so it was investigated, not taken at face value:

- The machine was saturated by parallel agent sessions (load averages 170–220 throughout the run).
- The suite's budget- and wall-clock-sensitive regress tests fail under that load. A full `npm test` at HEAD, with
  output captured, failed 8 of 5569 tests: five in `entry-base-evidence.test.mjs`, two in `stage-regress.test.mjs`
  (the A3 kill-mid-`git worktree add` test and the ★ WIRING real `npm ci` test, both a `continue` at a budgeted phase)
  and one in `stage-verify.test.mjs` (the "old-clock mutant" wall-clock test).
- Re-run alone at lower load, `stage-regress.test.mjs` passed in full. `entry-base-evidence.test.mjs` and
  `stage-verify.test.mjs` failed 3 of 174 between them, all a budget pause or a timing assertion.
- An A/B over two of the failing `entry-base-evidence` tests, run back to back: **HEAD 2/2 pass; a clean worktree of
  `origin/main` 0/2 pass** under the same load. The failures follow the load, not this change.

The outside suites never load `pharn.config.json` `regress.install` unless a fixture declares it, and only this
increment's own tests do. That is a reading of the code, not a measurement. CI, on an unloaded runner, is the clean
measurement.

## Round 1 (after build, base = HEAD `d5453a17`, working-tree dogfood)

`no-regressions`: `tests` 1 → 0, `validate` 0 → 0, `structural:…` 0 → 0. The red base ran in a temp-root worktree with
no `node_modules`; main's CI was green at `d5453a17` (`gh run list`: `ci` success).

## Orchestration deviation (ADVISORY)

This session is worktree-isolated, which refuses the pinned shell forms (`xargs`, `$VAR` capture). Steps 1.4–2 ran
through a scratch runner, `.pharn/pharn-dev-regress/capture.mjs`. It calls the same commands with argv arrays
(`check-regress.mjs scope` with the pinned declared-paths extraction, `node --test <outside tests>`, `validate.mjs`,
`check-structural.mjs`) and records only exit codes.

The verdict is exactly as good as the outside suite; nothing here claims the increment is correct.
