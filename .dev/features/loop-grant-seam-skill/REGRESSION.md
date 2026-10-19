# REGRESSION — loop-grant-seam-skill

- base: `94ad252baef07e219db9adfccad83df2c40e2e58` (= HEAD; a working-tree build, so `git status --porcelain` was
  non-empty)
- inside (11 paths): `.claude/commands/pharn-build.md`, `.claude/commands/pharn-loop.md`,
  `.dev/floor/command-hygiene.test.mjs`, `CHANGELOG.md`, `README.md`, `SKILLS_VERSION`,
  `pharn/floor/seam-config-materialize.mjs`, `pharn/floor/seam-config-materialize.test.mjs`, and this feature's
  `PLAN.md`, `GRILL.md`, `PROBE.md`. `scope` exit 0: `escaped: []`, `escape_exempt: []` (the three feature artifacts
  match the declared `.dev/features/loop-grant-seam-skill/**`, which the scope helper lists under `unenforced_globs`
  together with `docs/capabilities/**`; `docs:generate` changed nothing there).
- outside: 161 test files (`outside_tests`), `validate`, and the one committed eval pair
  (`trust-fence` `expected-injection-comment.json` ↔ `.dev/features/trust-fence/findings.json`, both confirmed
  readable before running). No shared style config is inside, so the style gates were skipped on both sides.

| gate                                                         | base | head |
| ------------------------------------------------------------ | ---- | ---- |
| `tests` (161 outside files, 5249 tests)                      | 1    | 1    |
| `validate`                                                   | 0    | 0    |
| `structural:…/trust-fence/…/expected-injection-comment.json` | 0    | 0    |

- `regressions`: none · `pre_existing`: `tests`

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature** (`check-regress.mjs verdict`
exit 0, `"verdict": "no-regressions"`). It catches what the suite catches, nothing more.

## The `tests` gate was red at BOTH sides, so it detected nothing here — said plainly

The machine was shared with about a dozen other agent sessions (load average 94–137 during the runs). At base, 1 of
5249 outside tests failed (`stage-verify.test.mjs:1112`, "budget clock … a slow first `git ls-files` exhausts a 2 s
window"); at head, 13 failed, all in timing-bound suites: `entry-base-evidence.test.mjs` (7), `entry-gates.test.mjs`
(2), `stage-verify.test.mjs` (2), `stage-direct.test.mjs` (1), `stage-regress.test.mjs` (1). None of those files, nor
anything they import, is inside this increment. Because the whole-suite gate is one exit code, a red at base makes a
red at head `pre_existing` — so for the `tests` gate this comparison is blind, and that is recorded rather than
smoothed over.

What was checked instead (advisory evidence, not the verdict):

- `entry-base-evidence.test.mjs` + `entry-gates.test.mjs` run alone at head: **55/55 pass**.
- `stage-direct` + `stage-regress` + `stage-verify` run alone at head: 173/174; the one failure is the same
  `stage-verify.test.mjs:1112` 2-second budget test that failed at base.
- The earlier full `npm run check` at head failed the same way (8 tests, in `entry-base-evidence` and `entry-gates`),
  every other gate green, including `check:reconcile`.

## Orchestration notes (advisory)

- The pinned `xargs` / `$VAR` forms are refused in this worktree-isolated session, so the gates ran from a scratch
  runner (`.pharn/pharn-dev-regress/capture.mjs`, `spawnSync` with argv arrays). Its first pass crashed after the base
  `node --test` finished (it read the eval pairs as strings; they are objects). The second pass recovered the base
  `tests` status from that run's log (`ℹ fail 1`, `ℹ cancelled 0` → exit 1, the rule `node --test` exits by) and ran
  the remaining base gates in the same base worktree, which it then removed.
- `regression-report.json` is the helper's `verdict` JSON, byte-identical (`cmp`).
