# REGRESSION — loop-autonomous

- **Base:** `9bafa0e7fd2593b7efc2f8c8acca64adf34dd6fb` (`HEAD`; the working tree was dirty, so the
  command's deterministic rule resolves base to `HEAD`).
- **Machine report:** `.dev/features/loop-autonomous/regression-report.json` — the `check-regress.mjs verdict`
  output, verbatim.

**Re-run after the GATE-2 fix pass** (same base). The first run's verdict was also `no-regressions`; this
render and the machine report describe the re-run.

## Partition (from `check-regress.mjs scope --feature loop-autonomous`, exit 0)

**Inside — 18 paths** (the changed scope):

- `.claude/commands/pharn-loop.md`, `.claude/commands/pharn-ship.md`, `.claude/commands/pharn-spec.md`
- `.dev/floor/command-hygiene.test.mjs`
- `CHANGELOG.md`, `README.md`, `SKILLS_VERSION`
- `pharn/floor/check-loop.mjs`, `pharn/floor/check-loop.test.mjs`
- `pharn/pharn-contracts/loop-record.md`, `pharn/pharn-contracts/verify-report.md`
- `.dev/features/loop-autonomous/` — `PLAN.md`, `GRILL.md`, `REGRESSION.md`, `VERIFY.md`, `REVIEW.md`,
  `regression-report.json`, `verify-report.json`

**Escaped (a changed path outside the plan's `## Files`):** none.

**Escape-exempt:** the seven feature artifacts above — each written by its own stage under that stage's own
writes-scope.

**Outside gates:** 74 test files, `validate`, and the one committed eval pair
(`pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` ↔
`.dev/features/trust-fence/findings.json`, both confirmed readable before running). Style gates were
skipped by the deterministic rule: no shared style config is inside.

## Per-gate exit codes

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `tests` (74 outside test files, via the pinned `xargs node --test` form)                   | 0    | 0    |
| `validate`                                                                                 | 0    | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |

- **regressions[]:** none
- **pre_existing[]:** none

## Verdict (deterministic — `check-regress.mjs verdict`, exit 0)

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.**

This certifies the comparison only: `/pharn-dev-regress` catches exactly what its suite catches, nothing more.
A broken behavior outside the feature that no test, rule or eval covers would be invisible here. The
changed command prose itself (`pharn-loop.md`'s git steps, self-approval and stuck-point mapping) is not
executable by any gate and is not covered by this verdict.
