# REGRESSION — floor-test-glob-names

- base: `bc63759f` (the working tree was dirty, so base = HEAD, per Step 1)
- inside: 46 paths (`git diff --no-renames --name-only HEAD` plus untracked), so each renamed module counts as its old
  path deleted and its new path added; declared: the plan's `## Files` via `plan-files-core.mjs`; `scope` escaped:
  none; escape_exempt: this feature's `PLAN.md`, `GRILL.md`
- outside gates: `tests` (158 outside test files, through the per-test reporter), `validate`,
  `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json`. Style gates skipped: no
  shared style config is inside.

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `tests`                                                                                    | 0    | 0    |
| `validate`                                                                                 | 0    | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |

Per-test records (`pharn-test-results/1`): base 5462 passed, 0 failed, 6 skipped; head 5467 passed, 0 failed, 1
skipped; `new_failures` 0, `still_failing` 0. regressions: none. pre_existing: none.

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.** This catches what the suite
catches, nothing more.

Orchestration notes (advisory): the pinned Step 2 lines ran from one scratchpad shell script (`xargs node --test` with
the absolute reporter path, `rm -f` of each side's record first, the eval-pair path checked readable on both sides).
The run took about 35 minutes under heavy machine load from other sessions (load average up to 94). The skipped-count
difference (6 → 1) is in tests that skip on environment conditions; no test failed on either side.
