# REGRESSION — epic4-no-go-2026-11-16

- **Base:** `65559244842cd8f3f4807961d33eb38daaf5f2e5` (HEAD; the working tree held the build's uncommitted files, so
  Step 1 resolved `base = HEAD`).
- **Inside (4):** `.dev/features/epic4-no-go-2026-11-16/PLAN.md`, `CHANGELOG.md`,
  `.dev/features/epic4-no-go-2026-11-16/GRILL.md`, `.dev/measurements/epic-4-no-go-2026-11-16.md`.
- **Scope check:** `check-regress.mjs scope` exit 0: `escaped: []`; `escape_exempt` = this feature's `PLAN.md` and
  `GRILL.md` (each written under its own stage's scope).
- **Outside gates:** every tracked `*.test.mjs` / `*.test.cjs` (none is inside), `validate`, and the one committed eval
  pair. No shared style config is inside, so the style gates are skipped on both sides.

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---: | ---: |
| `tests`                                                                                    |    0 |    0 |
| `validate`                                                                                 |    0 |    0 |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` |    0 |    0 |

Per test: base 6,905 passed, 0 failed, 9 skipped; head 6,906 passed, 0 failed, 8 skipped; `new_failures: []`,
`still_failing: 0`. `regressions: []`, `pre_existing: []`. Wall-clock: base 3,189 s, head 1,671 s.

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.** This catches what the suite
catches, nothing more; it certifies the base-and-head comparison only, not the record's content.

## Orchestration notes (advisory)

- **The gates ran through a node runner** (`spawnSync` with argv arrays, kept in the session scratchpad, not
  committed) instead of the pinned shell lines: this isolated worktree's guard refuses compound `git` shell forms. It
  ran the same commands: the per-test reporter by absolute path with `--test-reporter-destination` per side, a
  detached base worktree removed afterwards, the eval-pair path checked readable before its gate, and the same
  `check-regress.mjs scope` and `verdict` invocations.
- **A first run was discarded as a setup error.** The runner read `outside_eval_pairs` entries as `expected::actual`
  strings, while `scope` returns `{expected, actual}` objects, so it ran a non-existent pair and recorded gate
  `structural:[object Object]` red on both sides, which the verdict filed under `pre_existing`. That is the masking
  shape this command warns about (an unreadable eval-pair path read as a gate verdict), so the run was not used: the
  runner was fixed to take the object fields and to refuse an unreadable path, and the whole stage was re-run from
  Step 1. The tables above are the second run's.
- One test that skipped at base ran at head (9 → 8 skipped, 6,905 → 6,906 passed); no test failed on either side.
