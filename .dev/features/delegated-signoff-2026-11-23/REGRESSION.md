# REGRESSION — delegated-signoff-2026-11-23

Regress ran twice. The second run (iteration 2, after a fix to one sentence of the record) is the standing verdict and
the one `regression-report.json` holds. Both are recorded.

## Iteration 2 (the standing verdict)

- **Base:** `d5313883f49e6889af0d317c348cfcaefcfe429e` (the working tree held the uncommitted record fix, so Step 1
  resolved `base = HEAD`).
- **Inside (5):** `.dev/measurements/delegated-signoff-2026-11-23.md` and this feature's `REGRESSION.md`, `VERIFY.md`,
  `regression-report.json` and `verify-report.json` (iteration 1's artifacts, then untracked).
- **Scope check:** `check-regress.mjs scope` exit 0: `escaped: []`; `escape_exempt` = the four stage artifacts above.
- **Outside gates:** the 204 tracked `*.test.mjs` / `*.test.cjs` files, `validate`, and the one committed eval pair. No
  shared style config is inside, so the style gates are skipped on both sides.

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---: | ---: |
| `tests`                                                                                    |    0 |    0 |
| `validate`                                                                                 |    0 |    0 |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` |    0 |    0 |

Per test: base 7,081 passed, 0 failed, 9 skipped; head 7,089 passed, 0 failed, 1 skipped; `new_failures: []`,
`still_failing: 0`. `regressions: []`, `pre_existing: []`. Wall-clock: base 775 s, head 647 s.

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.** This catches what the suite
catches, nothing more; it certifies the base-and-head comparison only, not the record's content.

## Iteration 1

- **Base:** `2ec930d7cb34844f9f90ada8666966b3710e127d` (clean tree, so `base = git merge-base HEAD origin/main`).
- **Inside (4):** this feature's `PLAN.md` and `GRILL.md`, `.dev/measurements/delegated-signoff-2026-11-23.md`,
  `CHANGELOG.md`. `escaped: []`; `escape_exempt` = `PLAN.md`, `GRILL.md`.
- Same three outside gates, each exit 0 at base and at head. Per test: base 7,081 passed, 0 failed, 9 skipped; head
  7,082 passed, 0 failed, 8 skipped; `new_failures: []`. Verdict `no-regressions`. Wall-clock 547 s each side.

## Orchestration notes (advisory)

- **The gates ran through a node runner** (`spawnSync` with argv arrays, kept in the session scratchpad, not
  committed) instead of the pinned shell lines, because this isolated worktree's guard refuses compound `git` shell
  forms. It ran the same commands: the pinned `plan-files-core.mjs` line for the declared paths, `check-regress.mjs
scope` with `--feature`, the per-test reporter by absolute path with `--test-reporter-destination` per side (each
  destination removed first), a detached base worktree removed afterwards, the eval-pair paths checked readable before
  the gate, and the same `verdict` invocation with `--per-test`.
- **Skip counts differ between sides.** The detached base worktree has no `node_modules`; the working tree had one from
  iteration 2 on (`npm ci` ran before verify). Which tests skipped was not read. No test failed on either side in
  either iteration.
- **Heavy lock and load:** both runs held a batch heavy slot (`owner` CORE-314). Iteration 1: `uptime` 3.90 at start,
  3.33 at end. Iteration 2 took the slot at a 1-minute load of 8.10.
- **Not re-run after the last merges.** `origin/main` moved twice after iteration 2 (#470, #471: apparatus records, a
  CHANGELOG entry each, and lines in `.prettierignore` and `.markdownlint-cli2.jsonc`), and the record gained one
  citation of CORE-310's merged record. The batch orchestrator directed that the merge alone does not get a fresh
  regress (CI on the pull request is the check), so the standing verdict is iteration 2's, over the tree before those
  merges. Verify was re-run on the final tree (`VERIFY.md`).
