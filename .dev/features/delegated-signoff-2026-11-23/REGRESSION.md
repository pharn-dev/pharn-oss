# REGRESSION — delegated-signoff-2026-11-23

- **Base:** `2ec930d7cb34844f9f90ada8666966b3710e127d` (the working tree was clean, so Step 1 resolved
  `base = git merge-base HEAD origin/main`; `origin/main` had moved twice during the run, to #468 and then #469, and was
  merged into the branch each time).
- **Inside (4):** `.dev/features/delegated-signoff-2026-11-23/GRILL.md`, `.dev/features/delegated-signoff-2026-11-23/PLAN.md`,
  `.dev/measurements/delegated-signoff-2026-11-23.md`, `CHANGELOG.md`.
- **Scope check:** `check-regress.mjs scope` exit 0: `escaped: []`; `escape_exempt` = this feature's `PLAN.md` and
  `GRILL.md` (each written under its own stage's scope).
- **Outside gates:** the 204 tracked `*.test.mjs` / `*.test.cjs` files (none is inside), `validate`, and the one
  committed eval pair. No shared style config is inside, so the style gates are skipped on both sides.

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---: | ---: |
| `tests`                                                                                    |    0 |    0 |
| `validate`                                                                                 |    0 |    0 |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` |    0 |    0 |

Per test: base 7,081 passed, 0 failed, 9 skipped; head 7,082 passed, 0 failed, 8 skipped; `new_failures: []`,
`still_failing: 0`. `regressions: []`, `pre_existing: []`. Wall-clock: base 547 s, head 547 s.

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.** This catches what the suite
catches, nothing more; it certifies the base-and-head comparison only, not the record's content.

## Orchestration notes (advisory)

- **The gates ran through a node runner** (`spawnSync` with argv arrays, kept in the session scratchpad, not
  committed) instead of the pinned shell lines, because this isolated worktree's guard refuses compound `git` shell
  forms. It ran the same commands: the pinned `plan-files-core.mjs` line for the declared paths, `check-regress.mjs
scope` with `--feature`, the per-test reporter by absolute path with `--test-reporter-destination` per side (each
  destination removed first), a detached base worktree removed afterwards, the eval-pair paths checked readable before
  the gate, and the same `verdict` invocation with `--per-test`.
- **Heavy lock and load:** the stage ran under the batch's heavy lock (`owner` CORE-314). `uptime` at start: load
  3.90 / 5.81 / 9.70; at end: 3.33 / 5.93 / 8.13. Several `sh slow.sh` processes from other sessions were present and
  idle; none was this run's.
- The two sides differ by one test in the skip and pass counts (9 → 8 skipped, 7,081 → 7,082 passed); which test it was
  was not read. No test failed on either side.
